// electron/services/passwordHasher.ts
import bcrypt from 'bcryptjs';

const DEFAULT_SALT_ROUNDS = 12;

function getSaltRounds(): number {
  const raw = process.env.BCRYPT_SALT_ROUNDS;
  const parsed = raw ? Number(raw) : DEFAULT_SALT_ROUNDS;

  if (!Number.isInteger(parsed) || parsed < 4 || parsed > 15) {
    return DEFAULT_SALT_ROUNDS;
  }

  return parsed;
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password is required');
  }

  return bcrypt.hash(password, getSaltRounds());
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  return bcrypt.compare(password, hash);
}
