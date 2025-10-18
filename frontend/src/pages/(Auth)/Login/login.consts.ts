export const LOGIN_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 6,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  STORAGE_KEYS: {
    USER: 'user',
    TOKEN: 'token',
    ACTIVE_DRIVING_SCHOOL: 'activeDrivingSchool'
  },
  ROUTES: {
    ADMIN: '/admin',
    DRIVING_SCHOOL: '/driving-school'
  }
} as const;