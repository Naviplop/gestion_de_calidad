import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RiskControl } from '../entities/risk-control.entity';

@Injectable()
export class RiskControlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<RiskControl | null> {
    const control = await this.prisma.riskControl.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        userId: true,
        description: true,
        controlType: true,
        effectiveness: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!control) {
      return null;
    }

    return new RiskControl(
      control.id,
      control.organizationId,
      control.riskId,
      control.userId,
      control.description,
      control.controlType,
      control.effectiveness,
      control.createdAt,
      control.updatedAt,
    );
  }

  async findByRisk(riskId: string, organizationId: string): Promise<RiskControl[]> {
    const controls = await this.prisma.riskControl.findMany({
      where: { riskId, organizationId },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        userId: true,
        description: true,
        controlType: true,
        effectiveness: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return controls.map((c) => new RiskControl(
      c.id,
      c.organizationId,
      c.riskId,
      c.userId,
      c.description,
      c.controlType,
      c.effectiveness,
      c.createdAt,
      c.updatedAt,
    ));
  }

  async create(organizationId: string, data: {
    riskId: string;
    userId: string;
    description: string;
    controlType: string;
    effectiveness?: string | null;
  }): Promise<RiskControl> {
    const control = await this.prisma.riskControl.create({
      data: {
        organizationId,
        riskId: data.riskId,
        userId: data.userId,
        description: data.description,
        controlType: data.controlType,
        effectiveness: data.effectiveness,
      },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        userId: true,
        description: true,
        controlType: true,
        effectiveness: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new RiskControl(
      control.id,
      control.organizationId,
      control.riskId,
      control.userId,
      control.description,
      control.controlType,
      control.effectiveness,
      control.createdAt,
      control.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    description?: string;
    controlType?: string;
    effectiveness?: string | null;
  }): Promise<RiskControl> {
    const control = await this.prisma.riskControl.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.controlType !== undefined && { controlType: data.controlType }),
        ...(data.effectiveness !== undefined && { effectiveness: data.effectiveness }),
      },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        userId: true,
        description: true,
        controlType: true,
        effectiveness: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (control.organizationId !== organizationId) {
      throw new Error('RiskControlNotFound');
    }

    return new RiskControl(
      control.id,
      control.organizationId,
      control.riskId,
      control.userId,
      control.description,
      control.controlType,
      control.effectiveness,
      control.createdAt,
      control.updatedAt,
    );
  }
}
