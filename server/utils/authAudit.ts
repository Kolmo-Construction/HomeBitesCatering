import type { Request } from "express";
import { db } from "../db";
import { auditLog } from "@shared/schema";

// Fire-and-forget audit logger for auth events. Uses the existing audit_log
// table (entityType='user') so security history lives alongside normal
// entity audit history.
export type AuthAction =
  | "login_success"
  | "login_failure"
  | "logout"
  | "password_changed"
  | "password_reset_requested"
  | "password_reset_consumed"
  | "role_changed"
  | "user_locked"
  | "user_unlocked"
  | "mfa_enrolled"
  | "mfa_disabled";

export function logAuthEvent(
  action: AuthAction,
  userId: number | null,
  req: Request,
  metadata: Record<string, any> = {},
): void {
  const ip = (req.ip || req.socket?.remoteAddress || null) as string | null;
  const userAgent = req.get("user-agent") || null;

  db.insert(auditLog)
    .values({
      entityType: "user",
      entityId: userId ?? 0,
      action: action as any,
      userId: userId ?? null,
      metadata: { ip, userAgent, ...metadata } as any,
    })
    .catch((err) => {
      console.warn(`[authAudit] failed to log ${action}:`, err);
    });
}
