"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopUpdateModule = void 0;
const common_1 = require("@nestjs/common");
const desktop_update_controller_1 = require("./desktop-update.controller");
const desktop_update_service_1 = require("./desktop-update.service");
let DesktopUpdateModule = class DesktopUpdateModule {
};
exports.DesktopUpdateModule = DesktopUpdateModule;
exports.DesktopUpdateModule = DesktopUpdateModule = __decorate([
    (0, common_1.Module)({
        controllers: [desktop_update_controller_1.DesktopUpdateController],
        providers: [desktop_update_service_1.DesktopUpdateService],
    })
], DesktopUpdateModule);
//# sourceMappingURL=desktop-update.module.js.map