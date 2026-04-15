import { UserTypes } from "./enum";
export interface BaseUser {
    id: number;
    email: string;
    name: string;
    password: string;
    phone: string;
    created_at: Date;
    updated_at: Date;
    role?: UserTypes;
    drivingSchools?: any[];
}
export interface SuperAdminUser extends BaseUser {
    role: UserTypes.SUPER_ADMIN;
}
export interface AdminUser extends BaseUser {
    role: UserTypes.ADMIN;
}
export interface DrivingSchoolOwnerUser extends BaseUser {
    driving_school_id: string;
    role: UserTypes.DRIVING_SCHOOL_OWNER;
}
export interface DrivingSchoolManagerUser extends BaseUser {
    driving_school_id: string;
    role: UserTypes.DRIVING_SCHOOL_MANAGER;
}
export interface RequestWithUser extends Request {
    user: BaseUser;
}
export type UserModel = SuperAdminUser | AdminUser | DrivingSchoolOwnerUser | DrivingSchoolManagerUser | BaseUser;
