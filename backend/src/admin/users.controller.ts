import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from './admin.guard';
import { Perm } from './permissions';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Perm('users')
  list() {
    return this.users.list();
  }

  /** Staff who can be assigned leads. Open to anyone who works leads. */
  @Get('options')
  @Perm('leads')
  options() {
    return this.users.options();
  }

  @Post()
  @Perm('users')
  create(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.users.create(req.user!, body || {}, req.ip);
  }

  @Patch(':id')
  @Perm('users')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.users.update(req.user!, id, body || {}, req.ip);
  }

  @Delete(':id')
  @Perm('users')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.users.remove(req.user!, id, req.ip);
  }
}
