import { validate } from 'class-validator';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { CreateDepartmentDto } from '../../departments/dto/create-department.dto';
import { UpdateDepartmentDto } from '../../departments/dto/update-department.dto';
import { CreateProcessDto } from '../../processes/dto/create-process.dto';
import { UpdateProcessDto } from '../../processes/dto/update-process.dto';

describe('DTO Validation Hardening', () => {
  describe('CreateDocumentDto', () => {
    it('should reject invalid UUID for documentTypeId', async () => {
      const dto = new CreateDocumentDto();
      dto.code = 'DOC-001';
      dto.title = 'Test';
      dto.documentTypeId = 'not-a-uuid';
      dto.ownerId = '123e4567-e89b-12d3-a456-426614174000';
      dto.responsibleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.classification = 'INTERNAL';
      dto.confidentiality = 'CONFIDENTIAL';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'documentTypeId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });

    it('should reject non-UUID string for ownerId', async () => {
      const dto = new CreateDocumentDto();
      dto.code = 'DOC-001';
      dto.title = 'Test';
      dto.documentTypeId = '123e4567-e89b-12d3-a456-426614174000';
      dto.ownerId = 'invalid';
      dto.responsibleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.classification = 'INTERNAL';
      dto.confidentiality = 'CONFIDENTIAL';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'ownerId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });

    it('should reject invalid UUID for processId', async () => {
      const dto = new CreateDocumentDto();
      dto.code = 'DOC-001';
      dto.title = 'Test';
      dto.documentTypeId = '123e4567-e89b-12d3-a456-426614174000';
      dto.processId = 'not-a-uuid';
      dto.ownerId = '123e4567-e89b-12d3-a456-426614174000';
      dto.responsibleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.classification = 'INTERNAL';
      dto.confidentiality = 'CONFIDENTIAL';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'processId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateDocumentDto', () => {
    it('should reject invalid UUID for ownerId', async () => {
      const dto = new UpdateDocumentDto();
      dto.ownerId = 'invalid-uuid';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'ownerId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateDepartmentDto', () => {
    it('should reject invalid UUID for parentDepartmentId', async () => {
      const dto = new CreateDepartmentDto();
      dto.name = 'Engineering';
      dto.parentDepartmentId = 'not-a-uuid';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'parentDepartmentId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateDepartmentDto', () => {
    it('should reject invalid UUID for parentDepartmentId', async () => {
      const dto = new UpdateDepartmentDto();
      dto.parentDepartmentId = 'not-a-uuid';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'parentDepartmentId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateProcessDto', () => {
    it('should reject invalid UUID for areaId', async () => {
      const dto = new CreateProcessDto();
      dto.code = 'PROC-001';
      dto.name = 'Sales';
      dto.areaId = 'not-a-uuid';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'areaId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });

    it('should reject invalid UUID for parentProcessId', async () => {
      const dto = new CreateProcessDto();
      dto.code = 'PROC-001';
      dto.name = 'Sales';
      dto.parentProcessId = 'not-a-uuid';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'parentProcessId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateProcessDto', () => {
    it('should reject invalid UUID for ownerId', async () => {
      const dto = new UpdateProcessDto();
      dto.ownerId = 'not-a-uuid';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'ownerId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });
  });
});
