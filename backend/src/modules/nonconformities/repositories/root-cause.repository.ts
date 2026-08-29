import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RootCauseAnalysis } from '../entities/nonconformity.entity';

@Injectable()
export class RootCauseAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<RootCauseAnalysis | null> {
    const analysis = await this.prisma.rootCauseAnalysis.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        nonconformityId: true,
        methodology: true,
        analysisData: true,
        conclusion: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!analysis) {
      return null;
    }

    return new RootCauseAnalysis(
      analysis.id,
      analysis.organizationId,
      analysis.nonconformityId,
      analysis.methodology,
      analysis.analysisData as Record<string, unknown>,
      analysis.conclusion,
      analysis.createdById,
      analysis.createdAt,
      analysis.updatedAt,
    );
  }

  async findByNonconformity(nonconformityId: string, organizationId: string): Promise<RootCauseAnalysis | null> {
    const analysis = await this.prisma.rootCauseAnalysis.findFirst({
      where: { nonconformityId, organizationId },
      select: {
        id: true,
        organizationId: true,
        nonconformityId: true,
        methodology: true,
        analysisData: true,
        conclusion: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!analysis) {
      return null;
    }

    return new RootCauseAnalysis(
      analysis.id,
      analysis.organizationId,
      analysis.nonconformityId,
      analysis.methodology,
      analysis.analysisData as Record<string, unknown>,
      analysis.conclusion,
      analysis.createdById,
      analysis.createdAt,
      analysis.updatedAt,
    );
  }

  async create(organizationId: string, data: {
    nonconformityId: string;
    methodology: string;
    analysisData?: unknown;
    conclusion?: string | null;
    createdById: string;
  }): Promise<RootCauseAnalysis> {
    const analysis = await this.prisma.rootCauseAnalysis.create({
      data: {
        organizationId,
        nonconformityId: data.nonconformityId,
        methodology: data.methodology,
        analysisData: // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.analysisData as any) || {},
        conclusion: data.conclusion,
        createdById: data.createdById,
      },
      select: {
        id: true,
        organizationId: true,
        nonconformityId: true,
        methodology: true,
        analysisData: true,
        conclusion: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new RootCauseAnalysis(
      analysis.id,
      analysis.organizationId,
      analysis.nonconformityId,
      analysis.methodology,
      analysis.analysisData as Record<string, unknown>,
      analysis.conclusion,
      analysis.createdById,
      analysis.createdAt,
      analysis.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    methodology?: string;
    analysisData?: unknown;
    conclusion?: string | null;
  }): Promise<RootCauseAnalysis> {
    const analysis = await this.prisma.rootCauseAnalysis.update({
      where: { id },
      data: {
        ...(data.methodology !== undefined && { methodology: data.methodology }),
        ...(data.analysisData !== undefined && { analysisData: // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.analysisData as any }),
        ...(data.conclusion !== undefined && { conclusion: data.conclusion }),
      },
      select: {
        id: true,
        organizationId: true,
        nonconformityId: true,
        methodology: true,
        analysisData: true,
        conclusion: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (analysis.organizationId !== organizationId) {
      throw new NotFoundException('RootCauseAnalysisNotFound');
    }

    return new RootCauseAnalysis(
      analysis.id,
      analysis.organizationId,
      analysis.nonconformityId,
      analysis.methodology,
      analysis.analysisData as Record<string, unknown>,
      analysis.conclusion,
      analysis.createdById,
      analysis.createdAt,
      analysis.updatedAt,
    );
  }
}
