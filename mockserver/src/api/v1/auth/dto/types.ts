import { Request } from 'express';
import { UserTypes } from './enum';

// Update this interface to match the Prisma User model
export interface UserModel {
  id: number;
  email: string;
  password: string;
  name?: string;
  createdAt: Date;  // Changed from created_at to match Prisma model
  updatedAt: Date;  // Changed from updated_at to match Prisma model
}

export interface BaseUser {
  id: number;
  email: string;
  name?: string;
  userType: UserTypes;
}

export interface RequestWithUser extends Request {
  user: BaseUser;
}