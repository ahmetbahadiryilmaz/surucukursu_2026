"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshInterval = exports.DashboardCardType = exports.ActivityType = void 0;
var ActivityType;
(function (ActivityType) {
    ActivityType["LOGIN"] = "login";
    ActivityType["STUDENT"] = "student";
    ActivityType["DOWNLOAD"] = "download";
    ActivityType["EXAM"] = "exam";
    ActivityType["COURSE"] = "course";
    ActivityType["SYSTEM"] = "system";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
var DashboardCardType;
(function (DashboardCardType) {
    DashboardCardType["STATS"] = "stats";
    DashboardCardType["CHART"] = "chart";
    DashboardCardType["LIST"] = "list";
    DashboardCardType["SYSTEM"] = "system";
})(DashboardCardType || (exports.DashboardCardType = DashboardCardType = {}));
var RefreshInterval;
(function (RefreshInterval) {
    RefreshInterval[RefreshInterval["FAST"] = 5000] = "FAST";
    RefreshInterval[RefreshInterval["NORMAL"] = 30000] = "NORMAL";
    RefreshInterval[RefreshInterval["SLOW"] = 60000] = "SLOW";
})(RefreshInterval || (exports.RefreshInterval = RefreshInterval = {}));
//# sourceMappingURL=dashboard.enums.js.map