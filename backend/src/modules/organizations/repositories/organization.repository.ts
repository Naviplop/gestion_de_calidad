import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findFirst({
      where: { id },
    });

    if (!org) {
      return null;
    }

    return new Organization(
      org.id,
      org.name,
      org.taxId,
      org.email,
      org.phone,
      org.address,
      org.timezone,
      org.locale,
      org.logoUrl,
      org.primaryColor,
      org.isActive,
      org.createdAt,
      org.updatedAt,
    );
  }

  async findByTaxId(taxId: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findFirst({
      where: { taxId },
    });

    if (!org) {
      return null;
    }

    return new Organization(
      org.id,
      org.name,
      org.taxId,
      org.email,
      org.phone,
      org.address,
      org.timezone,
      org.locale,
      org.logoUrl,
      org.primaryColor,
      org.isActive,
      org.createdAt,
      org.updatedAt,
    );
  }

  async create(data: {
    name: string;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    timezone?: string;
    locale?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  }): Promise<Organization> {
    const org = await this.prisma.organization.create({
      data: {
        name: data.name,
        taxId: data.taxId,
        email: data.email,
        phone: data.phone,
        address: data.address,
        timezone: data.timezone || 'UTC',
        locale: data.locale || 'es',
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
        isActive: true,
      },
    });

    return new Organization(
      org.id,
      org.name,
      org.taxId,
      org.email,
      org.phone,
      org.address,
      org.timezone,
      org.locale,
      org.logoUrl,
      org.primaryColor,
      org.isActive,
      org.createdAt,
      org.updatedAt,
    );
  }

  async update(organizationId: string, id: string, data: {
    name?: string;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    timezone?: string;
    locale?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    isActive?: boolean;
  }): Promise<Organization> {
    if (organizationId !== id) {
      throw new NotFoundException('OrganizationNotFound');
    }

    const org = await this.prisma.organization.update({
      where: { id },
      data,
    });

    return new Organization(
      org.id,
      org.name,
      org.taxId,
      org.email,
      org.phone,
      org.address,
      org.timezone,
      org.locale,
      org.logoUrl,
      org.primaryColor,
      org.isActive,
      org.createdAt,
      org.updatedAt,
    );
  }

  async deactivate(organizationId: string, id: string): Promise<void> {
    if (organizationId !== id) {
      throw new NotFoundException('OrganizationNotFound');
    }

    await this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
