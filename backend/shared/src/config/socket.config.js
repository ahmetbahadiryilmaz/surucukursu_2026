"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketConfig = void 0;
const env_config_1 = require("./env.config");
exports.socketConfig = {
    port: env_config_1.env.app.port || 3001,
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    options: {
        pingTimeout: 60000,
        pingInterval: 25000,
    },
};
//# sourceMappingURL=socket.config.js.map