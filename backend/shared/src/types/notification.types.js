"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferencesHelper = exports.NotificationPreferences = void 0;
var NotificationPreferences;
(function (NotificationPreferences) {
    NotificationPreferences[NotificationPreferences["NONE"] = 0] = "NONE";
    NotificationPreferences[NotificationPreferences["STUDENT_NOTIFICATIONS"] = 1] = "STUDENT_NOTIFICATIONS";
    NotificationPreferences[NotificationPreferences["LESSON_REMINDERS"] = 2] = "LESSON_REMINDERS";
    NotificationPreferences[NotificationPreferences["EXAM_ALERTS"] = 4] = "EXAM_ALERTS";
    NotificationPreferences[NotificationPreferences["MARKETING_EMAILS"] = 8] = "MARKETING_EMAILS";
    NotificationPreferences[NotificationPreferences["SYSTEM_UPDATES"] = 16] = "SYSTEM_UPDATES";
    NotificationPreferences[NotificationPreferences["AUTO_SCHEDULING"] = 32] = "AUTO_SCHEDULING";
    NotificationPreferences[NotificationPreferences["DEFAULT"] = 23] = "DEFAULT";
})(NotificationPreferences || (exports.NotificationPreferences = NotificationPreferences = {}));
class NotificationPreferencesHelper {
    static hasPreference(preferences, flag) {
        return (preferences & flag) === flag;
    }
    static enablePreference(preferences, flag) {
        return preferences | flag;
    }
    static disablePreference(preferences, flag) {
        return preferences & ~flag;
    }
    static togglePreference(preferences, flag) {
        return preferences ^ flag;
    }
    static setPreferences(...flags) {
        return flags.reduce((acc, flag) => acc | flag, 0);
    }
}
exports.NotificationPreferencesHelper = NotificationPreferencesHelper;
//# sourceMappingURL=notification.types.js.map