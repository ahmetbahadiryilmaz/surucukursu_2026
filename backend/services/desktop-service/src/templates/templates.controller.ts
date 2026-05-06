import {
  Controller,
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
import { Public } from '../common/decorators/public.decorator';
import { encryptPayload, verifySignedRequest } from '../common/crypto/desktop-crypto';

// Templates are stored in backend/storage/templates/.
// Walk upward from this file's location until we find a `storage/templates` folder.
function resolveTemplatesBase(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'storage', 'templates');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..', '..', '..', '..', '..', 'storage', 'templates');
}

const TEMPLATES_BASE = resolveTemplatesBase();
const TEMPLATES_BASE_RESOLVED = path.resolve(TEMPLATES_BASE);

// Whitelist of allowed template path roots. Everything else is rejected.
// Keeps parity with the previous GET endpoints:
//   direksiyon-takip/:filename
//   simulator/sesim/:filename
//   simulator/anagrup/:scenario/:filename
//   ek4/:filename
const ALLOWED_PATH_PATTERN =
  /^(direksiyon-takip|simulator\/sesim|simulator\/anagrup\/[^\/]+|ek4|k-belgesi)\/[^\/]+\.html$/;

interface EncryptedTemplateRequest {
  path: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

@ApiTags('Desktop Templates')
@Controller('templates')
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  @Public()
  @Post('encrypted')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Return the requested template file encrypted with AES-256-GCM. Body must be HMAC-signed.',
  })
  @ApiResponse({ status: 200, description: 'Binary encrypted payload' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Bad signature / replay / expired' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getEncrypted(
    @Body() body: EncryptedTemplateRequest,
    @Res() res: FastifyReply,
  ) {
    const hmacSecret = process.env.DESKTOP_HMAC_SECRET;
    const aesKey = process.env.DESKTOP_KEY;

    if (!hmacSecret || !aesKey) {
      this.logger.error(
        'DESKTOP_KEY or DESKTOP_HMAC_SECRET is not configured',
      );
      throw new HttpException(
        'Encrypted templates not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid body');
    }

    // Normalize path: forward slashes only, no leading slash, no traversal.
    const requestedPath = String(body.path || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (requestedPath.includes('..') || !ALLOWED_PATH_PATTERN.test(requestedPath)) {
      throw new BadRequestException('Invalid template path');
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
        `Rejected encrypted template request: ${(verify as { reason: string }).reason}`,
      );
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const filePath = path.join(TEMPLATES_BASE, requestedPath);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(TEMPLATES_BASE_RESOLVED + path.sep) && resolved !== TEMPLATES_BASE_RESOLVED) {
      throw new BadRequestException('Invalid template path');
    }

    if (!fs.existsSync(resolved)) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    let plaintext: Buffer;
    try {
      plaintext = fs.readFileSync(resolved);
    } catch (err: any) {
      this.logger.error(`Failed to read template ${requestedPath}: ${err.message}`);
      throw new HttpException('Read error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let encrypted: Buffer;
    try {
      encrypted = encryptPayload(plaintext, aesKey);
    } catch (err: any) {
      this.logger.error(`Encryption failed: ${err.message}`);
      throw new HttpException('Encryption failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.debug(
      `Served encrypted template: ${requestedPath} (${plaintext.length} -> ${encrypted.length} bytes)`,
    );
    res
      .header('Content-Type', 'application/octet-stream')
      .header('Cache-Control', 'no-store')
      .send(encrypted);
  }
}
