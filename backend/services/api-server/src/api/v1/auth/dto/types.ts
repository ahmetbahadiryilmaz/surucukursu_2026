import { UserTypes } from "./enum";


export interface BaseUser {
  id: number;  // Changed from string to number
  email: string;
  name: string;
  password: string;
  phone: string;
  created_at: Date;
  updated_at: Date;
  role?: UserTypes;
  drivingSchools?: any[]; // Added by AuthGuard
}
// Admin specific interface
export interface SuperAdminUser extends BaseUser {
  role: UserTypes.SUPER_ADMIN
}
// Admin specific interface
export interface AdminUser extends BaseUser {
  role: UserTypes.ADMIN
}

// Driving School Owner specific interface
export interface DrivingSchoolOwnerUser extends BaseUser {
  driving_school_id: string;
  role: UserTypes.DRIVING_SCHOOL_OWNER
}

// Driving School Manager specific interface
export interface DrivingSchoolManagerUser extends BaseUser {
  driving_school_id: string;
  role: UserTypes.DRIVING_SCHOOL_MANAGER
}

export interface RequestWithUser extends Request {
  user: BaseUser; // Replace 'User' with your actual User interface/type
}

export type UserModel = SuperAdminUser | AdminUser | DrivingSchoolOwnerUser | DrivingSchoolManagerUser | BaseUser;
