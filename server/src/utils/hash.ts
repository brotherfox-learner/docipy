import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function hashToken(token: string): string {
  // Simple SHA-256 hash for storing tokens (refresh, email verify, password reset)
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(token).digest('hex')
}
