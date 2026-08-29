import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../database/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should return ok status on health', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('qms-backend');
    expect(result.timestamp).toBeDefined();
  });

  it('should return alive on liveness', () => {
    const result = controller.liveness();
    expect(result.status).toBe('alive');
    expect(result.service).toBe('qms-backend');
  });

  it('should return ready on readiness when db is up', async () => {
    (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);
    const result = await controller.readiness();
    expect(result.status).toBe('ready');
    expect(result.database).toBe('connected');
  });

  it('should return not_ready on readiness when db is down', async () => {
    (prismaService.$queryRaw as jest.Mock).mockRejectedValue(new Error('connection failed'));
    const result = await controller.readiness();
    expect(result.status).toBe('not_ready');
    expect(result.database).toBe('unreachable');
  });
});
