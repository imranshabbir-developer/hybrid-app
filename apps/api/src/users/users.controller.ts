import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { AuthRequestUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() currentPassword?: string;
  @IsOptional() @IsString() @MinLength(6) newPassword?: string;
}

class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() fullName!: string;
  @IsString() @MinLength(6) password!: string;
  @IsIn(['ADMIN', 'COMPANY']) role!: Role;
  @IsOptional() @IsString() companyId?: string | null;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsIn(['ADMIN', 'COMPANY']) role?: Role;
  @IsOptional() @IsString() companyId?: string | null;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class SetActiveDto {
  @IsBoolean() isActive!: boolean;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('profile')
  getProfile(@Req() req: { user: AuthRequestUser }) {
    return this.users.getProfile(req.user);
  }

  @Put('profile')
  updateProfile(
    @Req() req: { user: AuthRequestUser },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(req.user, dto);
  }

  @Get('users')
  list(@Req() req: { user: AuthRequestUser }) {
    return this.users.listUsers(req.user);
  }

  @Get('users/companies')
  companies(@Req() req: { user: AuthRequestUser }) {
    return this.users.listCompanies(req.user);
  }

  @Post('users')
  create(@Req() req: { user: AuthRequestUser }, @Body() dto: CreateUserDto) {
    return this.users.createUser(req.user, dto);
  }

  @Put('users/:id')
  update(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.updateUser(req.user, id, dto);
  }

  @Patch('users/:id/active')
  setActive(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.users.setActive(req.user, id, dto.isActive);
  }

  @Delete('users/:id')
  remove(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.users.removeUser(req.user, id);
  }
}
