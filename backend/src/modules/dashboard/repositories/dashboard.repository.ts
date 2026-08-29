import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentStatus } from '@prisma/client';

export interface DashboardSummary {
  documents: {
    total: number;
    draft: number;
    inReview: number;
    approved: number;
    published: number;
    obsolete: number;
  };
  audits: {
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  nonconformities: {
    open: number;
    closed: number;
    total: number;
  };
  correctiveActions: {
    open: number;
    inProgress: number;
    completed: number;
    verified: number;
    total: number;
  };
  risks: {
    identified: number;
    assessed: number;
    treatmentPlanned: number;
    underControl: number;
    closed: number;
    total: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    severity: string;
  }>;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string): Promise<DashboardSummary> {
    const [
      documentCounts,
      auditCounts,
      nonconformityCounts,
      correctiveActionCounts,
      riskCounts,
      recentActivity,
      alerts,
    ] = await Promise.all([
      this.getDocumentCounts(organizationId),
      this.getAuditCounts(organizationId),
      this.getNonconformityCounts(organizationId),
      this.getCorrectiveActionCounts(organizationId),
      this.getRiskCounts(organizationId),
      this.getRecentActivity(organizationId),
      this.getAlerts(organizationId),
    ]);

    return {
      documents: documentCounts,
      audits: auditCounts,
      nonconformities: nonconformityCounts,
      correctiveActions: correctiveActionCounts,
      risks: riskCounts,
      recentActivity,
      alerts,
    };
  }

