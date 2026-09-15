import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DepartmentRepository } from '../repositories/department.repository';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { Department, DepartmentListItem } from '../entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async listDepartments(organizationId: string, page: number, pageSize: number, search?: string): Promise<{ data: DepartmentListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    return this.departmentRepository.findListByOrganization(organizationId, page, pageSize, search);
  }

  async getDepartment(organizationId: string, id: string): Promise<Department> {
    const dept = await this.departmentRepository.findById(id, organizationId);
    if (!dept) {
      throw new NotFoundException('DepartmentNotFound');
    }
    return dept;
  }

  async createDepartment(organizationId: string, dto: CreateDepartmentDto): Promise<Department> {
    const duplicate = await this.departmentRepository.findDuplicate(organizationId, dto.name);
    if (duplicate) {
      throw new ConflictException('DuplicateDepartmentName');
    }

    if (dto.parentDepartmentId) {
      const parent = await this.departmentRepository.findById(dto.parentDepartmentId, organizationId);
      if (!parent) {
        throw new BadRequestException('InvalidParentDepartment');
      }
      const cycleDetected = await this.departmentRepository.detectCycle('', dto.parentDepartmentId, organizationId);
      if (cycleDetected) {
        throw new BadRequestException('CycleDetectedInDepartmentHierarchy');
      }
    }

    return this.departmentRepository.create(organizationId, {
      name: dto.name,
      description: dto.description,
      parentDepartmentId: dto.parentDepartmentId,
    });
  }

  async updateDepartment(organizationId: string, id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const existing = await this.departmentRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('DepartmentNotFound');
    }

    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.departmentRepository.findDuplicate(organizationId, dto.name, id);
      if (duplicate) {
        throw new ConflictException('DuplicateDepartmentName');
      }
    }

    if (dto.parentDepartmentId) {
      if (dto.parentDepartmentId === id) {
        throw new BadRequestException('InvalidParentDepartment');
      }
      const parent = await this.departmentRepository.findById(dto.parentDepartmentId, organizationId);
      if (!parent) {
        throw new BadRequestException('InvalidParentDepartment');
      }
      const cycleDetected = await this.departmentRepository.detectCycle(id, dto.parentDepartmentId, organizationId);
      if (cycleDetected) {
        throw new BadRequestException('CycleDetectedInDepartmentHierarchy');
      }
    }

    return this.departmentRepository.update(id, organizationId, {
      name: dto.name,
      description: dto.description,
      parentDepartmentId: dto.parentDepartmentId,
      isActive: dto.isActive,
    });
  }

  async deactivateDepartment(organizationId: string, id: string): Promise<void> {
    const existing = await this.departmentRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('DepartmentNotFound');
    }

    await this.departmentRepository.deactivate(id, organizationId);
  }
}
