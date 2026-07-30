import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

/** Random URL safe token handed to the user (reset links, invites). */
export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Only the hash of a token is ever stored, so a database leak is not enough to use it. */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
