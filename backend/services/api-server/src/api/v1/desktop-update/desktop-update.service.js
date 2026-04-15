"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopUpdateService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
let DesktopUpdateService = class DesktopUpdateService {
    constructor() {
        this.updateDir = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'storage', 'PUBLIC', 'desktop-updates');
        if (!fs.existsSync(this.updateDir)) {
            fs.mkdirSync(this.updateDir, { recursive: true });
            console.log(`[DesktopUpdate] Created update directory: ${this.updateDir}`);
        }
        console.log(`[DesktopUpdate] Update files directory: ${this.updateDir}`);
    }
    getLatestYml(platform) {
        const ymlMap = {
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
    getUpdateFile(filename) {
        const sanitized = path.basename(filename);
        const filePath = path.join(this.updateDir, sanitized);
        if (!fs.existsSync(filePath)) {
            return { filePath: '', exists: false, size: 0 };
        }
        const stat = fs.statSync(filePath);
        return { filePath, exists: true, size: stat.size };
    }
    listUpdateFiles() {
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
    generateLatestYml(exeFilename, version) {
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
    getUpdateDirPath() {
        return this.updateDir;
    }
    checkVersion(clientVersion) {
        const configPath = path.join(this.updateDir, 'minimum_version.json');
        const latestVersion = this.getLatestVersionString();
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
            const minimumVersion = config.minimumVersion || '0.0.0';
            const message = config.message || 'Bu sürüm artık desteklenmiyor. Lütfen güncelleyin.';
            const allowed = this.compareVersions(clientVersion, minimumVersion) >= 0;
            return { allowed, latestVersion, minimumVersion, message };
        }
        catch (_a) {
            return {
                allowed: true,
                latestVersion,
                minimumVersion: '0.0.0',
                message: '',
            };
        }
    }
    getLatestVersionString() {
        const yml = this.getLatestYml('win32');
        if (!yml.exists)
            return '0.0.0';
        const match = yml.content.match(/^version:\s*(.+)$/m);
        return match ? match[1].trim() : '0.0.0';
    }
    compareVersions(a, b) {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            const na = pa[i] || 0;
            const nb = pb[i] || 0;
            if (na > nb)
                return 1;
            if (na < nb)
                return -1;
        }
        return 0;
    }
};
exports.DesktopUpdateService = DesktopUpdateService;
exports.DesktopUpdateService = DesktopUpdateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DesktopUpdateService);
//# sourceMappingURL=desktop-update.service.js.map