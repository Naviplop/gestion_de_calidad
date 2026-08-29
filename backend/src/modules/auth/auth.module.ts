import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthenticationService } from './services/authentication.service';
import { JwtTokenService } from './services/jwt-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { PasswordService } from './services/password.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { AuthorizationEngine } from './services/authorization-engine.service';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { AuthGuard } from './guards/auth.guard';
import { MfaService } from './services/mfa.service';
import { CookieInterceptor } from './interceptors/cookie.interceptor';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

const THROTTLE_TTL = parseInt(process.env.AUTH_THROTTLE_TTL || '60', 10);
const THROTTLE_LIMIT = parseInt(process.env.AUTH_THROTTLE_LIMIT || '5', 10);

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        issuer: 'QMS Platform',
        audience: 'QMS API',
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: THROTTLE_TTL,
      limit: THROTTLE_LIMIT,
    }]),
    SecurityEventsModule,
    AuditLogsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthenticationService,
    JwtTokenService,
    RefreshTokenService,
    PasswordService,
    PasswordPolicyService,
    AuthorizationEngine,
    UserRepository,
    RoleRepository,
    PermissionRepository,
    AuthGuard,
    CookieInterceptor,
    MfaService,
  ],
  exports: [
    AuthGuard,
    AuthorizationEngine,
    UserRepository,
    RoleRepository,
    PermissionRepository,
    JwtTokenService,
    RefreshTokenService,
    PasswordService,
    PasswordPolicyService,
    AuthenticationService,
  ],
})
export class AuthModule {}
