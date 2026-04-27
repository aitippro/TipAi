import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Async password hashing (for API routes)
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Sync password hashing (for seed scripts)
 */
export function hashPasswordSync(plainPassword: string): string {
  return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
}

/**
 * Async password verification
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Sync password verification
 */
export function verifyPasswordSync(
  plainPassword: string,
  hashedPassword: string,
): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}
