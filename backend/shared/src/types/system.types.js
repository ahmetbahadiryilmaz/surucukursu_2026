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
    ServiceType["API_GATEWAY"] = "apiGateway";
    ServiceType["API_SERVER"] = "apiServer";
    ServiceType["FILE_SERVER"] = "fileServer";
    ServiceType["MEBBIS_SERVICE"] = "mebbisService";
    ServiceType["DESKTOP_SERVICE"] = "desktopService";
    ServiceType["FRONTEND"] = "frontend";
    ServiceType["DATABASE"] = "database";
    ServiceType["RABBITMQ"] = "rabbitmq";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
//# sourceMappingURL=system.types.js.map