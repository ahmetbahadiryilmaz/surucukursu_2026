"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const shared_1 = require("../../../../../shared/src");
let SlackService = class SlackService {
    async sendNotification(title, description, channel = 1) {
        try {
            const { notificationUrl, secretKey } = shared_1.env.slack;
            await axios_1.default.post(notificationUrl, {
                title,
                description,
                channel
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Secret-Key': secretKey
                }
            });
        }
        catch (error) {
            console.error('Failed to send Slack notification:', error);
        }
    }
};
exports.SlackService = SlackService;
exports.SlackService = SlackService = __decorate([
    (0, common_1.Injectable)()
], SlackService);
//# sourceMappingURL=slack.service.js.map