import { PasswordPolicyService } from '../services/password-policy.service';

describe('PasswordPolicyService', () => {
  const service = new PasswordPolicyService();

  it('should reject short passwords', () => {
    const result = service.validate('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject passwords without uppercase', () => {
    const result = service.validate('longpassword123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain uppercase letters.');
  });

  it('should reject passwords without lowercase', () => {
    const result = service.validate('LONGPASSWORD123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain lowercase letters.');
  });

  it('should reject passwords without numbers', () => {
    const result = service.validate('LongPassword!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain numbers.');
  });

  it('should reject passwords without symbols', () => {
    const result = service.validate('LongPassword123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain symbols.');
  });

  it('should accept valid passwords', () => {
    const result = service.validate('ValidPass123!');
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
