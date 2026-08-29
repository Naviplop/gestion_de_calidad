import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CorrectiveActionVerification } from '../entities/nonconformity.entity';

@Injectable()
export class CorrectiveActionVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<CorrectiveActionVerification | null> {
    const verification = await this.prisma.correctiveActionVerification.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        correctiveActionId: true,
        verifierId: true,
        effectivenessStatus: true,
        evidence: true,
        comments: true,
        verifiedAt: true,
      },
    });

    if (!verification) {
      return null;
    }

    return new CorrectiveActionVerification(
      verification.id,
      verification.organizationId,
      verification.correctiveActionId,
      verification.verifierId,
      verification.effectivenessStatus,
      verification.evidence,
      verification.comments,
      verification.verifiedAt,
    );
  }

  async create(organizationId: string, data: {
    correctiveActionId: string;
    verifierId: string;
    effectivenessStatus: string;
    evidence?: string | null;
    comments?: string | null;
  }): Promise<CorrectiveActionVerification> {
    const verification = await this.prisma.correctiveActionVerification.create({
      data: {
        organizationId,
        correctiveActionId: data.correctiveActionId,
        verifierId: data.verifierId,
        effectivenessStatus: data.effectivenessStatus,
        evidence: data.evidence,
        comments: data.comments,
      },
      select: {
        id: true,
        organizationId: true,
        correctiveActionId: true,
        verifierId: true,
        effectivenessStatus: true,
        evidence: true,
        comments: true,
        verifiedAt: true,
      },
    });

    return new CorrectiveActionVerification(
      verification.id,
      verification.organizationId,
      verification.correctiveActionId,
      verification.verifierId,
      verification.effectivenessStatus,
      verification.evidence,
      verification.comments,
      verification.verifiedAt,
    );
  }
}
