"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemLogProcessTypes = exports.UserTypes = void 0;
var UserTypes;
(function (UserTypes) {
    UserTypes[UserTypes["SUPER_ADMIN"] = -1] = "SUPER_ADMIN";
    UserTypes[UserTypes["ADMIN"] = -2] = "ADMIN";
    UserTypes[UserTypes["DRIVING_SCHOOL_OWNER"] = 2] = "DRIVING_SCHOOL_OWNER";
    UserTypes[UserTypes["DRIVING_SCHOOL_MANAGER"] = 3] = "DRIVING_SCHOOL_MANAGER";
})(UserTypes || (exports.UserTypes = UserTypes = {}));
var SystemLogProcessTypes;
(function (SystemLogProcessTypes) {
    SystemLogProcessTypes[SystemLogProcessTypes["LOGIN"] = 0] = "LOGIN";
    SystemLogProcessTypes[SystemLogProcessTypes["LOGOUT"] = 1] = "LOGOUT";
    SystemLogProcessTypes[SystemLogProcessTypes["FORGOT_PASSWORD"] = 2] = "FORGOT_PASSWORD";
    SystemLogProcessTypes[SystemLogProcessTypes["RESET_PASSWORD"] = 3] = "RESET_PASSWORD";
    SystemLogProcessTypes[SystemLogProcessTypes["CHANGE_PASSWORD"] = 4] = "CHANGE_PASSWORD";
    SystemLogProcessTypes[SystemLogProcessTypes["UPDATE_PROFILE"] = 5] = "UPDATE_PROFILE";
    SystemLogProcessTypes[SystemLogProcessTypes["UPDATE_EMAIL"] = 6] = "UPDATE_EMAIL";
    SystemLogProcessTypes[SystemLogProcessTypes["UPDATE_PHONE"] = 7] = "UPDATE_PHONE";
})(SystemLogProcessTypes || (exports.SystemLogProcessTypes = SystemLogProcessTypes = {}));
//# sourceMappingURL=enum.js.map