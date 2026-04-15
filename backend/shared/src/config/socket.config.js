"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketConfig = void 0;
const env_config_1 = require("./env.config");
exports.socketConfig = {
    // Socket.IO configuration
    port: env_config_1.env.app.port || 3001, // Use the same port as the HTTP server
    cors: {
        origin: '*', // Allow connections from anywhere
        methods: ['GET', 'POST'],
        credentials: true,
    },
    // Additional Socket.IO options
    options: {
        // Add any additional Socket.IO server options here
        pingTimeout: 60000,
        pingInterval: 25000,
    },
};
