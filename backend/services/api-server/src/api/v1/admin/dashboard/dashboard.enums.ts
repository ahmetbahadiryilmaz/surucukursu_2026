// Dashboard activity types
export enum ActivityType {
  LOGIN = 'login',
  STUDENT = 'student',
  DOWNLOAD = 'download',
  EXAM = 'exam',
  COURSE = 'course',
  SYSTEM = 'system'
}

// Dashboard card types for UI
export enum DashboardCardType {
  STATS = 'stats',
  CHART = 'chart',
  LIST = 'list',
  SYSTEM = 'system'
}

// Dashboard refresh intervals (in milliseconds)
export enum RefreshInterval {
  FAST = 5000,    // 5 seconds
  NORMAL = 30000, // 30 seconds
  SLOW = 60000    // 1 minute
}