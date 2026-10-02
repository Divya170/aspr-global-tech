import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard('admin-login', 10, 15 * 60_000))
  login(@Body() body: { password?: string }) {
    return this.auth.login(body?.password);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me() {
    return { ok: true, role: 'admin' };
  }
}
