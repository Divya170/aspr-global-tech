import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard('admin-login', 10, 15 * 60_000))
  login(@Body() body: { email?: string; password?: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(body?.email, body?.password, req, res);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }

  /** The signed-in staff member, their permissions and the CSRF token for this session. */
  @Get('me')
  me(@Req() req: Request) {
    return this.auth.me(req);
  }

  @Post('password')
  @HttpCode(200)
  @UseGuards(AdminGuard, new RateLimitGuard('admin-password', 10, 15 * 60_000))
  changePassword(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.auth.changePassword(req.user!, req.sessionId!, body || {}, req.ip);
  }

  @Post('forgot')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard('admin-forgot', 5, 15 * 60_000))
  forgot(@Body() body: { email?: string }, @Req() req: Request) {
    return this.auth.requestReset(body?.email, req.ip);
  }

  @Post('reset')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard('admin-reset', 10, 15 * 60_000))
  reset(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.auth.resetPassword(body || {}, req.ip);
  }
}
