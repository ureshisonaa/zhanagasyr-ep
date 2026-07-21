import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Регистрируется глобально (см. AuthModule) — доступ запрещён по умолчанию.
 * Единственный способ сделать роут публичным — декоратор @Public().
 */
@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  public constructor(private readonly reflector: Reflector) {
    super();
  }

  public canActivate(context: ExecutionContext): ReturnType<CanActivate['canActivate']> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
