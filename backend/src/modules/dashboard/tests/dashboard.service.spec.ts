import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../services/dashboard.service';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardSummary } from '../repositories/dashboard.repository';

describe('DashboardService', () => {
  let service: DashboardService;
  let dashboardRepository: jest.Mocked<DashboardRepository>;

  const mockSummary: DashboardSummary = {
    documents: { total: 2, draft: 1, inReview: 1, approved: 0, published: 0, obsolete: 0 },
    audits: { planned: 1, inProgress: 0, completed: 0, cancelled: 0, total: 1 },
    nonconformities: { open: 1, closed: 0, total: 1 },
    correctiveActions: { open: 1, inProgress: 0, completed: 0, verified: 0, total: 1 },
    risks: { identified: 1, assessed: 0, treatmentPlanned: 0, underControl: 0, closed: 0, total: 1 },
    recentActivity: [
      { id: '1', type: 'document', title: 'DOC-001', description: 'Test Document — DRAFT', timestamp: new Date().toISOString() },
    ],
    alerts: [
      { id: 'nc-open', type: 'nonconformity', title: 'No conformidades abiertas', description: '1 no conformidad(es) requiere(n) atención', severity: 'error' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DashboardRepository, useValue: { getSummary: jest.fn() } },
      ],
    }).compile();

    service = module.get(DashboardService);
    dashboardRepository = module.get(DashboardRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return dashboard summary for authenticated tenant', async () => {
      dashboardRepository.getSummary.mockResolvedValue(mockSummary);

      const result = await service.getSummary('org-1');

      expect(result).toEqual(mockSummary);
      expect(dashboardRepository.getSummary).toHaveBeenCalledWith('org-1');
    });

    it('should return empty counts for organization without data', async () => {
      const emptySummary: DashboardSummary = {
        documents: { total: 0, draft: 0, inReview: 0, approved: 0, published: 0, obsolete: 0 },
        audits: { planned: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 },
        nonconformities: { open: 0, closed: 0, total: 0 },
        correctiveActions: { open: 0, inProgress: 0, completed: 0, verified: 0, total: 0 },
        risks: { identified: 0, assessed: 0, treatmentPlanned: 0, underControl: 0, closed: 0, total: 0 },
        recentActivity: [],
        alerts: [],
      };

      dashboardRepository.getSummary.mockResolvedValue(emptySummary);

      const result = await service.getSummary('org-empty');

      expect(result).toEqual(emptySummary);
      expect(dashboardRepository.getSummary).toHaveBeenCalledWith('org-empty');
    });

    it('should include alerts when data exists', async () => {
      dashboardRepository.getSummary.mockResolvedValue(mockSummary);

      const result = await service.getSummary('org-1');

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].title).toBe('No conformidades abiertas');
      expect(result.recentActivity).toHaveLength(1);
    });
  });
});
