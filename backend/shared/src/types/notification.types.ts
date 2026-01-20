/**
 * Notification Preferences - Bitwise Flags
 * Use bitwise operators to check/set multiple preferences in a single integer column
 */
export enum NotificationPreferences {
  NONE = 0,
  STUDENT_NOTIFICATIONS = 1 << 0,  // 1
  LESSON_REMINDERS = 1 << 1,       // 2
  EXAM_ALERTS = 1 << 2,            // 4
  MARKETING_EMAILS = 1 << 3,       // 8
  SYSTEM_UPDATES = 1 << 4,         // 16
  AUTO_SCHEDULING = 1 << 5,        // 32
  
  // Default preferences (all enabled except marketing)
  DEFAULT = STUDENT_NOTIFICATIONS | LESSON_REMINDERS | EXAM_ALERTS | SYSTEM_UPDATES
}

/**
 * Helper functions for notification preferences
 */
export class NotificationPreferencesHelper {
  /**
   * Check if a preference is enabled
   */
  static hasPreference(preferences: number, flag: NotificationPreferences): boolean {
    return (preferences & flag) === flag;
  }

  /**
   * Enable a preference
   */
  static enablePreference(preferences: number, flag: NotificationPreferences): number {
    return preferences | flag;
  }

  /**
   * Disable a preference
   */
  static disablePreference(preferences: number, flag: NotificationPreferences): number {
    return preferences & ~flag;
  }

  /**
   * Toggle a preference
   */
  static togglePreference(preferences: number, flag: NotificationPreferences): number {
    return preferences ^ flag;
  }

  /**
   * Set multiple preferences at once
   */
  static setPreferences(...flags: NotificationPreferences[]): number {
    return flags.reduce((acc, flag) => acc | flag, 0);
  }
}
