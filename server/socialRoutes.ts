// Social publishing routes — Buffer-backed posting for Instagram + Facebook.
// All endpoints require an admin session (same pattern as /catalog). Mounted
// at /api/social in server/index.ts.

import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage";
import {
  listIgFbProfiles,
  listPending,
  listSent,
  createPost,
  deleteUpdate,
  shareNow,
  hasBufferToken,
  type MediaKind,
} from "./services/bufferService";

const router = Router();

async function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });
  const user = await storage.getUser(userId);
  if (!user) return res.status(401).json({ message: "User not found" });
  if (user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  (req as any).adminUser = user;
  next();
}

router.use(requireAdminSession);

// ---------------------------------------------------------------------------
// GET /api/social/status — quick health check for the Admin UI
// ---------------------------------------------------------------------------
router.get("/status", async (_req, res) => {
  res.json({ configured: hasBufferToken() });
});

// ---------------------------------------------------------------------------
// GET /api/social/profiles — connected IG + FB profiles
// ---------------------------------------------------------------------------
router.get("/profiles", async (_req, res) => {
  try {
    const profiles = await listIgFbProfiles();
    res.json({ profiles });
  } catch (err: any) {
    res.status(502).json({ message: err.message || "Buffer request failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/social/queue?profileId=...&kind=pending|sent
// ---------------------------------------------------------------------------
router.get("/queue", async (req, res) => {
  const profileId = String(req.query.profileId || "").trim();
  const kind = (req.query.kind === "sent" ? "sent" : "pending") as "pending" | "sent";
  if (!profileId) return res.status(400).json({ message: "profileId required" });
  try {
    const updates =
      kind === "sent"
        ? await listSent(profileId, { count: 25 })
        : await listPending(profileId);
    res.json({ updates });
  } catch (err: any) {
    res.status(502).json({ message: err.message || "Buffer request failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/social/posts
//   body: {
//     profileIds: string[],
//     text: string,
//     media?: { kind: 'image'|'carousel'|'video'|'reel', urls: string[], thumbnailUrl?: string },
//     mode: 'draft' | 'queue' | 'schedule' | 'now',
//     scheduledAt?: number  // unix seconds, required when mode='schedule'
//   }
// ---------------------------------------------------------------------------
router.post("/posts", async (req, res) => {
  const { profileIds, text, media, mode, scheduledAt } = req.body || {};

  if (!Array.isArray(profileIds) || profileIds.length === 0) {
    return res.status(400).json({ message: "profileIds[] required" });
  }
  if (typeof text !== "string") {
    return res.status(400).json({ message: "text required" });
  }
  if (!["draft", "queue", "schedule", "now"].includes(mode)) {
    return res.status(400).json({ message: "mode must be one of draft|queue|schedule|now" });
  }
  if (mode === "schedule") {
    if (typeof scheduledAt !== "number" || scheduledAt <= Math.floor(Date.now() / 1000)) {
      return res.status(400).json({ message: "scheduledAt must be a future unix-second timestamp" });
    }
  }
  if (media) {
    const validKinds: MediaKind[] = ["image", "carousel", "video", "reel"];
    if (!validKinds.includes(media.kind)) {
      return res.status(400).json({ message: "media.kind invalid" });
    }
    if (!Array.isArray(media.urls) || media.urls.length === 0) {
      return res.status(400).json({ message: "media.urls[] required" });
    }
  }

  try {
    const result = await createPost({
      profileIds,
      text,
      media,
      draft: mode === "draft",
      now: mode === "now",
      scheduledAt: mode === "schedule" ? scheduledAt : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ message: err.message || "Buffer request failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/social/posts/:id/share — push a queued post live now
// ---------------------------------------------------------------------------
router.post("/posts/:id/share", async (req, res) => {
  try {
    const result = await shareNow(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ message: err.message || "Buffer request failed" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/social/posts/:id
// ---------------------------------------------------------------------------
router.delete("/posts/:id", async (req, res) => {
  try {
    const result = await deleteUpdate(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ message: err.message || "Buffer request failed" });
  }
});

export default router;
