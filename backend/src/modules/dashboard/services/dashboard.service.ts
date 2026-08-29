import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';

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
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(organizationId: string): Promise<DashboardSummary> {
    return this.dashboardRepository.getSummary(organizationId);
  }
}
