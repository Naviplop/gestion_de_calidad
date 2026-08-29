import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { PasswordService } from '../services/password.service';
import { PasswordPolicyService } from '../services/password-policy.service';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly passwordPolicyService: PasswordPolicyService,
  ) {}

  async validateCredentials(
    email: string,
    password: string,
    ipAddress?: string,
  ): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();

    const user = await this.userRepository.findByEmail('', normalizedEmail);
    if (!user) {
      return null;
    }

    if (!user.isAvailableForLogin) {
      if (user.isAccountLocked) {
        this.logger.warn('Login attempt on locked account', {
          userId: user.id,
          email: normalizedEmail,
        });
      } else if (!user.isActive) {
        this.logger.warn('Login attempt on inactive account', {
          userId: user.id,
          email: normalizedEmail,
        });
      }
      return null;
    }

    const isValidPassword = await this.passwordService.verify(password, user.passwordHash);
    if (!isValidPassword) {
      await this.handleFailedLogin(user.id, user.organizationId);
      return null;
    }

    await this.userRepository.resetFailedLoginAttempts(user.id);
    await this.userRepository.updateLastLogin(user.id, ipAddress ?? null);

    return user;
  }

  async validatePasswordPolicy(password: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.passwordPolicyService.validate(password);
  }

  private async handleFailedLogin(userId: string, organizationId: string): Promise<void> {
    await this.userRepository.incrementFailedLoginAttempts(userId);

    const updatedUser = await this.userRepository.findById(userId, organizationId);
    if (!updatedUser) return;

    if (updatedUser.failedLoginAttempts >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await this.userRepository.lock(userId, lockUntil);

      this.logger.warn('Account locked due to failed login attempts', {
        userId: updatedUser.id,
        lockedUntil: lockUntil.toISOString(),
      });
    }
  }
}
