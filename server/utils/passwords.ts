import bcrypt from "bcryptjs";
import { z } from "zod";

export const BCRYPT_COST = 12;

// Small inline denylist of the most common passwords. Kept short on purpose:
// full zxcvbn adds ~800KB to the server bundle and most of the value comes
// from catching the obvious offenders. Expand if we start seeing weak picks.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234",
  "123456789012", "qwerty123456", "iloveyou1234", "welcome12345",
  "letmein12345", "admin1234567", "changeme1234", "administrator",
  "qwertyuiop12", "asdfghjkl123", "1q2w3e4r5t6y", "homebites123",
  "catering1234", "catering2024", "catering2025", "catering2026",
]);

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200, "Password must be at most 200 characters")
  .refine((v) => /[a-z]/.test(v), "Password must contain a lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Password must contain an uppercase letter")
  .refine((v) => /[0-9]/.test(v), "Password must contain a digit")
  .refine(
    (v) => !COMMON_PASSWORDS.has(v.toLowerCase()),
    "Password is too common — pick something less guessable"
  );

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Run a bcrypt compare against a throwaway hash so login responses take
// the same time whether the username exists or not. Prevents user enumeration
// via timing on /api/auth/login.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_COST);
export async function dummyVerify(): Promise<void> {
  await bcrypt.compare("dummy-password-for-timing-check", DUMMY_HASH);
}
