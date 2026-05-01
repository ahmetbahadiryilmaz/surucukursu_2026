import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '../common/decorators/public.decorator';

// Templates are stored in backend/storage/templates/.
// Walk upward from this file's location until we find a `storage/templates` folder.
// This works regardless of whether the service is running via ts-node from
// `backend/services/desktop-service/src/...` or from compiled output under
// `backend/dist/desktop-service/services/desktop-service/src/...`.
function resolveTemplatesBase(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'storage', 'templates');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to old hardcoded path so error messages stay informative
  return path.resolve(__dirname, '..', '..', '..', '..', '..', 'storage', 'templates');
}

const TEMPLATES_BASE = resolveTemplatesBase();

@ApiTags('Desktop Templates')
@Controller('templates')
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  private sendTemplate(filePath: string, res: FastifyReply) {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Template not found: ${path.basename(filePath)}`);
    }

    // Security: ensure resolved path is still within the templates base directory
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(TEMPLATES_BASE))) {
      throw new NotFoundException('Template not found');
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    res.type('text/html; charset=utf-8').send(content);
  }

  @Public()
  @Get('direksiyon-takip/:filename')
  @ApiOperation({ summary: 'Serve a direksiyon-takip HTML template' })
  @ApiParam({ name: 'filename', example: '16n.html' })
  @ApiResponse({ status: 200, description: 'HTML template returned' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getDireksiyonTakipTemplate(
    @Param('filename') filename: string,
    @Res() res: FastifyReply,
  ) {
    const filePath = path.join(TEMPLATES_BASE, 'direksiyon-takip', filename);
    this.logger.debug(`Serving direksiyon-takip template: ${filename}`);
    return this.sendTemplate(filePath, res);
  }

  @Public()
  @Get('simulator/sesim/:filename')
  @ApiOperation({ summary: 'Serve a Sesim simulator HTML template' })
  @ApiParam({ name: 'filename', example: 'sesim.html' })
  @ApiResponse({ status: 200, description: 'HTML template returned' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getSesimTemplate(
    @Param('filename') filename: string,
    @Res() res: FastifyReply,
  ) {
    const filePath = path.join(TEMPLATES_BASE, 'simulator', 'sesim', filename);
    this.logger.debug(`Serving sesim template: ${filename}`);
    return this.sendTemplate(filePath, res);
  }

  @Public()
  @Get('simulator/anagrup/:scenario/:filename')
  @ApiOperation({ summary: 'Serve an Ana Grup simulator HTML template for a scenario' })
  @ApiParam({ name: 'scenario', example: 'ALGI VE REFLEKS SİMÜLASYONU' })
  @ApiParam({ name: 'filename', example: 'anagrup.html' })
  @ApiResponse({ status: 200, description: 'HTML template returned' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getAnagrupTemplate(
    @Param('scenario') scenario: string,
    @Param('filename') filename: string,
    @Res() res: FastifyReply,
  ) {
    const filePath = path.join(TEMPLATES_BASE, 'simulator', 'anagrup', scenario, filename);
    this.logger.debug(`Serving anagrup template: ${scenario}/${filename}`);
    return this.sendTemplate(filePath, res);
  }

  @Public()
  @Get('ek4/:filename')
  @ApiOperation({ summary: 'Serve an Ek-4 form HTML template' })
  @ApiParam({ name: 'filename', example: 'ek4.html' })
  @ApiResponse({ status: 200, description: 'HTML template returned' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getEk4Template(
    @Param('filename') filename: string,
    @Res() res: FastifyReply,
  ) {
    const filePath = path.join(TEMPLATES_BASE, 'ek4', filename);
    this.logger.debug(`Serving ek4 template: ${filename}`);
    return this.sendTemplate(filePath, res);
  }
}
