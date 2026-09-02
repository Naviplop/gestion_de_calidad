const API_BASE_URL = '/api/v1';

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  sessionId: string;
  refreshToken: string;
  mfaRequired?: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    mfaEnabled: boolean;
    tenant: {
      organizationId: string;
      name: string;
    };
    roles: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends UserListItem {
  roles: Array<{
    id: string;
    name: string;
    permissions: Array<{ resource: string; action: string }>;
  }>;
}

export interface UserPermission {
  resource: string;
  action: string;
  description?: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  locale: string;
  logoUrl: string | null;
  primaryColor: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettingResponse {
  key: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  parentDepartmentId: string | null;
  parentDepartment?: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentListItem {
  id: string;
  name: string;
  description: string | null;
  parentDepartmentId: string | null;
  parentDepartmentName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Process {
  id: string;
  organizationId: string;
  areaId: string | null;
  area?: { id: string; name: string } | null;
  parentProcessId: string | null;
  parentProcess?: { id: string; name: string } | null;
  code: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  owner?: { id: string; firstName: string; lastName: string } | null;
  processType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  areaId: string | null;
  areaName: string | null;
  parentProcessId: string | null;
  parentProcessName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  processType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Standard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  version: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StandardListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  version: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StandardRequirement {
  id: string;
  standardId: string;
  code: string;
  title: string;
  description: string | null;
  clause: string | null;
  parentRequirementId: string | null;
  createdAt: string;
}

export interface StandardRequirementListItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  clause: string | null;
  parentRequirementId: string | null;
  createdAt: string;
}

export interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Document {
  id: string;
  organizationId: string;
  documentTypeId: string;
  documentType?: { id: string; name: string } | null;
  code: string;
  title: string;
  description: string | null;
  processId: string | null;
  process?: { id: string; name: string } | null;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  ownerId: string;
  owner?: { id: string; firstName: string; lastName: string } | null;
  responsibleId: string;
  responsible?: { id: string; firstName: string; lastName: string } | null;
  classification: string;
  confidentiality: string;
  status: string;
  currentVersionId: string | null;
  currentVersion?: {
    id: string;
    versionMajor: number;
    versionMinor: number;
    versionLabel: string;
    status: string;
    createdAt: string;
  } | null;
  issueDate: string | null;
  reviewDate: string | null;
  nextReviewDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  documentTypeId: string;
  documentType?: { id: string; name: string } | null;
  processId: string | null;
  process?: { id: string; name: string } | null;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  ownerId: string;
  owner?: { id: string; firstName: string; lastName: string } | null;
  responsibleId: string;
  responsible?: { id: string; firstName: string; lastName: string } | null;
  classification: string;
  confidentiality: string;
  status: string;
  currentVersionId: string | null;
  currentVersion?: {
    id: string;
    versionMajor: number;
    versionMinor: number;
    versionLabel: string;
    status: string;
    createdAt: string;
  } | null;
  issueDate: string | null;
  reviewDate: string | null;
  nextReviewDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  organizationId: string;
  versionMajor: number;
  versionMinor: number;
  versionLabel: string;
  fileAssetId: string;
  fileHash: string;
  changeReason: string;
  status: string;
  createdById: string;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  approvedById: string | null;
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentReviewer {
  id: string;
  documentVersionId: string;
  organizationId: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string } | null;
  status: string;
  completedAt: string | null;
  comment: string | null;
  createdAt: string;
}

export interface DocumentApproval {
  id: string;
  documentVersionId: string;
  organizationId: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string } | null;
  status: string;
  comment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface DocumentDistribution {
  id: string;
  documentId: string;
  documentVersionId: string;
  organizationId: string;
  assignedToUserId: string | null;
  assignedToUser?: { id: string; firstName: string; lastName: string } | null;
  assignedToDepartmentId: string | null;
  assignedToDepartment?: { id: string; name: string } | null;
  assignedToRoleId: string | null;
  status: string;
  createdAt: string;
}

export interface DocumentAcknowledgement {
  id: string;
  documentDistributionId: string;
  organizationId: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string } | null;
  ipAddress: string | null;
  userAgent: string | null;
  acknowledgedAt: string;
}

export interface FileAssetMetadata {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: bigint;
  sha256Hash: string;
  storageProvider: string;
  objectKey: string;
  createdAt: string;
}

export class AuthApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private getCsrfToken(): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const match = document.cookie.match(/(?:^|; )x-csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    });

    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const method = options.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new Error('FORBIDDEN');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'Unknown error' },
      }));
      const message = typeof error.error?.message === 'string'
        ? error.error.message
        : error.error?.message?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json() as Promise<T>;
  }

  private async requestWithIfMatch<T>(endpoint: string, ifMatch: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'If-Match': ifMatch,
      ...(options.headers as Record<string, string>),
    });

    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const method = options.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new Error('FORBIDDEN');
    }

    if (response.status === 409) {
      const error = await response.json().catch(() => ({
        error: { message: 'Conflict' },
      }));
      const message = typeof error.error?.message === 'string'
        ? error.error.message
        : error.error?.message?.message || 'CONCURRENT_UPDATE';
      throw new Error(message);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'Unknown error' },
      }));
      const message = typeof error.error?.message === 'string'
        ? error.error.message
        : error.error?.message?.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json() as Promise<T>;
  }

  async login(email: string, password: string): Promise<{ data: LoginResponse }> {
    return this.request<{ data: LoginResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refresh(): Promise<{ data: RefreshResponse }> {
    return this.request<{ data: RefreshResponse }>('/auth/refresh', {
      method: 'POST',
    });
  }

  async logout(): Promise<void> {
    await this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  async verifyMfa(sessionId: string, mfaCode: string): Promise<{ data: LoginResponse }> {
    return this.request<{ data: LoginResponse }>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, mfaCode }),
    });
  }

  async setupMfa(): Promise<{ data: MfaSetupResponse }> {
    return this.request<{ data: MfaSetupResponse }>('/auth/mfa/setup', {
      method: 'POST',
    });
  }

  async verifyMfaSetup(code: string): Promise<{ data: MfaVerifySetupResponse }> {
    return this.request<{ data: MfaVerifySetupResponse }>('/auth/mfa/verify-setup', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disableMfa(currentPassword: string, mfaCode?: string): Promise<{ data: MfaDisableResponse }> {
    return this.request<{ data: MfaDisableResponse }>('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, mfaCode }),
    });
  }

  async getMfaStatus(): Promise<{ data: MfaStatusResponse }> {
    return this.request<{ data: MfaStatusResponse }>('/auth/mfa/status');
  }

  async generateRecoveryCodes(): Promise<{ data: MfaRecoveryCodesResponse }> {
    return this.request<{ data: MfaRecoveryCodesResponse }>('/auth/mfa/recovery-codes/generate', {
      method: 'POST',
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ data: ChangePasswordResponse }> {
    return this.request<{ data: ChangePasswordResponse }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async requestPasswordReset(email: string): Promise<{ data: PasswordRecoveryRequestResponse }> {
    return this.request<{ data: PasswordRecoveryRequestResponse }>('/auth/password-recovery/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ data: PasswordRecoveryResetResponse }> {
    return this.request<{ data: PasswordRecoveryResetResponse }>('/auth/password-recovery/reset', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async listUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    roleId?: string;
    departmentId?: string;
    isActive?: boolean;
  }): Promise<{ data: UserListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);
    if (params.roleId) queryParams.set('roleId', params.roleId);
    if (params.departmentId) queryParams.set('departmentId', params.departmentId);
    if (params.isActive !== undefined) queryParams.set('isActive', String(params.isActive));

    const query = queryParams.toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    departmentId?: string;
    roleIds: string[];
    mfaEnabled: boolean;
  }): Promise<{ data: UserDetail }> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUser(id: string): Promise<{ data: UserDetail }> {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: string, data: {
    firstName?: string;
    lastName?: string;
    departmentId?: string | null;
    isActive?: boolean;
  }, ifMatch?: string): Promise<{ data: UserDetail }> {
    return this.requestWithIfMatch(`/users/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async activateUser(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/users/${id}/activate`, ifMatch || '', { method: 'POST' });
  }

  async deactivateUser(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/users/${id}/deactivate`, ifMatch || '', { method: 'POST' });
  }

  async assignRoles(id: string, roleIds: string[], ifMatch?: string): Promise<{ data: UserDetail }> {
    return this.requestWithIfMatch(`/users/${id}/roles`, ifMatch || '', {
      method: 'POST',
      body: JSON.stringify({ roleIds }),
    });
  }

  async getUserPermissions(id: string): Promise<{ data: { permissions: UserPermission[] } }> {
    return this.request(`/users/${id}/permissions`);
  }

  async getOrganization(): Promise<{ data: OrganizationResponse }> {
    return this.request('/organization');
  }

  async updateOrganization(data: {
    name?: string;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    timezone?: string;
    locale?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  }, ifMatch?: string): Promise<{ data: OrganizationResponse }> {
    return this.requestWithIfMatch('/organization', ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listSettings(): Promise<{ data: OrganizationSettingResponse[] }> {
    return this.request('/organization/settings');
  }

  async updateSettings(data: Record<string, unknown>, ifMatch?: string): Promise<{ data: OrganizationSettingResponse[] }> {
    return this.requestWithIfMatch('/organization/settings', ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listDepartments(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ data: DepartmentListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.request(`/departments${query ? `?${query}` : ''}`);
  }

  async createDepartment(data: {
    name: string;
    description?: string;
    parentDepartmentId?: string;
  }): Promise<{ data: Department }> {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDepartment(id: string): Promise<{ data: Department }> {
    return this.request(`/departments/${id}`);
  }

  async updateDepartment(id: string, data: {
    name?: string;
    description?: string;
    parentDepartmentId?: string;
    isActive?: boolean;
  }, ifMatch?: string): Promise<{ data: Department }> {
    return this.requestWithIfMatch(`/departments/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deactivateDepartment(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/departments/${id}/deactivate`, ifMatch || '', { method: 'POST' });
  }

  async listProcesses(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ data: ProcessListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.request(`/processes${query ? `?${query}` : ''}`);
  }

  async createProcess(data: {
    code: string;
    name: string;
    description?: string;
    areaId?: string;
    parentProcessId?: string;
    ownerId?: string;
    processType?: string;
  }): Promise<{ data: Process }> {
    return this.request('/processes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProcess(id: string): Promise<{ data: Process }> {
    return this.request(`/processes/${id}`);
  }

  async updateProcess(id: string, data: {
    code?: string;
    name?: string;
    description?: string;
    areaId?: string;
    parentProcessId?: string;
    ownerId?: string;
    processType?: string;
    isActive?: boolean;
  }, ifMatch?: string): Promise<{ data: Process }> {
    return this.requestWithIfMatch(`/processes/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deactivateProcess(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/processes/${id}/deactivate`, ifMatch || '', { method: 'POST' });
  }

  async listStandards(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ data: StandardListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.request(`/standards${query ? `?${query}` : ''}`);
  }

  async getStandard(id: string): Promise<{ data: Standard }> {
    return this.request(`/standards/${id}`);
  }

  async getStandardRequirements(standardId: string, params: {
    page?: number;
    pageSize?: number;
    parentId?: string;
    search?: string;
  }): Promise<{ data: StandardRequirementListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.parentId) queryParams.set('parentId', params.parentId);
    if (params.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    return this.request(`/standards/${standardId}/requirements${query ? `?${query}` : ''}`);
  }

  async listDocuments(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    documentTypeId?: string;
    processId?: string;
    departmentId?: string;
    ownerId?: string;
    classification?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: DocumentListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);
    if (params.status) queryParams.set('status', params.status);
    if (params.documentTypeId) queryParams.set('documentTypeId', params.documentTypeId);
    if (params.processId) queryParams.set('processId', params.processId);
    if (params.departmentId) queryParams.set('departmentId', params.departmentId);
    if (params.ownerId) queryParams.set('ownerId', params.ownerId);
    if (params.classification) queryParams.set('classification', params.classification);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

    const query = queryParams.toString();
    return this.request(`/documents${query ? `?${query}` : ''}`);
  }

  async createDocument(data: {
    code: string;
    title: string;
    description?: string;
    documentTypeId: string;
    processId?: string | null;
    departmentId?: string | null;
    ownerId: string;
    responsibleId: string;
    classification: string;
    confidentiality: string;
    issueDate?: string;
    reviewDate?: string;
    nextReviewDate?: string;
  }): Promise<{ data: Document }> {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDocument(id: string): Promise<{ data: Document }> {
    return this.request(`/documents/${id}`);
  }

  async updateDocument(id: string, data: {
    title?: string;
    description?: string;
    processId?: string | null;
    departmentId?: string | null;
    ownerId?: string;
    responsibleId?: string;
    classification?: string;
    confidentiality?: string;
    isActive?: boolean;
    nextReviewDate?: string | null;
  }, ifMatch?: string): Promise<{ data: Document }> {
    return this.requestWithIfMatch(`/documents/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async submitDocument(id: string, changeReason?: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/${id}/submit`, ifMatch || '', {
      method: 'POST',
      body: JSON.stringify({ changeReason }),
    });
  }

  async submitForApprovalDocument(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/${id}/submit-for-approval`, ifMatch || '', { method: 'POST' });
  }

  async approveDocument(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/${id}/approve`, ifMatch || '', { method: 'POST' });
  }

  async rejectDocument(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/${id}/reject`, ifMatch || '', { method: 'POST' });
  }

  async publishDocument(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/${id}/publish`, ifMatch || '', { method: 'POST' });
  }

  async obsoleteDocument(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/${id}/obsolete`, ifMatch || '', { method: 'POST' });
  }

  async cancelDocument(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/${id}/cancel`, ifMatch || '', { method: 'POST' });
  }

  async createDocumentVersion(documentId: string, data: {
    versionMajor: number;
    versionMinor: number;
    versionLabel?: string;
    fileAssetId: string;
    fileHash: string;
    changeReason: string;
  }): Promise<{ data: DocumentVersion }> {
    return this.request(`/documents/${documentId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listDocumentVersions(documentId: string, params: {
    page?: number;
    pageSize?: number;
  }): Promise<{ data: DocumentVersion[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));

    const query = queryParams.toString();
    return this.request(`/documents/${documentId}/versions${query ? `?${query}` : ''}`);
  }

  async submitVersionForReview(versionId: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/versions/${versionId}/submit-for-review`, ifMatch || '', { method: 'POST' });
  }

  async approveVersion(versionId: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/versions/${versionId}/approve`, ifMatch || '', { method: 'POST' });
  }

  async rejectVersion(versionId: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/versions/${versionId}/reject`, ifMatch || '', { method: 'POST' });
  }

  async publishVersion(versionId: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/documents/versions/${versionId}/publish`, ifMatch || '', { method: 'POST' });
  }

  async distributeDocument(documentId: string, data: {
    documentVersionId: string;
    assignedToUserIds?: string[];
    assignedToDepartmentIds?: string[];
    assignedToRoleIds?: string[];
  }): Promise<{ data: DocumentDistribution[] }> {
    return this.request(`/documents/${documentId}/distribute`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listDocumentDistributions(documentId: string): Promise<{ data: DocumentDistribution[] }> {
    return this.request(`/documents/${documentId}/distributions`);
  }

  async acknowledgeDistribution(distributionId: string, data?: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ data: DocumentAcknowledgement }> {
    return this.request(`/documents/distributions/${distributionId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async uploadFileAsset(file: File): Promise<{ data: FileAssetMetadata }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/file-assets/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
      credentials: 'include',
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new Error('FORBIDDEN');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'Unknown error' },
      }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const json = (await response.json()) as { data?: FileAssetMetadata };
    if (json && typeof json === 'object' && 'data' in json && json.data) {
      return json as { data: FileAssetMetadata };
    }
    return json as { data: FileAssetMetadata };
  }

  async getFileAsset(id: string): Promise<{ data: FileAssetMetadata }> {
    return this.request(`/file-assets/${id}`);
  }

  async downloadFileAsset(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/file-assets/${id}/download`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      credentials: 'include',
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new Error('FORBIDDEN');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'Unknown error' },
      }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.blob();
  }

  // Audit Programs
  async listAuditPrograms(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    responsibleId?: string;
  }): Promise<{ data: AuditProgramListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);
    if (params.status) queryParams.set('status', params.status);
    if (params.responsibleId) queryParams.set('responsibleId', params.responsibleId);
    const query = queryParams.toString();
    return this.request(`/audit-programs${query ? `?${query}` : ''}`);
  }

  async createAuditProgram(data: {
    name: string;
    description?: string;
    periodStart: string;
    periodEnd: string;
    responsibleId?: string;
  }): Promise<{ data: AuditProgram }> {
    return this.request('/audit-programs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAuditProgram(id: string): Promise<{ data: AuditProgram }> {
    return this.request(`/audit-programs/${id}`);
  }

  async updateAuditProgram(id: string, data: {
    name?: string;
    description?: string;
    periodStart?: string;
    periodEnd?: string;
    responsibleId?: string;
    status?: string;
  }, ifMatch?: string): Promise<{ data: AuditProgram }> {
    return this.requestWithIfMatch(`/audit-programs/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Audits
  async listAudits(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    auditProgramId?: string;
    processId?: string;
    leadAuditorId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: AuditListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);
    if (params.status) queryParams.set('status', params.status);
    if (params.auditProgramId) queryParams.set('auditProgramId', params.auditProgramId);
    if (params.processId) queryParams.set('processId', params.processId);
    if (params.leadAuditorId) queryParams.set('leadAuditorId', params.leadAuditorId);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    const query = queryParams.toString();
    return this.request(`/audits${query ? `?${query}` : ''}`);
  }

  async createAudit(data: {
    auditProgramId?: string;
    processId?: string;
    leadAuditorId?: string;
    code: string;
    title: string;
    auditType?: string;
    plannedStart?: string;
    plannedEnd?: string;
    scope?: string;
    objective?: string;
  }): Promise<{ data: Audit }> {
    return this.request('/audits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAudit(id: string): Promise<{ data: Audit }> {
    return this.request(`/audits/${id}`);
  }

  async updateAudit(id: string, data: {
    auditProgramId?: string;
    processId?: string;
    leadAuditorId?: string;
    title?: string;
    auditType?: string;
    plannedStart?: string;
    plannedEnd?: string;
    actualStart?: string;
    actualEnd?: string;
    status?: string;
    scope?: string;
    objective?: string;
  }, ifMatch?: string): Promise<{ data: Audit }> {
    return this.requestWithIfMatch(`/audits/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async startAudit(id: string, actualStart: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/audits/${id}/start`, ifMatch || '', {
      method: 'POST',
      body: JSON.stringify({ actualStart }),
    });
  }

  async completeAudit(id: string, actualEnd: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/audits/${id}/complete`, ifMatch || '', {
      method: 'POST',
      body: JSON.stringify({ actualEnd }),
    });
  }

  async cancelAudit(id: string, reason?: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/audits/${id}/cancel`, ifMatch || '', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Checklists
  async listChecklists(auditId: string): Promise<{ data: AuditChecklist[] }> {
    return this.request(`/audits/${auditId}/checklists`);
  }

  async createChecklist(auditId: string, data: { name: string }): Promise<{ data: AuditChecklist }> {
    return this.request(`/audits/${auditId}/checklists`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChecklist(id: string): Promise<{ data: AuditChecklist }> {
    return this.request(`/checklists/${id}`);
  }

  async createChecklistItem(checklistId: string, data: {
    requirementId?: string;
    question: string;
    sortOrder?: number;
  }): Promise<{ data: AuditChecklistItem }> {
    return this.request(`/checklists/${checklistId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChecklistItem(id: string, data: {
    response?: string;
    evidence?: string;
    comments?: string;
  }, ifMatch?: string): Promise<{ data: AuditChecklistItem }> {
    return this.requestWithIfMatch(`/checklists/items/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Findings
  async listFindings(auditId: string, params: {
    page?: number;
    pageSize?: number;
    findingType?: string;
    severity?: string;
    status?: string;
    requirementId?: string;
  }): Promise<{ data: AuditFindingListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.findingType) queryParams.set('findingType', params.findingType);
    if (params.severity) queryParams.set('severity', params.severity);
    if (params.status) queryParams.set('status', params.status);
    if (params.requirementId) queryParams.set('requirementId', params.requirementId);
    const query = queryParams.toString();
    return this.request(`/audits/${auditId}/findings${query ? `?${query}` : ''}`);
  }

  async createFinding(auditId: string, data: {
    checklistItemId?: string;
    requirementId?: string;
    findingType: string;
    title: string;
    description: string;
    evidence?: string;
    severity?: string;
  }): Promise<{ data: AuditFinding }> {
    return this.request(`/audits/${auditId}/findings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFinding(id: string, data: {
    title?: string;
    description?: string;
    evidence?: string;
    severity?: string;
    status?: string;
  }, ifMatch?: string): Promise<{ data: AuditFinding }> {
    return this.requestWithIfMatch(`/findings/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Nonconformities
  async listNonconformities(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    severity?: string;
    auditId?: string;
    findingId?: string;
    processId?: string;
    responsibleId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: Nonconformity[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);
    if (params.status) queryParams.set('status', params.status);
    if (params.severity) queryParams.set('severity', params.severity);
    if (params.auditId) queryParams.set('auditId', params.auditId);
    if (params.findingId) queryParams.set('findingId', params.findingId);
    if (params.processId) queryParams.set('processId', params.processId);
    if (params.responsibleId) queryParams.set('responsibleId', params.responsibleId);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    const query = queryParams.toString();
    return this.request(`/nonconformities${query ? `?${query}` : ''}`);
  }

  async createNonconformity(data: {
    auditId?: string;
    findingId?: string;
    processId?: string;
    code: string;
    title: string;
    description: string;
    severity: string;
    detectedAt: string;
    responsibleId?: string;
  }): Promise<{ data: Nonconformity }> {
    return this.request('/nonconformities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getNonconformity(id: string): Promise<{ data: Nonconformity }> {
    return this.request(`/nonconformities/${id}`);
  }

  async updateNonconformity(id: string, data: {
    code?: string;
    title?: string;
    description?: string;
    severity?: string;
    responsibleId?: string;
  }, ifMatch?: string): Promise<{ data: Nonconformity }> {
    return this.requestWithIfMatch(`/nonconformities/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async closeNonconformity(id: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/nonconformities/${id}/close`, ifMatch || '', { method: 'POST' });
  }

  async getRootCauseAnalysis(nonconformityId: string): Promise<{ data: RootCauseAnalysis }> {
    return this.request(`/nonconformities/${nonconformityId}/root-cause`);
  }

  async createRootCauseAnalysis(nonconformityId: string, data: {
    methodology: string;
    analysisData?: Record<string, unknown>;
    conclusion?: string;
  }): Promise<{ data: RootCauseAnalysis }> {
    return this.request(`/nonconformities/${nonconformityId}/root-cause`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRootCauseAnalysis(id: string, data: {
    methodology?: string;
    analysisData?: Record<string, unknown>;
    conclusion?: string;
  }, ifMatch?: string): Promise<{ data: RootCauseAnalysis }> {
    return this.requestWithIfMatch(`/nonconformities/root-cause/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listCorrectiveActions(nonconformityId: string, params: {
    page?: number;
    pageSize?: number;
    status?: string;
    responsibleId?: string;
  }): Promise<{ data: CorrectiveAction[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.status) queryParams.set('status', params.status);
    if (params.responsibleId) queryParams.set('responsibleId', params.responsibleId);
    const query = queryParams.toString();
    return this.request(`/nonconformities/${nonconformityId}/corrective-actions${query ? `?${query}` : ''}`);
  }

  async createCorrectiveAction(nonconformityId: string, data: {
    code: string;
    description: string;
    responsibleId: string;
    dueDate?: string;
    effectivenessRequired?: boolean;
  }): Promise<{ data: CorrectiveAction }> {
    return this.request(`/nonconformities/${nonconformityId}/corrective-actions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCorrectiveAction(id: string): Promise<{ data: CorrectiveAction }> {
    return this.request(`/corrective-actions/${id}`);
  }

  async updateCorrectiveAction(id: string, data: {
    code?: string;
    description?: string;
    responsibleId?: string;
    dueDate?: string;
    status?: string;
    effectivenessRequired?: boolean;
  }, ifMatch?: string): Promise<{ data: CorrectiveAction }> {
    return this.requestWithIfMatch(`/corrective-actions/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeCorrectiveAction(id: string, completedAt: string, ifMatch?: string): Promise<void> {
    await this.requestWithIfMatch(`/corrective-actions/${id}/complete`, ifMatch || '', {
      method: 'POST',
      body: JSON.stringify({ completedAt }),
    });
  }

  async verifyCorrectiveAction(id: string, data: {
    effectivenessStatus: string;
    evidence?: string;
    comments?: string;
  }): Promise<{ data: CorrectiveActionVerification }> {
    return this.request(`/corrective-actions/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listRisks(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    riskType?: string;
    processId?: string;
    ownerId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: RiskListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.search) queryParams.set('search', params.search);
    if (params.status) queryParams.set('status', params.status);
    if (params.riskType) queryParams.set('riskType', params.riskType);
    if (params.processId) queryParams.set('processId', params.processId);
    if (params.ownerId) queryParams.set('ownerId', params.ownerId);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    const query = queryParams.toString();
    return this.request(`/risks${query ? `?${query}` : ''}`);
  }

  async createRisk(data: {
    processId?: string;
    code: string;
    title: string;
    description: string;
    riskType: string;
    ownerId?: string;
  }): Promise<{ data: Risk }> {
    return this.request('/risks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRisk(id: string): Promise<{ data: Risk }> {
    return this.request(`/risks/${id}`);
  }

  async updateRisk(id: string, data: {
    code?: string;
    title?: string;
    description?: string;
    riskType?: string;
    ownerId?: string;
    processId?: string;
    status?: string;
  }, ifMatch?: string): Promise<{ data: Risk }> {
    return this.requestWithIfMatch(`/risks/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listRiskAssessments(riskId: string, params: {
    page?: number;
    pageSize?: number;
  }): Promise<{ data: RiskAssessment[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    const query = queryParams.toString();
    return this.request(`/risks/${riskId}/assessments${query ? `?${query}` : ''}`);
  }

  async createRiskAssessment(riskId: string, data: {
    probability: string;
    impact: string;
    calculationData?: Record<string, unknown>;
  }): Promise<{ data: RiskAssessment }> {
    return this.request(`/risks/${riskId}/assessments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listRiskControls(riskId: string, params: {
    page?: number;
    pageSize?: number;
  }): Promise<{ data: RiskControl[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    const query = queryParams.toString();
    return this.request(`/risks/${riskId}/controls${query ? `?${query}` : ''}`);
  }

  async createRiskControl(riskId: string, data: {
    description: string;
    controlType: string;
    effectiveness?: string;
  }): Promise<{ data: RiskControl }> {
    return this.request(`/risks/${riskId}/controls`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listRiskTreatments(riskId: string, params: {
    page?: number;
    pageSize?: number;
  }): Promise<{ data: RiskTreatment[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    const query = queryParams.toString();
    return this.request(`/risks/${riskId}/treatments${query ? `?${query}` : ''}`);
  }

  async createRiskTreatment(riskId: string, data: {
    strategy: string;
    description: string;
    responsibleId?: string;
    dueDate?: string;
  }): Promise<{ data: RiskTreatment }> {
    return this.request(`/risks/${riskId}/treatments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRiskTreatment(id: string, data: {
    strategy?: string;
    description?: string;
    responsibleId?: string;
    dueDate?: string;
    status?: string;
    completedAt?: string;
  }, ifMatch?: string): Promise<{ data: RiskTreatment }> {
    return this.requestWithIfMatch(`/risk-treatments/${id}`, ifMatch || '', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getDashboardSummary(): Promise<{ data: DashboardSummary }> {
    return this.request('/dashboard/summary');
  }

  async listAuditLogs(params: {
    page?: number;
    pageSize?: number;
    action?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    correlationId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: AuditLogListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.action) queryParams.set('action', params.action);
    if (params.entityType) queryParams.set('entityType', params.entityType);
    if (params.entityId) queryParams.set('entityId', params.entityId);
    if (params.actorId) queryParams.set('actorId', params.actorId);
    if (params.correlationId) queryParams.set('correlationId', params.correlationId);
    if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.set('dateTo', params.dateTo);

    const query = queryParams.toString();
    return this.request(`/audit-logs${query ? `?${query}` : ''}`);
  }

  async listSecurityEvents(params: {
    page?: number;
    pageSize?: number;
    eventType?: string;
    severity?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: SecurityEventListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.eventType) queryParams.set('eventType', params.eventType);
    if (params.severity) queryParams.set('severity', params.severity);
    if (params.actorId) queryParams.set('actorId', params.actorId);
    if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.set('dateTo', params.dateTo);

    const query = queryParams.toString();
    return this.request(`/security-events${query ? `?${query}` : ''}`);
  }
}

export interface AuditProgram {
  id: string;
  name: string;
  description: string | null;
  periodStart: string;
  periodEnd: string;
  responsibleId: string | null;
  responsible: { id: string; firstName: string; lastName: string } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditProgramListItem {
  id: string;
  name: string;
  description: string | null;
  periodStart: string;
  periodEnd: string;
  responsibleId: string | null;
  responsible: { id: string; firstName: string; lastName: string } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Audit {
  id: string;
  auditProgramId: string | null;
  processId: string | null;
  leadAuditorId: string | null;
  code: string;
  title: string;
  auditType: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  status: string;
  scope: string | null;
  objective: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditListItem {
  id: string;
  auditProgramId: string | null;
  processId: string | null;
  leadAuditorId: string | null;
  code: string;
  title: string;
  auditType: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  status: string;
  scope: string | null;
  objective: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditChecklist {
  id: string;
  auditId: string;
  name: string;
  createdAt: string;
  items: AuditChecklistItem[];
}

export interface AuditChecklistItem {
  id: string;
  requirementId: string | null;
  question: string;
  response: string | null;
  evidence: string | null;
  comments: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface AuditFinding {
  id: string;
  auditId: string;
  checklistItemId: string | null;
  requirementId: string | null;
  findingType: string;
  title: string;
  description: string;
  evidence: string | null;
  severity: string | null;
  identifiedById: string;
  identifiedBy: { id: string; firstName: string; lastName: string } | null;
  identifiedAt: string;
  status: string;
  createdAt: string;
}

export interface AuditFindingListItem {
  id: string;
  auditId: string;
  checklistItemId: string | null;
  requirementId: string | null;
  findingType: string;
  title: string;
  description: string;
  evidence: string | null;
  severity: string | null;
  identifiedById: string;
  identifiedBy: { id: string; firstName: string; lastName: string } | null;
  identifiedAt: string;
  status: string;
  createdAt: string;
}

export interface Nonconformity {
  id: string;
  auditId: string | null;
  findingId: string | null;
  processId: string | null;
  code: string;
  title: string;
  description: string;
  severity: string;
  detectedAt: string;
  responsibleId: string | null;
  responsible: { id: string; firstName: string; lastName: string } | null;
  status: string;
  closedAt: string | null;
  closedBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RootCauseAnalysis {
  id: string;
  nonconformityId: string;
  methodology: string;
  analysisData: Record<string, unknown>;
  conclusion: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectiveAction {
  id: string;
  nonconformityId: string;
  code: string;
  description: string;
  responsibleId: string;
  responsible: { id: string; firstName: string; lastName: string } | null;
  dueDate: string | null;
  completedAt: string | null;
  status: string;
  effectivenessRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectiveActionVerification {
  id: string;
  correctiveActionId: string;
  verifierId: string;
  effectivenessStatus: string;
  evidence: string | null;
  comments: string | null;
  verifiedAt: string;
}

export interface Risk {
  id: string;
  processId: string | null;
  code: string;
  title: string;
  description: string;
  riskType: string;
  ownerId: string | null;
  owner?: { id: string; firstName: string; lastName: string } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskListItem {
  id: string;
  processId: string | null;
  code: string;
  title: string;
  description: string;
  riskType: string;
  ownerId: string | null;
  owner: { id: string; firstName: string; lastName: string } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAssessment {
  id: string;
  riskId: string;
  probability: string;
  impact: string;
  score: string | null;
  calculationData: Record<string, unknown>;
  assessedById: string;
  assessedAt: string;
}

export interface RiskControl {
  id: string;
  riskId: string;
  userId: string;
  description: string;
  controlType: string;
  effectiveness: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RiskTreatment {
  id: string;
  riskId: string;
  strategy: string;
  description: string;
  responsibleId: string | null;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  documents: {
    total: number;
    draft: number;
    inReview: number;
    approved: number;
    published: number;
    obsolete: number;
  };
  audits: {
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  nonconformities: {
    open: number;
    closed: number;
    total: number;
  };
  correctiveActions: {
    open: number;
    inProgress: number;
    completed: number;
    verified: number;
    total: number;
  };
  risks: {
    identified: number;
    assessed: number;
    treatmentPlanned: number;
    underControl: number;
    closed: number;
    total: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    severity: string;
  }>;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface AuditLogListItem {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface SecurityEvent {
  id: string;
  organizationId: string;
  actorId: string | null;
  eventType: string;
  severity: string;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SecurityEventListItem {
  id: string;
  organizationId: string;
  actorId: string | null;
  eventType: string;
  severity: string;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MfaSetupResponse {
  secret: string;
  provisioningUri: string;
}

export interface MfaStatusResponse {
  enabled: boolean;
  recoveryCodesCount: number;
}

export interface MfaVerifySetupResponse {
  enabled: boolean;
}

export interface MfaDisableResponse {
  disabled: boolean;
}

export interface MfaRecoveryCodesResponse {
  codes: string[];
}

export interface ChangePasswordResponse {
  changed: boolean;
}

export interface PasswordRecoveryRequestResponse {
  message: string;
}

export interface PasswordRecoveryResetResponse {
  reset: boolean;
}

export const authApiClient = new AuthApiClient();
