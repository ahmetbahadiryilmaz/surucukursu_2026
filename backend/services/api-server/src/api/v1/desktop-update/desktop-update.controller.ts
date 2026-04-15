import {
  Controller,
  Get,
  Param,
  Res,
  Post,
  Body,
  UseGuards,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { DesktopUpdateService } from './desktop-update.service';
import * as fs from 'fs';

/**
 * Desktop Update Controller
 *
 * electron-updater expects these endpoints:
 *   GET /desktop-update/latest.yml         → version metadata
 *   GET /desktop-update/download/:filename → installer file
 *
 * Admin endpoints:
 *   GET  /desktop-update/admin/files       → list update files
 *   POST /desktop-update/admin/generate-yml → generate latest.yml from exe
 */
@ApiTags('Desktop Update')
@Controller('desktop-update')
export class DesktopUpdateController {
  constructor(private readonly service: DesktopUpdateService) {}

  /**
   * GET /api/v1/desktop-update/latest.yml
   * electron-updater calls this to check for updates.
   * Must be public (no auth) — the desktop app may not have a token.
   */
  @Public()
  @Get('latest.yml')
  @ApiOperation({ summary: 'Get latest version metadata for Windows (electron-updater)' })
  @ApiResponse({ status: 200, description: 'latest.yml content' })
  @ApiResponse({ status: 404, description: 'No update available' })
  getLatestYmlWindows(@Res() res: any) {
    return this.getLatestYmlForPlatform('win32', res);
  }

  /**
   * GET /api/v1/desktop-update/latest-mac.yml
   */
  @Public()
  @Get('latest-mac.yml')
  @ApiOperation({ summary: 'Get latest version metadata for macOS' })
  getLatestYmlMac(@Res() res: any) {
    return this.getLatestYmlForPlatform('darwin', res);
  }

  /**
   * GET /api/v1/desktop-update/latest-linux.yml
   */
  @Public()
  @Get('latest-linux.yml')
  @ApiOperation({ summary: 'Get latest version metadata for Linux' })
  getLatestYmlLinux(@Res() res: any) {
    return this.getLatestYmlForPlatform('linux', res);
  }

  /**
   * GET /api/v1/desktop-update/download/:filename
   * electron-updater downloads the installer from here.
   * Must be public.
   */
  @Public()
  @Get('download/:filename')
  @ApiOperation({ summary: 'Download update file (exe, dmg, AppImage, blockmap)' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  downloadFile(@Param('filename') filename: string, @Res() res: any) {
    const file = this.service.getUpdateFile(filename);

    if (!file.exists) {
      return res.code(404).send({ error: 'File not found' });
    }

    const stream = fs.createReadStream(file.filePath);
    return res
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Length', file.size.toString())
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`,
      )
      .send(stream);
  }

  /**
   * GET /api/v1/desktop-update/check-version/:version
   * Desktop app calls this on startup to check if its version is allowed to run.
   * Returns { allowed, latestVersion, minimumVersion, message }
   */
  @Public()
  @Get('check-version/:version')
  @ApiOperation({ summary: 'Check if a desktop app version is allowed to run' })
  @ApiResponse({ status: 200, description: 'Version check result' })
  checkVersion(@Param('version') version: string) {
    return this.service.checkVersion(version);
  }

  // --- Admin endpoints (protected) ---

  /**
   * GET /api/v1/desktop-update/admin/files
   * List all update files on server.
   */
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('admin/files')
  @ApiOperation({ summary: 'List all desktop update files (admin only)' })
  listFiles() {
    return {
      directory: this.service.getUpdateDirPath(),
      files: this.service.listUpdateFiles(),
    };
  }

  /**
   * POST /api/v1/desktop-update/admin/generate-yml
   * Generate latest.yml from an exe file already in the update directory.
   */
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Post('admin/generate-yml')
  @ApiOperation({ summary: 'Generate latest.yml from exe in update directory (admin only)' })
  generateYml(@Body() body: { filename: string; version: string }) {
    return this.service.generateLatestYml(body.filename, body.version);
  }

  // --- Private helpers ---

  private getLatestYmlForPlatform(platform: string, res: any) {
    const result = this.service.getLatestYml(platform);

    if (!result.exists) {
      return res.code(404).send({ error: 'No update available' });
    }

    return res
      .header('Content-Type', 'text/yaml; charset=utf-8')
      .header('Cache-Control', 'no-cache')
      .send(result.content);
  }
}
