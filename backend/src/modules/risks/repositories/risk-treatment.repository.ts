import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RiskTreatment } from '../entities/risk-treatment.entity';

@Injectable()
export class RiskTreatmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<RiskTreatment | null> {
    const treatment = await this.prisma.riskTreatment.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        strategy: true,
        description: true,
        responsibleId: true,
        dueDate: true,
        status: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!treatment) {
      return null;
    }

    return new RiskTreatment(
      treatment.id,
      treatment.organizationId,
      treatment.riskId,
      treatment.strategy,
      treatment.description,
      treatment.responsibleId,
      treatment.dueDate,
      treatment.status,
      treatment.completedAt,
      treatment.createdAt,
      treatment.updatedAt,
    );
  }

  async findByRisk(riskId: string, organizationId: string): Promise<RiskTreatment[]> {
    const treatments = await this.prisma.riskTreatment.findMany({
      where: { riskId, organizationId },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        strategy: true,
        description: true,
        responsibleId: true,
        dueDate: true,
        status: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return treatments.map((t) => new RiskTreatment(
      t.id,
      t.organizationId,
      t.riskId,
      t.strategy,
      t.description,
      t.responsibleId,
      t.dueDate,
      t.status,
      t.completedAt,
      t.createdAt,
      t.updatedAt,
    ));
  }

  async create(organizationId: string, data: {
    riskId: string;
    strategy: string;
    description: string;
    responsibleId?: string | null;
    dueDate?: Date | null;
  }): Promise<RiskTreatment> {
    const treatment = await this.prisma.riskTreatment.create({
      data: {
        organizationId,
        riskId: data.riskId,
        strategy: data.strategy,
        description: data.description,
        responsibleId: data.responsibleId,
        dueDate: data.dueDate,
        status: 'PLANNED',
      },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        strategy: true,
        description: true,
        responsibleId: true,
        dueDate: true,
        status: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new RiskTreatment(
      treatment.id,
      treatment.organizationId,
      treatment.riskId,
      treatment.strategy,
      treatment.description,
      treatment.responsibleId,
      treatment.dueDate,
      treatment.status,
      treatment.completedAt,
      treatment.createdAt,
      treatment.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    strategy?: string;
    description?: string;
    responsibleId?: string | null;
    dueDate?: Date | null;
    status?: string;
    completedAt?: Date | null;
  }): Promise<RiskTreatment> {
    await this.prisma.riskTreatment.findFirstOrThrow({
      where: { id, organizationId },
    });

    const treatment = await this.prisma.riskTreatment.update({
      where: { id },
      data: {
        ...(data.strategy !== undefined && { strategy: data.strategy }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.responsibleId !== undefined && { responsibleId: data.responsibleId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        strategy: true,
        description: true,
        responsibleId: true,
        dueDate: true,
        status: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new RiskTreatment(
      treatment.id,
      treatment.organizationId,
      treatment.riskId,
      treatment.strategy,
      treatment.description,
      treatment.responsibleId,
      treatment.dueDate,
      treatment.status,
      treatment.completedAt,
      treatment.createdAt,
      treatment.updatedAt,
    );
  }
}
