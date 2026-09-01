import { Controller, Get, Post, Body, Patch, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermission('departments:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.departmentsService.listDepartments(
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
    );
  }

  @Post()
  @RequirePermission('departments:create')
  create(@Body() dto: CreateDepartmentDto, @Req() req: AuthenticatedRequest) {
    return this.departmentsService.createDepartment(req.organizationId, dto);
  }

  @Get(':id')
  @RequirePermission('departments:read')
  @RequireResourceOwnership({ resourceType: 'department', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.departmentsService.getDepartment(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('departments:update')
  @RequireResourceOwnership({ resourceType: 'department', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @Req() req: AuthenticatedRequest) {
    return this.departmentsService.updateDepartment(req.organizationId, id, dto);
  }

  @Post(':id/deactivate')
  @RequirePermission('departments:deactivate')
  @RequireResourceOwnership({ resourceType: 'department', resourceIdParam: 'id' })
  deactivate(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.departmentsService.deactivateDepartment(req.organizationId, id);
  }
}
