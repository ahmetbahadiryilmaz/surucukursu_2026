import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class LocalOnlyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
