import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { DocumentTypesService } from '../services/document-types.service';
import { CreateDocumentTypeDto } from '../dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from '../dto/update-document-type.dto';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Get()
  @RequirePermission('documents:read')
  list(@Req() req: AuthenticatedRequest) {
    return this.documentTypesService.list(req.organizationId);
  }

  @Get(':id')
  @RequirePermission('documents:read')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.documentTypesService.get(req.organizationId, id);
  }

  @Post()
  @RequirePermission('documents:create')
  create(@Body() dto: CreateDocumentTypeDto, @Req() req: AuthenticatedRequest) {
    return this.documentTypesService.create(req.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermission('documents:update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentTypeDto, @Req() req: AuthenticatedRequest) {
    return this.documentTypesService.update(req.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('documents:delete')
  @HttpCode(204)
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.documentTypesService.delete(req.organizationId, id);
  }
}
