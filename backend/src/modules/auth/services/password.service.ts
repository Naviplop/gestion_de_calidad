import * as argon2 from 'argon2';

export interface PasswordHashOptions {
  timeCost?: number;
  memoryCost?: number;
  parallelism?: number;
  hashLength?: number;
  saltLength?: number;
}

const DEFAULT_OPTIONS: Required<Omit<PasswordHashOptions, 'saltLength'>> = {
  timeCost: 3,
  memoryCost: 65536,
  parallelism: 4,
  hashLength: 32,
};

export class PasswordService {
  async hash(plainPassword: string, options?: PasswordHashOptions): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    return (argon2 as unknown as { hash: (password: string, options: Record<string, unknown>) => Promise<string> }).hash(
      plainPassword,
      {
        type: argon2.argon2id,
        timeCost: opts.timeCost,
        memoryCost: opts.memoryCost,
        parallelism: opts.parallelism,
        hashLength: opts.hashLength,
        saltLength: opts.saltLength,
      }
    );
  }

  async verify(plainPassword: string, hash: string): Promise<boolean> {
    try {
      return argon2.verify(hash, plainPassword);
    } catch {
      return false;
    }
  }

  async needsRehash(hash: string, options?: PasswordHashOptions): Promise<boolean> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    try {
      const parsed = this.parseHash(hash);
      if (!parsed) return true;
      if (parsed.timeCost !== opts.timeCost) return true;
      if (parsed.memoryCost !== opts.memoryCost) return true;
      if (parsed.parallelism !== opts.parallelism) return true;
      return false;
    } catch {
      return true;
    }
  }

  private parseHash(hash: string): { timeCost: number; memoryCost: number; parallelism: number; hashLength: number } | null {
    const match = hash.match(
      /\$argon2id\$v=(\d+)\$m=(\d+),p=(\d+),t=(\d+)\$([^\$]+)\$([^\$]+)/
    );
    if (!match) return null;
    return {
      timeCost: Number(match[4]),
      memoryCost: Number(match[2]),
      parallelism: Number(match[3]),
      hashLength: Number(match[6]?.length || 0),
    };
  }
}