  private async getDocumentCounts(organizationId: string) {
    const counts = await this.prisma.document.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });

    const result = {
      total: 0,
      draft: 0,
      inReview: 0,
      approved: 0,
      published: 0,
      obsolete: 0,
    };

    for (const count of counts) {
      result.total += count._count._all;
      switch (count.status) {
        case DocumentStatus.DRAFT:
          result.draft = count._count._all;
          break;
        case DocumentStatus.IN_REVIEW:
        case DocumentStatus.REJECTED:
        case DocumentStatus.PENDING_APPROVAL:
          result.inReview += count._count._all;
          break;
        case DocumentStatus.APPROVED:
          result.approved = count._count._all;
          break;
        case DocumentStatus.CURRENT:
          result.published += count._count._all;
          break;
        case DocumentStatus.OBSOLETE:
          result.obsolete = count._count._all;
          break;
      }
    }

    return result;
  }

  private async getAuditCounts(organizationId: string) {
    const counts = await this.prisma.audit.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });

    const result = {
      planned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      total: 0,
    };

    for (const count of counts) {
      result.total += count._count._all;
      switch (count.status) {
        case 'PLANNED':
          result.planned = count._count._all;
          break;
        case 'IN_PROGRESS':
          result.inProgress = count._count._all;
          break;
        case 'COMPLETED':
          result.completed = count._count._all;
          break;
        case 'CANCELLED':
          result.cancelled = count._count._all;
          break;
      }
    }

    return result;
  }

  private async getNonconformityCounts(organizationId: string) {
    const counts = await this.prisma.nonconformity.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });

    const result = {
      open: 0,
      closed: 0,
      total: 0,
    };

    for (const count of counts) {
      result.total += count._count._all;
      if (count.status === 'CLOSED') {
        result.closed = count._count._all;
      } else {
        result.open += count._count._all;
      }
    }

    return result;
  }

  private async getCorrectiveActionCounts(organizationId: string) {
    const counts = await this.prisma.correctiveAction.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });

    const result = {
      open: 0,
      inProgress: 0,
      completed: 0,
      verified: 0,
      total: 0,
    };

    for (const count of counts) {
      result.total += count._count._all;
      switch (count.status) {
        case 'PENDING':
          result.open = count._count._all;
          break;
        case 'IN_PROGRESS':
          result.inProgress = count._count._all;
          break;
        case 'COMPLETED':
          result.completed = count._count._all;
          break;
        case 'VERIFIED':
        case 'CLOSED':
          result.verified += count._count._all;
          break;
      }
    }

    return result;
  }

  private async getRiskCounts(organizationId: string) {
    const counts = await this.prisma.risk.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });

    const result = {
      identified: 0,
      assessed: 0,
      treatmentPlanned: 0,
      underControl: 0,
      closed: 0,
      total: 0,
    };

    for (const count of counts) {
      result.total += count._count._all;
      switch (count.status) {
        case 'IDENTIFIED':
          result.identified = count._count._all;
          break;
        case 'ASSESSED':
          result.assessed = count._count._all;
          break;
        case 'TREATMENT_PLANNED':
          result.treatmentPlanned = count._count._all;
          break;
        case 'UNDER_CONTROL':
          result.underControl = count._count._all;
          break;
        case 'CLOSED':
          result.closed = count._count._all;
          break;
      }
    }

    return result;
  }

  private async getRecentActivity(organizationId: string) {
    const [recentDocuments, recentAudits, recentNonconformities, recentRisks] = await Promise.all([
      this.prisma.document.findMany({
        where: { organizationId },
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      this.prisma.audit.findMany({
        where: { organizationId },
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      this.prisma.nonconformity.findMany({
        where: { organizationId },
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 2,
      }),
      this.prisma.risk.findMany({
        where: { organizationId },
        select: { id: true, code: true, title: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 2,
      }),
    ]);

    const activity: Array<{ id: string; type: string; title: string; description: string; timestamp: string }> = [];

    for (const doc of recentDocuments) {
      activity.push({
        id: doc.id,
        type: 'document',
        title: doc.code,
        description: `${doc.title} — ${doc.status}`,
        timestamp: doc.updatedAt.toISOString(),
      });
    }

    for (const audit of recentAudits) {
      activity.push({
        id: audit.id,
        type: 'audit',
        title: audit.code,
        description: `${audit.title} — ${audit.status}`,
        timestamp: audit.updatedAt.toISOString(),
      });
    }

    for (const nc of recentNonconformities) {
      activity.push({
        id: nc.id,
        type: 'nonconformity',
        title: nc.code,
        description: `${nc.title} — ${nc.status}`,
        timestamp: nc.updatedAt.toISOString(),
      });
    }

    for (const risk of recentRisks) {
      activity.push({
        id: risk.id,
        type: 'risk',
        title: risk.code,
        description: `${risk.title} — ${risk.status}`,
        timestamp: risk.updatedAt.toISOString(),
      });
    }

    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activity.slice(0, 10);
  }

  private async getAlerts(organizationId: string) {
    const alerts: Array<{ id: string; type: string; title: string; description: string; severity: string }> = [];

    const pendingAudits = await this.prisma.audit.count({
      where: { organizationId, status: 'PLANNED' },
    });

    if (pendingAudits > 0) {
      alerts.push({
        id: 'audit-planned',
        type: 'audit',
        title: 'Auditorías planificadas',
        description: `${pendingAudits} auditoría(s) pendiente(s) de iniciar`,
        severity: 'warning',
      });
    }

    const openNonconformities = await this.prisma.nonconformity.count({
      where: { organizationId, status: { not: 'CLOSED' } },
    });

    if (openNonconformities > 0) {
      alerts.push({
        id: 'nc-open',
        type: 'nonconformity',
        title: 'No conformidades abiertas',
        description: `${openNonconformities} no conformidad(es) requiere(n) atención`,
        severity: 'error',
      });
    }

    const pendingActions = await this.prisma.correctiveAction.count({
      where: { organizationId, status: 'PENDING' },
    });

    if (pendingActions > 0) {
      alerts.push({
        id: 'ca-pending',
        type: 'correctiveAction',
        title: 'Acciones correctivas pendientes',
        description: `${pendingActions} acción(es) correctiva(s) pendiente(s)`,
        severity: 'warning',
      });
    }

    const pendingVerifications = await this.prisma.correctiveActionVerification.count({
      where: { organizationId, effectivenessStatus: 'PENDING' },
    });

    if (pendingVerifications > 0) {
      alerts.push({
        id: 'verification-pending',
        type: 'verification',
        title: 'Verificaciones pendientes',
        description: `${pendingVerifications} verificación(es) de efectividad pendiente(s)`,
        severity: 'info',
      });
    }

    const risksWithoutTreatment = await this.prisma.risk.count({
      where: {
        organizationId,
        status: { in: ['IDENTIFIED', 'ASSESSED'] },
        treatments: { none: {} },
      },
    });

    if (risksWithoutTreatment > 0) {
      alerts.push({
        id: 'risk-no-treatment',
        type: 'risk',
        title: 'Riesgos sin tratamiento',
        description: `${risksWithoutTreatment} riesgo(s) sin tratamiento planificado`,
        severity: 'warning',
      });
    }

    const documentsPendingApproval = await this.prisma.document.count({
      where: { organizationId, status: DocumentStatus.PENDING_APPROVAL },
    });

    if (documentsPendingApproval > 0) {
      alerts.push({
        id: 'doc-pending-approval',
        type: 'document',
        title: 'Documentos pendientes de aprobación',
        description: `${documentsPendingApproval} documento(s) esperando aprobación`,
        severity: 'info',
      });
    }

    return alerts.slice(0, 10);
  }
}
