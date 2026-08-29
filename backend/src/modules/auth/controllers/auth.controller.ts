import { Controller, Post, Body, HttpCode, HttpStatus, Req, BadRequestException, UseGuards, UseInterceptors, Get } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { MfaService } from '../services/mfa.service';
import { Public } from '../decorators/auth.decorators';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../guards/auth.guard';
import { CookieInterceptor } from '../interceptors/cookie.interceptor';

interface AuthRequest extends Request {
  user?: { sub: string; org: string };
  organizationId?: string;
  userId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(CookieInterceptor)
  async login(@Body() body: { email: string; password: string }, @Req() req: AuthRequest) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.login(body.email, body.password, ipAddress, userAgent);
  }

  @Post('mfa/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async verifyMfa(@Body() body: { sessionId: string; mfaCode: string }, @Req() req: AuthRequest) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.verifyMfa(body.sessionId, body.mfaCode, ipAddress, userAgent);
  }

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  async setupMfa(@Req() req: AuthRequest) {
    const userId = req.user?.sub;
    const organizationId = req.organizationId;
    if (!userId || !organizationId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.mfaService.setupMfa(userId, organizationId);
  }

  @Post('mfa/verify-setup')
  @HttpCode(HttpStatus.OK)
  async verifyMfaSetup(@Body() body: { code: string }, @Req() req: AuthRequest) {
    const userId = req.user?.sub;
    const organizationId = req.organizationId;
    if (!userId || !organizationId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.mfaService.verifyMfaSetup(userId, organizationId, body.code);
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  async disableMfa(@Body() body: { currentPassword: string; mfaCode?: string }, @Req() req: AuthRequest) {
    const userId = req.user?.sub;
    const organizationId = req.organizationId;
    if (!userId || !organizationId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.mfaService.disableMfa(userId, organizationId, body.currentPassword, body.mfaCode);
  }

  @Get('mfa/status')
  async getMfaStatus(@Req() req: AuthRequest) {
    const userId = req.user?.sub;
    const organizationId = req.organizationId;
    if (!userId || !organizationId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.mfaService.getMfaStatus(userId, organizationId);
  }

  @Post('mfa/recovery-codes/generate')
  @HttpCode(HttpStatus.OK)
  async generateRecoveryCodes(@Req() req: AuthRequest) {
    const userId = req.user?.sub;
    const organizationId = req.organizationId;
    if (!userId || !organizationId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.mfaService.generateRecoveryCodes(userId, organizationId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async changePassword(@Body() body: { currentPassword: string; newPassword: string }, @Req() req: AuthRequest) {
    const userId = req.user?.sub;
    const organizationId = req.organizationId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    if (!userId || !organizationId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword, ipAddress, userAgent);
  }

  @Post('password-recovery/request')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async requestPasswordRecovery(@Body() body: { email: string }, @Req() req: AuthRequest) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.requestPasswordReset(body.email, ipAddress, userAgent);
  }

  @Post('password-recovery/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async resetPassword(@Body() body: { token: string; newPassword: string }, @Req() req: AuthRequest) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.resetPassword(body.token, body.newPassword, ipAddress, userAgent);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(CookieInterceptor)
  async refresh(@Req() req: AuthRequest) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('InvalidToken');
    }
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.authService.refresh(refreshToken, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: AuthRequest) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      await this.authService.logout(refreshToken, ipAddress, userAgent);
    }
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@Req() req: AuthRequest) {
    const user = req.user;
    if (user) {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      await this.authService.logoutAll(user.sub, ipAddress, userAgent);
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthRequest) {
    const userId = req.user?.sub;
    const organizationId = req.organizationId;
    if (!userId || !organizationId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.authService.getMe(userId, organizationId);
  }
}
