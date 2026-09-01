import { Controller, Get, Post, Body, Patch, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { ProcessesService } from '../services/processes.service';
import { CreateProcessDto } from '../dto/create-process.dto';
import { UpdateProcessDto } from '../dto/update-process.dto';
import { Process } from '../entities/process.entity';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get()
  @RequirePermission('processes:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.processesService.listProcesses(
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
    );
  }

  @Post()
  @RequirePermission('processes:create')
  create(@Body() dto: CreateProcessDto, @Req() req: AuthenticatedRequest): Promise<Process> {
    return this.processesService.createProcess(req.organizationId, dto);
  }

  @Get(':id')
  @RequirePermission('processes:read')
  @RequireResourceOwnership({ resourceType: 'process', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<Process> {
    return this.processesService.getProcess(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('processes:update')
  @RequireResourceOwnership({ resourceType: 'process', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateProcessDto, @Req() req: AuthenticatedRequest): Promise<Process> {
    return this.processesService.updateProcess(req.organizationId, id, dto);
  }

  @Post(':id/deactivate')
  @RequirePermission('processes:deactivate')
  @RequireResourceOwnership({ resourceType: 'process', resourceIdParam: 'id' })
  deactivate(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.processesService.deactivateProcess(req.organizationId, id);
  }
}
