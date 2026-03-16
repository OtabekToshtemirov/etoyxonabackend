import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('Foydalanuvchi topilmadi');
    }

    // Check global role (super_admin has access to everything)
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Check venue-specific role
    const hasRole = requiredRoles.some(
      (role) => role === user.role || role === user.venue_role,
    );

    if (!hasRole) {
      throw new ForbiddenException('Sizda bu amalni bajarish huquqi yo\'q');
    }

    return true;
  }
}
