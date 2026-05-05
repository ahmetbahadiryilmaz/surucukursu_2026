import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Public } from '../common/decorators/public.decorator';
import { encryptPayload, verifySignedRequest } from '../common/crypto/desktop-crypto';

// Scripts live in backend/storage/desktop-code/.
// Walk upward from this file until we find that folder.
function resolveCodeBase(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'storage', 'desktop-code');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..', '..', '..', '..', '..', 'storage', 'desktop-code');
}

const CODE_BASE = resolveCodeBase();
const CODE_BASE_RESOLVED = path.resolve(CODE_BASE);

// Whitelisted layout:
//   scripts/<name>.js       — webContents-injected scripts (legacy)
//   main/<name>.js          — main-process bundle (esbuild output)
//   renderer/<name>.{html,js,css} — renderer files served via mtsk-ui:// protocol
const ALLOWED_PATH_PATTERN = /^((scripts|main)\/[A-Za-z0-9_\-./]+\.js|renderer\/[A-Za-z0-9_\-./]+\.(html|js|css))$/;

interface SignedBody {
  timestamp: number;
  nonce: string;
  signature: string;
}

interface SignedPathBody extends SignedBody {
  path: string;
}

const MANIFEST_PATH_TOKEN = '__manifest__';

@ApiTags('Desktop Code')
@Controller('desktop-code')
export class DesktopCodeController {
  private readonly logger = new Logger(DesktopCodeController.name);

  @Public()
  @Get('version')
  @ApiOperation({
    summary: 'Plaintext remote-code version + optional whatsNew. Cheap to poll — no auth, no encryption.',
  })
  @ApiResponse({ status: 200, description: 'JSON {version: string, whatsNew?: string}' })
  @ApiResponse({ status: 404, description: 'version.json missing on server' })
  getVersion(@Res() res: FastifyReply) {
    const versionFilePath = path.join(CODE_BASE_RESOLVED, 'version.json');
    if (!fs.existsSync(versionFilePath)) {
      throw new HttpException('version.json not deployed', HttpStatus.NOT_FOUND);
    }
    let version: string | undefined;
    let whatsNew: string | undefined;
    try {
      const data = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
      if (typeof data.version === 'string') version = data.version;
      if (typeof data.whatsNew === 'string' && data.whatsNew.trim()) {
        whatsNew = data.whatsNew;
      }
    } catch {
      throw new HttpException('version.json malformed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!version) {
      throw new HttpException('version field missing', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    res
      .header('Content-Type', 'application/json')
      .header('Cache-Control', 'no-store')
      .send(whatsNew ? { version, whatsNew } : { version });
  }

  @Public()
  @Post('manifest')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Encrypted manifest of all deployable scripts (sha256 per file).',
  })
  @ApiResponse({ status: 200, description: 'Binary encrypted JSON' })
  async getManifest(@Body() body: SignedBody, @Res() res: FastifyReply) {
    const { hmacSecret, aesKey } = this.requireKeys();

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid body');
    }

    const verify = verifySignedRequest({
      path: MANIFEST_PATH_TOKEN,
      timestamp: Number(body.timestamp),
      nonce: String(body.nonce || ''),
      signature: String(body.signature || ''),
      hmacSecret,
    });
    if (!verify.ok) {
      this.logger.warn(`Rejected manifest request: ${(verify as any).reason}`);
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const files: Record<string, string> = {};
    if (fs.existsSync(CODE_BASE_RESOLVED)) {
      this.collectFiles(CODE_BASE_RESOLVED, '', files);
    }

    // Read optional version.json from CODE_BASE root (not inside scripts/)
    let codeVersion: string | undefined;
    const versionFilePath = path.join(CODE_BASE_RESOLVED, 'version.json');
    if (fs.existsSync(versionFilePath)) {
      try {
        const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
        if (typeof versionData.version === 'string') {
          codeVersion = versionData.version;
        }
      } catch {
        // ignore malformed version.json
      }
    }

    const json = Buffer.from(JSON.stringify({ files, version: codeVersion }), 'utf-8');
    const encrypted = encryptPayload(json, aesKey);

    this.logger.debug(
      `Served encrypted manifest (${Object.keys(files).length} files, ${encrypted.length} bytes)`,
    );
    res
      .header('Content-Type', 'application/octet-stream')
      .header('Cache-Control', 'no-store')
      .send(encrypted);
  }

  @Public()
  @Post('file')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Encrypted single file content. Body must be HMAC-signed.',
  })
  @ApiResponse({ status: 200, description: 'Binary encrypted file bytes' })
  @ApiResponse({ status: 401, description: 'Bad signature / replay / expired' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Body() body: SignedPathBody, @Res() res: FastifyReply) {
    const { hmacSecret, aesKey } = this.requireKeys();

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid body');
    }

    const requestedPath = String(body.path || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (requestedPath.includes('..') || !ALLOWED_PATH_PATTERN.test(requestedPath)) {
      throw new BadRequestException('Invalid file path');
    }

    const verify = verifySignedRequest({
      path: requestedPath,
      timestamp: Number(body.timestamp),
      nonce: String(body.nonce || ''),
      signature: String(body.signature || ''),
      hmacSecret,
    });
    if (!verify.ok) {
      this.logger.warn(
        `Rejected desktop-code request (${requestedPath}): ${(verify as any).reason}`,
      );
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const filePath = path.join(CODE_BASE_RESOLVED, requestedPath);
    const resolved = path.resolve(filePath);
    if (
      !resolved.startsWith(CODE_BASE_RESOLVED + path.sep) &&
      resolved !== CODE_BASE_RESOLVED
    ) {
      throw new BadRequestException('Invalid file path');
    }
    if (!fs.existsSync(resolved)) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    let plaintext: Buffer;
    try {
      plaintext = fs.readFileSync(resolved);
    } catch (err: any) {
      this.logger.error(`Failed to read ${requestedPath}: ${err.message}`);
      throw new HttpException('Read error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const encrypted = encryptPayload(plaintext, aesKey);
    this.logger.debug(
      `Served encrypted file: ${requestedPath} (${plaintext.length} -> ${encrypted.length} bytes)`,
    );
    res
      .header('Content-Type', 'application/octet-stream')
      .header('Cache-Control', 'no-store')
      .send(encrypted);
  }

  // --- helpers ---

  private requireKeys(): { hmacSecret: string; aesKey: string } {
    const hmacSecret = process.env.DESKTOP_HMAC_SECRET;
    const aesKey = process.env.DESKTOP_KEY;
    if (!hmacSecret || !aesKey) {
      this.logger.error('DESKTOP_KEY or DESKTOP_HMAC_SECRET is not configured');
      throw new HttpException(
        'Encrypted desktop-code not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { hmacSecret, aesKey };
  }

  private collectFiles(absDir: string, relDir: string, out: Record<string, string>) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const abs = path.join(absDir, ent.name);
      const rel = relDir ? `${relDir}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        this.collectFiles(abs, rel, out);
      } else if (ent.isFile()) {
        // Use forward-slash relative path to match the allow pattern.
        const norm = rel.replace(/\\/g, '/');
        if (!ALLOWED_PATH_PATTERN.test(norm)) continue;
        try {
          const buf = fs.readFileSync(abs);
          out[norm] = crypto.createHash('sha256').update(buf).digest('hex');
        } catch {
          // skip unreadable
        }
      }
    }
  }
}
