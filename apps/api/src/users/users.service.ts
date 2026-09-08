import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequestUser } from '../auth/jwt-auth.guard';
import { mirrorDeleteUser, mirrorUpsertUser } from './dual-db.util';

function publicUser(
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    jobTitle: string;
    role: Role;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    companyId: string | null;
    company: { id: string; code: string; name: string } | null;
  },
) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    jobTitle: user.jobTitle,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    companyId: user.companyId,
    company: user.company
      ? {
          id: user.company.id,
          code: user.company.code,
          name: user.company.name,
        }
      : null,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAdmin(actor: AuthRequestUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can manage permissions');
    }
  }

  private async loadUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async afterWrite(id: string) {
    const user = await this.loadUser(id);
    await mirrorUpsertUser({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      phone: user.phone,
      jobTitle: user.jobTitle,
      role: user.role,
      isActive: user.isActive,
      company: user.company ? { code: user.company.code } : null,
    });
    return publicUser(user);
  }

  async getProfile(actor: AuthRequestUser) {
    const user = await this.loadUser(actor.userId);
    if (!user.isActive) throw new ForbiddenException('Account disabled');
    return publicUser(user);
  }

  async updateProfile(
    actor: AuthRequestUser,
    dto: {
      fullName?: string;
      email?: string;
      phone?: string;
      jobTitle?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    const user = await this.loadUser(actor.userId);
    if (!user.isActive) throw new ForbiddenException('Account disabled');

    const data: Prisma.UserUpdateInput = {};

    if (dto.fullName != null) {
      const name = dto.fullName.trim();
      if (!name) throw new BadRequestException('Full name is required');
      data.fullName = name;
    }
    if (dto.phone != null) data.phone = dto.phone.trim();
    if (dto.jobTitle != null) data.jobTitle = dto.jobTitle.trim();

    if (dto.email != null) {
      const email = dto.email.trim().toLowerCase();
      if (!email) throw new BadRequestException('Email is required');
      if (email !== user.email) {
        const taken = await this.prisma.user.findUnique({ where: { email } });
        if (taken) throw new ConflictException('Email is already in use');
        data.email = email;
      }
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!ok) throw new BadRequestException('Current password is incorrect');
      if (dto.newPassword.length < 6) {
        throw new BadRequestException('New password must be at least 6 characters');
      }
      data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    await this.prisma.user.update({ where: { id: user.id }, data });
    return this.afterWrite(user.id);
  }

  listCompanies(actor: AuthRequestUser) {
    this.assertAdmin(actor);
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, isActive: true },
    });
  }

  async listUsers(actor: AuthRequestUser) {
    this.assertAdmin(actor);
    const rows = await this.prisma.user.findMany({
      include: { company: true },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
    return rows.map(publicUser);
  }

  async createUser(
    actor: AuthRequestUser,
    dto: {
      email: string;
      fullName: string;
      password: string;
      role: Role;
      companyId?: string | null;
      phone?: string;
      jobTitle?: string;
      isActive?: boolean;
    },
  ) {
    this.assertAdmin(actor);
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    if (!email || !fullName) {
      throw new BadRequestException('Email and full name are required');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    if (dto.role === 'COMPANY' && !dto.companyId) {
      throw new BadRequestException('Company users must be linked to a company');
    }
    if (dto.role === 'ADMIN' && dto.companyId) {
      throw new BadRequestException('Administrators cannot be linked to a company');
    }
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken) throw new ConflictException('Email is already in use');

    if (dto.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
      });
      if (!company) throw new BadRequestException('Company not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: dto.role,
        companyId: dto.role === 'ADMIN' ? null : dto.companyId || null,
        phone: dto.phone?.trim() || '',
        jobTitle: dto.jobTitle?.trim() || '',
        isActive: dto.isActive ?? true,
      },
    });
    return this.afterWrite(created.id);
  }

  async updateUser(
    actor: AuthRequestUser,
    id: string,
    dto: {
      email?: string;
      fullName?: string;
      password?: string;
      role?: Role;
      companyId?: string | null;
      phone?: string;
      jobTitle?: string;
      isActive?: boolean;
    },
  ) {
    this.assertAdmin(actor);
    const user = await this.loadUser(id);

    if (user.id === actor.userId && dto.isActive === false) {
      throw new BadRequestException('You cannot disable your own account');
    }
    if (user.id === actor.userId && dto.role && dto.role !== 'ADMIN') {
      throw new BadRequestException('You cannot remove your own admin role');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName != null) {
      const name = dto.fullName.trim();
      if (!name) throw new BadRequestException('Full name is required');
      data.fullName = name;
    }
    if (dto.phone != null) data.phone = dto.phone.trim();
    if (dto.jobTitle != null) data.jobTitle = dto.jobTitle.trim();
    if (dto.isActive != null) data.isActive = dto.isActive;

    const nextRole = dto.role ?? user.role;
    if (dto.role != null) data.role = dto.role;

    if (dto.email != null) {
      const email = dto.email.trim().toLowerCase();
      if (!email) throw new BadRequestException('Email is required');
      if (email !== user.email) {
        const taken = await this.prisma.user.findUnique({ where: { email } });
        if (taken) throw new ConflictException('Email is already in use');
        data.email = email;
      }
    }

    if (dto.password) {
      if (dto.password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (nextRole === 'ADMIN') {
      data.company = { disconnect: true };
    } else if (dto.companyId !== undefined || dto.role === 'COMPANY') {
      const companyId = dto.companyId !== undefined ? dto.companyId : user.companyId;
      if (!companyId) {
        throw new BadRequestException('Company users must be linked to a company');
      }
      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      if (!company) throw new BadRequestException('Company not found');
      data.company = { connect: { id: companyId } };
    }

    await this.prisma.user.update({ where: { id }, data });
    return this.afterWrite(id);
  }

  async setActive(actor: AuthRequestUser, id: string, isActive: boolean) {
    return this.updateUser(actor, id, { isActive });
  }

  async removeUser(actor: AuthRequestUser, id: string) {
    this.assertAdmin(actor);
    const user = await this.loadUser(id);
    if (user.id === actor.userId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const [po, se, sm, is] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: { createdById: id } }),
      this.prisma.supplierEntry.count({ where: { createdById: id } }),
      this.prisma.supplierMaster.count({ where: { createdById: id } }),
      this.prisma.importShipment.count({ where: { createdById: id } }),
    ]);
    if (po + se + sm + is > 0) {
      await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      await this.afterWrite(id);
      return {
        ok: true,
        deleted: false,
        disabled: true,
        message:
          'User has related records and was disabled instead of permanently deleted.',
      };
    }

    await this.prisma.user.delete({ where: { id } });
    await mirrorDeleteUser(user.email, user.id);
    return { ok: true, deleted: true, disabled: false };
  }
}
