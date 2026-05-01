export enum UserTypes {
    SUPER_ADMIN = -1 ,//'SUPER_ADMIN',
    ADMIN =  -2,//'ADMIN',
    DRIVING_SCHOOL_OWNER = 2,// 'DRIVING_SCHOOL_OWNER',
    DRIVING_SCHOOL_MANAGER = 3,//'DRIVING_SCHOOL_MANAGER'
  }

// Reverse enum mapping for user type strings
export const UserTypeStrings: Record<UserTypes, string> = {
  [UserTypes.SUPER_ADMIN]: 'Super Admin',
  [UserTypes.ADMIN]: 'Admin',
  [UserTypes.DRIVING_SCHOOL_OWNER]: 'Driving School Owner',
  [UserTypes.DRIVING_SCHOOL_MANAGER]: 'Driving School Manager',
};

// Helper function to get user type as string
export const getUserTypeString = (userType: number): string => {
  return UserTypeStrings[userType as UserTypes] || 'Unknown';
};
