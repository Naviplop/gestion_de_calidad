import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { RiskAssessment } from '../entities/risk-assessment.entity';

@Injectable()
export class RiskAssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<RiskAssessment | null> {
    const assessment = await this.prisma.riskAssessment.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        probability: true,
        impact: true,
        score: true,
        calculationData: true,
        assessedById: true,
        assessedAt: true,
      },
    });

    if (!assessment) {
      return null;
    }

    return new RiskAssessment(
      assessment.id,
      assessment.organizationId,
      assessment.riskId,
      assessment.probability,
      assessment.impact,
      assessment.score,
      assessment.calculationData as Record<string, unknown>,
      assessment.assessedById,
      assessment.assessedAt,
    );
  }

  async findByRisk(riskId: string, organizationId: string): Promise<RiskAssessment | null> {
    const assessment = await this.prisma.riskAssessment.findFirst({
      where: { riskId, organizationId },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        probability: true,
        impact: true,
        score: true,
        calculationData: true,
        assessedById: true,
        assessedAt: true,
      },
      orderBy: { assessedAt: 'desc' },
    });

    if (!assessment) {
      return null;
    }

    return new RiskAssessment(
      assessment.id,
      assessment.organizationId,
      assessment.riskId,
      assessment.probability,
      assessment.impact,
      assessment.score,
      assessment.calculationData as Record<string, unknown>,
      assessment.assessedById,
      assessment.assessedAt,
    );
  }

  async findListByRisk(
    riskId: string,
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: RiskAssessment[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { riskId, organizationId };

    const [assessments, total] = await Promise.all([
      this.prisma.riskAssessment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { assessedAt: 'desc' },
        select: {
          id: true,
          organizationId: true,
          riskId: true,
          probability: true,
          impact: true,
          score: true,
          calculationData: true,
          assessedById: true,
          assessedAt: true,
        },
      }),
      this.prisma.riskAssessment.count({ where }),
    ]);

    const data = assessments.map((a) => new RiskAssessment(
      a.id,
      a.organizationId,
      a.riskId,
      a.probability,
      a.impact,
      a.score,
      a.calculationData as Record<string, unknown>,
      a.assessedById,
      a.assessedAt,
    ));

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async create(organizationId: string, data: {
    riskId: string;
    probability: string;
    impact: string;
    calculationData: Record<string, unknown>;
    assessedById: string;
  }): Promise<RiskAssessment> {
    const assessment = await this.prisma.riskAssessment.create({
      data: {
        organizationId,
        riskId: data.riskId,
        probability: data.probability,
        impact: data.impact,
        score: this.calculateScore(data.probability, data.impact),
        calculationData: data.calculationData as Prisma.InputJsonValue,
        assessedById: data.assessedById,
      },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        probability: true,
        impact: true,
        score: true,
        calculationData: true,
        assessedById: true,
        assessedAt: true,
      },
    });

    return new RiskAssessment(
      assessment.id,
      assessment.organizationId,
      assessment.riskId,
      assessment.probability,
      assessment.impact,
      assessment.score,
      assessment.calculationData as Record<string, unknown>,
      assessment.assessedById,
      assessment.assessedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    probability?: string;
    impact?: string;
    calculationData?: Record<string, unknown>;
  }): Promise<RiskAssessment> {
    const assessment = await this.prisma.riskAssessment.update({
      where: { id },
      data: {
        ...(data.probability !== undefined && { probability: data.probability }),
        ...(data.impact !== undefined && { impact: data.impact }),
        ...(data.calculationData !== undefined && {
          calculationData: data.calculationData as Prisma.InputJsonValue,
        }),
      },
      select: {
        id: true,
        organizationId: true,
        riskId: true,
        probability: true,
        impact: true,
        score: true,
        calculationData: true,
        assessedById: true,
        assessedAt: true,
      },
    });

    if (assessment.organizationId !== organizationId) {
      throw new Error('RiskAssessmentNotFound');
    }

    return new RiskAssessment(
      assessment.id,
      assessment.organizationId,
      assessment.riskId,
      assessment.probability,
      assessment.impact,
      assessment.score,
      assessment.calculationData as Record<string, unknown>,
      assessment.assessedById,
      assessment.assessedAt,
    );
  }

  private calculateScore(probability: string, impact: string): string {
    const map: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };
    const p = map[probability] || 0;
    const i = map[impact] || 0;
    return String(p * i);
  }
}
