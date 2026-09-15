import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateNonconformityDto } from '../dto/create-nonconformity.dto';

describe('Nonconformities DTO - Date Validation (Defect B)', () => {
  describe('detectedAt validation', () => {
    it('should accept ISO 8601 date via DTO validation', async () => {
      const dto = new CreateNonconformityDto();
      dto.code = 'NC-001';
      dto.title = 'Test NC';
      dto.description = 'Test description';
      dto.severity = 'MAJOR';
      dto.detectedAt = new Date('2026-09-14T00:00:00.000Z');

      const errors = await validate(dto);
      const dateErrors = errors.filter(e => e.property === 'detectedAt');
      expect(dateErrors.length).toBe(0);
    });

    it('should accept Date instance for detectedAt', async () => {
      const dto = new CreateNonconformityDto();
      dto.code = 'NC-001';
      dto.title = 'Test NC';
      dto.description = 'Test description';
      dto.severity = 'MAJOR';
      dto.detectedAt = new Date();

      const errors = await validate(dto);
      const dateErrors = errors.filter(e => e.property === 'detectedAt');
      expect(dateErrors.length).toBe(0);
    });

    it('should reject detectedAt with invalid string via DTO validation', async () => {
      const dto = new CreateNonconformityDto();
      dto.code = 'NC-001';
      dto.title = 'Test NC';
      dto.description = 'Test description';
      dto.severity = 'MAJOR';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).detectedAt = 'not-a-date';

      const errors = await validate(dto);
      const dateErrors = errors.filter(e => e.property === 'detectedAt');
      expect(dateErrors.length).toBeGreaterThan(0);
    });

    it('should reject detectedAt with plain text via DTO validation', async () => {
      const dto = new CreateNonconformityDto();
      dto.code = 'NC-001';
      dto.title = 'Test NC';
      dto.description = 'Test description';
      dto.severity = 'MAJOR';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).detectedAt = 'hello world';

      const errors = await validate(dto);
      const dateErrors = errors.filter(e => e.property === 'detectedAt');
      expect(dateErrors.length).toBeGreaterThan(0);
    });

    it('should reject detectedAt as empty string', async () => {
      const dto = new CreateNonconformityDto();
      dto.code = 'NC-001';
      dto.title = 'Test NC';
      dto.description = 'Test description';
      dto.severity = 'MAJOR';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).detectedAt = '';

      const errors = await validate(dto);
      const dateErrors = errors.filter(e => e.property === 'detectedAt');
      expect(dateErrors.length).toBeGreaterThan(0);
    });
  });
});
