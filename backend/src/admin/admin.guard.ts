import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, CSRF_HEADER } from './auth.service';
import { can, Permission, PERMS_KEY } from './permissions';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protects every /api/admin/* route:
 *  - a valid session cookie (httpOnly, SameSite=Strict) identifies the staff member;
 *  - state-changing requests must echo the session's CSRF token in X-CSRF-Token;
 *  - @Perm(...) on the route or controller restricts it to roles holding those permissions.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const session = this.auth.sessionFromRequest(req);
    if (!SAFE.has(req.method) && !this.auth.csrfMatches(session.csrf, req.header(CSRF_HEADER))) {
      throw new ForbiddenException('Your session token is out of date. Reload the page and try again.');
    }
    req.user = session.user;
    req.sessionId = session.id;
    const perms = this.reflector.getAllAndMerge<Permission[]>(PERMS_KEY, [ctx.getClass(), ctx.getHandler()]) || [];
    if (perms.some((p) => !can(session.user, p))) throw new ForbiddenException("Your role doesn't have access to this.");
    return true;
  }
}
