export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mfaEnabled: boolean;
  tenant: AuthTenant;
  roles: Array<{
    id: string;
    name: string;
  }>;
}

export interface AuthTenant {
  organizationId: string;
  name: string;
  logoUrl?: string | null;
}

export interface AuthRole {
  id: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  sessionId: string;
  refreshToken: string;
  mfaRequired?: boolean;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  mfaSessionId: string | null;
}
