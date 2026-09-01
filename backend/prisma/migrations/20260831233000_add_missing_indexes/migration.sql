-- CreateIndex
CREATE INDEX "document_versions_organizationId_idx" ON "document_versions"("organizationId");

-- CreateIndex
CREATE INDEX "document_versions_fileAssetId_idx" ON "document_versions"("fileAssetId");

-- CreateIndex
CREATE INDEX "documents_departmentId_idx" ON "documents"("departmentId");

-- CreateIndex
CREATE INDEX "documents_documentTypeId_idx" ON "documents"("documentTypeId");

-- CreateIndex
CREATE INDEX "documents_ownerId_idx" ON "documents"("ownerId");

-- CreateIndex
CREATE INDEX "documents_processId_idx" ON "documents"("processId");

-- CreateIndex
CREATE INDEX "documents_responsibleId_idx" ON "documents"("responsibleId");

-- CreateIndex
CREATE INDEX "documents_createdById_idx" ON "documents"("createdById");

-- CreateIndex
CREATE INDEX "documents_updatedById_idx" ON "documents"("updatedById");
