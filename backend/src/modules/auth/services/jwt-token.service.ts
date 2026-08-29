import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AccessTokenPayload {
  sub: string;
  org: string;
  roles: string[];
  permissionsHash: string;
  sid?: string;
}

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
      issuer: 'QMS Platform',
      audience: 'QMS API',
    });
  }

  async validateAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
        issuer: 'QMS Platform',
        audience: 'QMS API',
      });

      return payload as AccessTokenPayload;
    } catch {
      return null;
    }
  }
}
