import { PasswordService } from '../services/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();
  const plainPassword = 'TestPass123!';

  it('should hash a password', async () => {
    const hash = await service.hash(plainPassword);
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
    expect(hash).not.toBe(plainPassword);
  });

  it('should verify a correct password', async () => {
    const hash = await service.hash(plainPassword);
    const result = await service.verify(plainPassword, hash);
    expect(result).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await service.hash(plainPassword);
    const result = await service.verify('WrongPass123!', hash);
    expect(result).toBe(false);
  });

  it('should not store plaintext password', async () => {
    const hash = await service.hash(plainPassword);
    expect(hash).not.toContain(plainPassword);
  });

  it('should detect rehash when options differ', async () => {
    const hash = await service.hash(plainPassword, { timeCost: 3 });
    const needsRehash = await service.needsRehash(hash, { timeCost: 5 });
    expect(needsRehash).toBe(true);
  });

  it('should not require rehash with same options', async () => {
    const hash = await service.hash(plainPassword, { timeCost: 3 });
    const needsRehash = await service.needsRehash(hash, { timeCost: 3 });
    expect(needsRehash).toBe(false);
  });
});
