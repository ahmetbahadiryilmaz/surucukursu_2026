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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopUpdateController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
const admin_guard_1 = require("../../../common/guards/admin.guard");
const desktop_update_service_1 = require("./desktop-update.service");
const fs = require("fs");
let DesktopUpdateController = class DesktopUpdateController {
    constructor(service) {
        this.service = service;
    }
    getLatestYmlWindows(res) {
        return this.getLatestYmlForPlatform('win32', res);
    }
    getLatestYmlMac(res) {
        return this.getLatestYmlForPlatform('darwin', res);
    }
    getLatestYmlLinux(res) {
        return this.getLatestYmlForPlatform('linux', res);
    }
    downloadFile(filename, res) {
        const file = this.service.getUpdateFile(filename);
        if (!file.exists) {
            return res.code(404).send({ error: 'File not found' });
        }
        const stream = fs.createReadStream(file.filePath);
        return res
            .header('Content-Type', 'application/octet-stream')
            .header('Content-Length', file.size.toString())
            .header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
            .send(stream);
    }
    checkVersion(version) {
        return this.service.checkVersion(version);
    }
    listFiles() {
        return {
            directory: this.service.getUpdateDirPath(),
            files: this.service.listUpdateFiles(),
        };
    }
    generateYml(body) {
        return this.service.generateLatestYml(body.filename, body.version);
    }
    getLatestYmlForPlatform(platform, res) {
        const result = this.service.getLatestYml(platform);
        if (!result.exists) {
            return res.code(404).send({ error: 'No update available' });
        }
        return res
            .header('Content-Type', 'text/yaml; charset=utf-8')
            .header('Cache-Control', 'no-cache')
            .send(result.content);
    }
};
exports.DesktopUpdateController = DesktopUpdateController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('latest.yml'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest version metadata for Windows (electron-updater)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'latest.yml content' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'No update available' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DesktopUpdateController.prototype, "getLatestYmlWindows", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('latest-mac.yml'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest version metadata for macOS' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DesktopUpdateController.prototype, "getLatestYmlMac", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('latest-linux.yml'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest version metadata for Linux' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DesktopUpdateController.prototype, "getLatestYmlLinux", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('download/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Download update file (exe, dmg, AppImage, blockmap)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'File stream' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'File not found' }),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DesktopUpdateController.prototype, "downloadFile", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('check-version/:version'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if a desktop app version is allowed to run' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Version check result' }),
    __param(0, (0, common_1.Param)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DesktopUpdateController.prototype, "checkVersion", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('admin/files'),
    (0, swagger_1.ApiOperation)({ summary: 'List all desktop update files (admin only)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DesktopUpdateController.prototype, "listFiles", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('admin/generate-yml'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate latest.yml from exe in update directory (admin only)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DesktopUpdateController.prototype, "generateYml", null);
exports.DesktopUpdateController = DesktopUpdateController = __decorate([
    (0, swagger_1.ApiTags)('Desktop Update'),
    (0, common_1.Controller)('desktop-update'),
    __metadata("design:paramtypes", [desktop_update_service_1.DesktopUpdateService])
], DesktopUpdateController);
//# sourceMappingURL=desktop-update.controller.js.map