import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Должен использоваться ПОСЛЕ JwtAccessGuard (полагается на req.user,
 * прикреплённый JwtAccessStrategy). Роут без @Roles() — доступен любой
 * аутентифицированной роли.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return Boolean(request.user) && requiredRoles.includes(request.user.role);
  }
}
