"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceType = exports.ServiceStatus = void 0;
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["RUNNING"] = "running";
    ServiceStatus["DOWN"] = "down";
    ServiceStatus["UNKNOWN"] = "unknown";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["BACKEND"] = "backend";
    ServiceType["DATABASE"] = "database";
    ServiceType["RABBITMQ"] = "rabbitmq";
    ServiceType["REDIS"] = "redis";
    ServiceType["FRONTEND"] = "frontend";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
