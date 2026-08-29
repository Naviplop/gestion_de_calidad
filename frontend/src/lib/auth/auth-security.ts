import { authApiClient } from './auth.service';
import { securityEventLogger } from './security-events';
import type { LoginResponse, RefreshResponse, MfaSetupResponse, MfaStatusResponse, MfaVerifySetupResponse, MfaDisableResponse, MfaRecoveryCodesResponse, ChangePasswordResponse, PasswordRecoveryRequestResponse, PasswordRecoveryResetResponse } from './auth.service';

export class AuthApiClientWithSecurityEvents {
  private sessionId: string | null = null;

  setAccessToken(token: string | null) {
    authApiClient.setAccessToken(token);
  }

  setSessionId(sessionId: string | null) {
    this.sessionId = sessionId;
  }

  private logSecurityEvent(type: string, details?: Record<string, unknown>) {
    securityEventLogger.log({
      type,
      sessionId: this.sessionId || undefined,
      details,
    });
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await authApiClient.login(email, password);
      this.setSessionId(response.user.id);
      this.logSecurityEvent('AUTH_LOGIN_SUCCESS', {
        email: this.maskEmail(email),
      });
      return response;
    } catch (error) {
      this.logSecurityEvent('AUTH_LOGIN_FAILURE', {
        email: this.maskEmail(email),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async verifyMfa(sessionId: string, mfaCode: string): Promise<LoginResponse> {
    return authApiClient.verifyMfa(sessionId, mfaCode);
  }

  async refresh(): Promise<RefreshResponse> {
    try {
      const response = await authApiClient.refresh();
      this.logSecurityEvent('AUTH_LOGIN_SUCCESS', { action: 'refresh' });
      return response;
    } catch (error) {
      this.logSecurityEvent('AUTH_LOGIN_FAILURE', { action: 'refresh' });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await authApiClient.logout();
      this.logSecurityEvent('AUTH_LOGOUT');
    } catch (error) {
      this.logSecurityEvent('AUTH_LOGOUT', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.setSessionId(null);
    }
  }

  async getCurrentUser(): Promise<LoginResponse> {
    try {
      return await authApiClient.getCurrentUser();
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        this.logSecurityEvent('AUTH_UNAUTHORIZED');
      } else if (error instanceof Error && error.message === 'FORBIDDEN') {
        this.logSecurityEvent('AUTH_FORBIDDEN');
      }
      throw error;
    }
  }

  async setupMfa(): Promise<MfaSetupResponse> {
    return authApiClient.setupMfa();
  }

  async verifyMfaSetup(code: string): Promise<MfaVerifySetupResponse> {
    return authApiClient.verifyMfaSetup(code);
  }

  async disableMfa(currentPassword: string, mfaCode?: string): Promise<MfaDisableResponse> {
    return authApiClient.disableMfa(currentPassword, mfaCode);
  }

  async getMfaStatus(): Promise<MfaStatusResponse> {
    return authApiClient.getMfaStatus();
  }

  async generateRecoveryCodes(): Promise<MfaRecoveryCodesResponse> {
    return authApiClient.generateRecoveryCodes();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    return authApiClient.changePassword(currentPassword, newPassword);
  }

  async requestPasswordReset(email: string): Promise<PasswordRecoveryRequestResponse> {
    return authApiClient.requestPasswordReset(email);
  }

  async resetPassword(token: string, newPassword: string): Promise<PasswordRecoveryResetResponse> {
    return authApiClient.resetPassword(token, newPassword);
  }

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return email;
    }
    const maskedLocal = localPart.length > 2 ? `${localPart.slice(0, 2)}***` : '***';
    return `${maskedLocal}@${domain}`;
  }
}

export const authApiClientWithEvents = new AuthApiClientWithSecurityEvents();
