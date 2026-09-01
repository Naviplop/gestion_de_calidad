import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;
    const refreshToken = request.cookies?.refreshToken;

    let accessTokenPayload = null;

    if (authorizationHeader?.startsWith('Bearer ')) {
      const token = authorizationHeader.substring(7);
      accessTokenPayload = await this.jwtTokenService.validateAccessToken(token);
    } else if (refreshToken) {
      const tokenInfo = await this.refreshTokenService.validateRefreshToken(refreshToken);
      if (tokenInfo) {
        accessTokenPayload = {
          sub: tokenInfo.userId,
          org: tokenInfo.organizationId,
          roles: [],
          permissionsHash: '',
        };
      }
    }

    if (!accessTokenPayload) {
      throw new UnauthorizedException('Unauthorized');
    }

    request.user = accessTokenPayload;
    request.organizationId = accessTokenPayload.org;
    request.userId = accessTokenPayload.sub;

    return true;
  }
}
