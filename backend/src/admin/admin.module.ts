import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StatsController } from './stats.controller';

@Global()
@Module({ controllers: [AuthController, StatsController], providers: [AuthService, AdminGuard], exports: [AuthService, AdminGuard] })
export class AdminModule {}
