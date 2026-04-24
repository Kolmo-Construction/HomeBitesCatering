import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { db } from "../db";
import { passwordResetTokens } from "@shared/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

export type TokenPurpose = "password_reset" | "invite" | "email_change";

const DEFAULT_TTL_MS: Record<TokenPurpose, number> = {
  password_reset: 60 * 60 * 1000,           // 1 hour
  invite: 7 * 24 * 60 * 60 * 1000,          // 7 days
  email_change: 24 * 60 * 60 * 1000,        // 24 hours
};

function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

// Issue a new token. Returns the plaintext — that's the value that goes in
// the email link. Only the hash is stored, so losing a DB dump doesn't let
// an attacker consume anyone's tokens.
export async function createAuthToken(opts: {
  userId: number;
  purpose: TokenPurpose;
  ip?: string | null;
  metadata?: Record<string, any> | null;
  ttlMs?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const { userId, purpose, ip = null, metadata = null } = opts;
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS[purpose];

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttl);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    purpose,
    expiresAt,
    requestedIp: ip ?? undefined,
    metadata: metadata ?? undefined,
  });

  return { token, expiresAt };
}

// Atomically consume a token: returns the row if it's valid and unused, and
// marks it used in the same statement. Null return means the token is
// invalid, expired, used, or the wrong purpose.
export async function consumeAuthToken(opts: {
  token: string;
  purpose: TokenPurpose;
}): Promise<{ userId: number; metadata: Record<string, any> | null } | null> {
  const tokenHash = hashToken(opts.token);

  // UPDATE ... RETURNING is the cleanest way to do this atomically so two
  // concurrent requests can't both consume the same token.
  const result = await db.execute(sql`
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE token_hash = ${tokenHash}
      AND purpose = ${opts.purpose}
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING user_id, metadata
  `);

  const rows = (result as any).rows ?? result;
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  return {
    userId: Number(row.user_id ?? row.userId),
    metadata: (row.metadata ?? null) as Record<string, any> | null,
  };
}

// Read-only peek at a token — does NOT mark it used. Useful for the UI to
// show the username on the reset page before the user submits a new
// password. Returns null if the token is invalid/expired/used.
export async function peekAuthToken(opts: {
  token: string;
  purpose: TokenPurpose;
}): Promise<{ userId: number } | null> {
  const tokenHash = hashToken(opts.token);
  const [row] = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.purpose, opts.purpose),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ? { userId: row.userId } : null;
}

// Invalidate every active session for a user — called after a password
// reset so a pre-existing attacker session can't survive. Uses the raw
// connect-pg-simple `sessions` table (JSON column `sess`).
export async function invalidateSessionsForUser(userId: number): Promise<void> {
  await db.execute(sql`
    DELETE FROM sessions
    WHERE (sess->>'userId')::int = ${userId}
  `);
}

// Re-exported for callers that want to match timing-safe on a plaintext
// token they already have in hand (rare; peekAuthToken is the normal path).
export function tokensEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
