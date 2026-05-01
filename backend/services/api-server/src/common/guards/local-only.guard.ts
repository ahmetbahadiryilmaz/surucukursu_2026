import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class LocalOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    console.log(`LocalOnlyGuard: Checking access for ${context.getClass().name}.${context.getHandler().name}`);

    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip ||
                    request.connection?.remoteAddress ||
                    request.socket?.remoteAddress ||
                    request.connection?.socket?.remoteAddress;

    console.log(`LocalOnlyGuard: Client IP: ${clientIp}`);

    // Allow localhost IPs
    const allowedIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];

    if (!allowedIps.includes(clientIp)) {
      console.log(`LocalOnlyGuard: Access denied for IP ${clientIp}`);
      throw new ForbiddenException('Access denied: Only localhost requests allowed');
    }

    console.log(`LocalOnlyGuard: Access granted for IP ${clientIp}`);
    return true;
  }
}