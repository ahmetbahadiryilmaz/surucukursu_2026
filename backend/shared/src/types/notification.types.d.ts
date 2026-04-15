export declare enum NotificationPreferences {
    NONE = 0,
    STUDENT_NOTIFICATIONS = 1,
    LESSON_REMINDERS = 2,
    EXAM_ALERTS = 4,
    MARKETING_EMAILS = 8,
    SYSTEM_UPDATES = 16,
    AUTO_SCHEDULING = 32,
    DEFAULT = 23
}
export declare class NotificationPreferencesHelper {
    static hasPreference(preferences: number, flag: NotificationPreferences): boolean;
    static enablePreference(preferences: number, flag: NotificationPreferences): number;
    static disablePreference(preferences: number, flag: NotificationPreferences): number;
    static togglePreference(preferences: number, flag: NotificationPreferences): number;
    static setPreferences(...flags: NotificationPreferences[]): number;
}
