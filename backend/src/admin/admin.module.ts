import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StatsController } from './stats.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Global()
@Module({ controllers: [AuthController, UsersController, StatsController], providers: [AuthService, UsersService, AdminGuard], exports: [AuthService, AdminGuard] })
export class AdminModule {}
