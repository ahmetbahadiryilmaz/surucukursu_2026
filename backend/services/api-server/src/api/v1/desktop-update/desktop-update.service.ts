import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * electron-updater expects a specific file structure:
 *
 * For Windows (NSIS):
 *   latest.yml         ← version metadata YAML
 *   MyApp-Setup-x.x.x.exe  ← installer
 *
 * latest.yml format:
 *   version: 1.0.1
 *   files:
 *     - url: MyApp-Setup-1.0.1.exe
 *       sha512: <base64 sha512>
 *       size: 12345678
 *   path: MyApp-Setup-1.0.1.exe
 *   sha512: <base64 sha512>
 *   releaseDate: '2026-04-15T00:00:00.000Z'
 */

@Injectable()
export class DesktopUpdateService {
  private readonly updateDir: string;

  constructor() {
    // Storage path for update files
    this.updateDir = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '..',
      '..',
      'storage',
      'PUBLIC',
      'desktop-updates',
    );

    // Ensure directory exists
    if (!fs.existsSync(this.updateDir)) {
      fs.mkdirSync(this.updateDir, { recursive: true });
      console.log(`[DesktopUpdate] Created update directory: ${this.updateDir}`);
    }

    console.log(`[DesktopUpdate] Update files directory: ${this.updateDir}`);
  }

  /**
   * Get the platform-specific update metadata file (latest.yml / latest-mac.yml / latest-linux.yml)
   */
  getLatestYml(platform: string): { content: string; exists: boolean } {
    const ymlMap: Record<string, string> = {
      win32: 'latest.yml',
      darwin: 'latest-mac.yml',
      linux: 'latest-linux.yml',
    };

    const filename = ymlMap[platform] || 'latest.yml';
    const filePath = path.join(this.updateDir, filename);

    if (!fs.existsSync(filePath)) {
      return { content: '', exists: false };
    }

    return {
      content: fs.readFileSync(filePath, 'utf-8'),
      exists: true,
    };
  }

  /**
   * Get an update file (installer exe, blockmap, etc.)
   */
  getUpdateFile(filename: string): { filePath: string; exists: boolean; size: number } {
    // SECURITY: prevent path traversal
    const sanitized = path.basename(filename);
    const filePath = path.join(this.updateDir, sanitized);

    if (!fs.existsSync(filePath)) {
      return { filePath: '', exists: false, size: 0 };
    }

    const stat = fs.statSync(filePath);
    return { filePath, exists: true, size: stat.size };
  }

  /**
   * List all files in the update directory (for admin purposes)
   */
  listUpdateFiles(): Array<{ name: string; size: number; modified: string }> {
    if (!fs.existsSync(this.updateDir)) {
      return [];
    }

    return fs.readdirSync(this.updateDir).map((name) => {
      const stat = fs.statSync(path.join(this.updateDir, name));
      return {
        name,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });
  }

  /**
   * Generate latest.yml from an exe file already placed in the update directory.
   * Useful when you manually copy an exe and want to auto-generate the yml.
   */
  generateLatestYml(
    exeFilename: string,
    version: string,
  ): { success: boolean; message: string } {
    const exePath = path.join(this.updateDir, path.basename(exeFilename));

    if (!fs.existsSync(exePath)) {
      return { success: false, message: `File not found: ${exeFilename}` };
    }

    const stat = fs.statSync(exePath);
    const fileBuffer = fs.readFileSync(exePath);
    const sha512 = crypto
      .createHash('sha512')
      .update(fileBuffer)
      .digest('base64');

    const yml = [
      `version: ${version}`,
      `files:`,
      `  - url: ${path.basename(exeFilename)}`,
      `    sha512: ${sha512}`,
      `    size: ${stat.size}`,
      `path: ${path.basename(exeFilename)}`,
      `sha512: ${sha512}`,
      `releaseDate: '${new Date().toISOString()}'`,
    ].join('\n');

    fs.writeFileSync(path.join(this.updateDir, 'latest.yml'), yml, 'utf-8');

    return { success: true, message: `Generated latest.yml for v${version}` };
  }

  getUpdateDirPath(): string {
    return this.updateDir;
  }

  /**
   * Check if a client version is allowed to run.
   * Reads minimum_version.json from the update directory.
   * If no config exists, all versions are allowed.
   *
   * minimum_version.json format:
   * {
   *   "minimumVersion": "1.0.1",
   *   "message": "Bu sürüm artık desteklenmiyor. Lütfen güncelleyin."
   * }
   */
  checkVersion(clientVersion: string): {
    allowed: boolean;
    latestVersion: string;
    minimumVersion: string;
    message: string;
  } {
    const configPath = path.join(this.updateDir, 'minimum_version.json');
    const latestVersion = this.getLatestVersionString();

    // No config → all versions allowed
    if (!fs.existsSync(configPath)) {
      return {
        allowed: true,
        latestVersion,
        minimumVersion: '0.0.0',
        message: '',
      };
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const minimumVersion: string = config.minimumVersion || '0.0.0';
      const message: string =
        config.message || 'Bu sürüm artık desteklenmiyor. Lütfen güncelleyin.';

      const allowed = this.compareVersions(clientVersion, minimumVersion) >= 0;

      return { allowed, latestVersion, minimumVersion, message };
    } catch {
      // Corrupted config → allow
      return {
        allowed: true,
        latestVersion,
        minimumVersion: '0.0.0',
        message: '',
      };
    }
  }

  /**
   * Extract version string from latest.yml
   */
  private getLatestVersionString(): string {
    const yml = this.getLatestYml('win32');
    if (!yml.exists) return '0.0.0';

    const match = yml.content.match(/^version:\s*(.+)$/m);
    return match ? match[1].trim() : '0.0.0';
  }

  /**
   * Compare semver strings. Returns:
   *  -1 if a < b
   *   0 if a == b
   *   1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }
}
