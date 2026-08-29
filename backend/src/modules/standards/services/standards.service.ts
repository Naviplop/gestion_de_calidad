import { Injectable, NotFoundException } from '@nestjs/common';
import { StandardRepository } from '../repositories/standard.repository';
import { Standard } from '../entities/standard.entity';

@Injectable()
export class StandardsService {
  constructor(private readonly standardRepository: StandardRepository) {}

  async listStandards(page: number, pageSize: number, search?: string): Promise<{ data: Standard[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    return this.standardRepository.findMany(page, pageSize, search);
  }

  async getStandard(id: string): Promise<Standard> {
    const standard = await this.standardRepository.findById(id);
    if (!standard) {
      throw new NotFoundException('StandardNotFound');
    }
    return standard;
  }

  async getStandardRequirements(standardId: string, page: number, pageSize: number, parentId?: string, search?: string) {
    return this.standardRepository.findRequirements(standardId, page, pageSize, parentId, search);
  }
}
