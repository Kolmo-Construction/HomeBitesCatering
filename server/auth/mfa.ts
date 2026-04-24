// TOTP 2FA support. Secrets are encrypted at rest with AES-256-GCM so a DB
// dump alone can't be used to generate valid codes — the attacker also needs
// MFA_ENCRYPTION_KEY. Recovery codes are hashed individually (bcrypt cost 10
// is plenty for these since they're high-entropy random strings).

import { generateSecret, generateURI, verifySync } from "otplib";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { db } from "../db";
import { userMfa } from "@shared/schema";
import { eq } from "drizzle-orm";

// otplib TOTP defaults (30s period, SHA1, 6 digits) match Google
// Authenticator / Authy / 1Password. Don't tune these without a compelling
// reason — drift breaks existing enrollments.

function getEncryptionKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "MFA_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32"
    );
  }
  // Accept either raw base64 (32-byte key) or a long passphrase that we hash.
  // Hashing gives us a 32-byte key from any input, which is the happy path
  // for devs who forget that AES-256-GCM needs exactly 32 bytes.
  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) return decoded;
  } catch { /* fall through */ }
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack as: base64(iv).base64(tag).base64(ciphertext) — single column storage.
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(packed: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, ctB64] = packed.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Malformed MFA ciphertext");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

// Returns { secret, otpauth, qrDataUrl }. Secret is shown to the user once so
// they can paste it into an authenticator app that can't scan QR codes.
export async function generateEnrollment(opts: {
  username: string;
  issuer: string;
}): Promise<{ secret: string; otpauth: string; qrDataUrl: string }> {
  const secret = generateSecret();
  const otpauth = generateURI({
    issuer: opts.issuer,
    label: opts.username,
    secret,
  });
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  return { secret, otpauth, qrDataUrl };
}

export function verifyCode(secret: string, code: string): boolean {
  try {
    // epochTolerance: 30s allows one step of clock drift in either direction
    // — the same tolerance `window: 1` gave us in the older otplib API.
    const result = verifySync({
      secret,
      token: code.replace(/\s/g, ""),
      epochTolerance: 30,
    });
    return !!result.valid;
  } catch {
    return false;
  }
}

// Issue fresh recovery codes. User sees the plaintext once; DB only stores
// hashes. Codes are single-use — consuming one removes it from the list.
export function generateRecoveryCodes(n = 10): string[] {
  return Array.from({ length: n }, () =>
    randomBytes(5).toString("hex").match(/.{1,5}/g)!.join("-")
  );
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
}

export async function consumeRecoveryCode(
  userId: number,
  code: string,
): Promise<boolean> {
  const [row] = await db.select().from(userMfa).where(eq(userMfa.userId, userId)).limit(1);
  if (!row) return false;
  const codes = row.recoveryCodesHashed ?? [];
  for (let i = 0; i < codes.length; i++) {
    if (await bcrypt.compare(code, codes[i])) {
      const remaining = [...codes.slice(0, i), ...codes.slice(i + 1)];
      await db
        .update(userMfa)
        .set({ recoveryCodesHashed: remaining, lastUsedAt: new Date() })
        .where(eq(userMfa.userId, userId));
      return true;
    }
  }
  return false;
}

export async function isUserEnrolled(userId: number): Promise<boolean> {
  const [row] = await db.select({ userId: userMfa.userId }).from(userMfa).where(eq(userMfa.userId, userId)).limit(1);
  return !!row;
}

export async function getEnrolledSecret(userId: number): Promise<string | null> {
  const [row] = await db.select().from(userMfa).where(eq(userMfa.userId, userId)).limit(1);
  if (!row) return null;
  return decryptSecret(row.secretEncrypted);
}
