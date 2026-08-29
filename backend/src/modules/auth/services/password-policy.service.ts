export class PasswordPolicyService {
  validate(plainPassword: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plainPassword || plainPassword.length < 12) {
      errors.push('Password must be at least 12 characters long.');
    }

    if (!/[a-z]/.test(plainPassword)) {
      errors.push('Password must contain lowercase letters.');
    }

    if (!/[A-Z]/.test(plainPassword)) {
      errors.push('Password must contain uppercase letters.');
    }

    if (!/[0-9]/.test(plainPassword)) {
      errors.push('Password must contain numbers.');
    }

    if (!/[^a-zA-Z0-9]/.test(plainPassword)) {
      errors.push('Password must contain symbols.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
