// Buffer (social scheduling) — thin wrapper over Buffer's v1 REST API.
//
// Docs: https://buffer.com/developers/api
// Base: https://api.bufferapp.com/1
//
// Auth: personal access token in Authorization: Bearer header, OR access_token
// query param. We use the header. Token lives in BUFFER_ACCESS_TOKEN; in dev
// we fall back to the `.infra_keys` file the rest of the repo reads from.
//
// What this module does NOT do:
//   - OAuth flow — tokens are personal/long-lived, not per-user
//   - Webhook receive — Buffer doesn't push delivery status to us
//   - Media upload — Buffer fetches media URLs itself, so callers must hand
//     us a publicly-reachable URL (GCS signed URLs work fine)

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BUFFER_BASE = "https://api.bufferapp.com/1";

// --- Token loading ---------------------------------------------------------

function readInfraToken(): string | null {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".infra_keys"), "utf-8");
    const m = raw.match(/^BUFFER_ACCESS_TOKEN\s*=\s*(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

function getToken(): string {
  const tok = process.env.BUFFER_ACCESS_TOKEN?.trim() || readInfraToken();
  if (!tok) {
    throw new Error(
      "BUFFER_ACCESS_TOKEN is not set. Add it to Railway env vars (prod) or .infra_keys (dev).",
    );
  }
  return tok;
}

// --- Types -----------------------------------------------------------------

export type BufferService = "instagram" | "facebook" | string;

export interface BufferProfile {
  id: string;
  service: BufferService;
  serviceUsername: string;
  serviceType: string; // "page" | "profile" | "business" etc.
  formattedUsername: string;
  avatarUrl?: string;
  timezone?: string;
}

export type MediaKind = "image" | "carousel" | "video" | "reel";

export interface PostMedia {
  kind: MediaKind;
  /** Public URLs. image=1, carousel=2-10 images, video=1 video, reel=1 video. */
  urls: string[];
  /** Thumbnail image URL — required for video/reel, ignored otherwise. */
  thumbnailUrl?: string;
}

export interface CreatePostInput {
  profileIds: string[];
  text: string;
  media?: PostMedia;
  /** Unix seconds. If omitted and now=false, Buffer queues it as a draft. */
  scheduledAt?: number;
  /** Post immediately. Overrides scheduledAt. */
  now?: boolean;
  /** Save as draft for admin approval instead of queuing/scheduling. */
  draft?: boolean;
}

export interface BufferUpdate {
  id: string;
  profileId: string;
  status: "pending" | "sent" | "buffer" | "draft" | string;
  text: string;
  createdAt: number;
  scheduledAt?: number | null;
  sentAt?: number | null;
  serviceLink?: string | null;
}

// --- HTTP helpers ----------------------------------------------------------

async function bufferFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const url = `${BUFFER_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(
      `Buffer ${init.method || "GET"} ${path} failed: ${res.status} ${body.slice(0, 300)}`,
    );
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    return body as unknown as T;
  }
}

function formEncode(params: Record<string, string | number | boolean | string[]>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      // Buffer expects repeated `profile_ids[]=...&profile_ids[]=...`
      for (const item of v) usp.append(`${k}[]`, String(item));
    } else {
      usp.append(k, String(v));
    }
  }
  return usp.toString();
}

// --- Profiles --------------------------------------------------------------

let profilesCache: { at: number; rows: BufferProfile[] } | null = null;
const PROFILES_TTL_MS = 60_000;

export async function listProfiles(opts?: { force?: boolean }): Promise<BufferProfile[]> {
  if (!opts?.force && profilesCache && Date.now() - profilesCache.at < PROFILES_TTL_MS) {
    return profilesCache.rows;
  }
  const raw = await bufferFetch<any[]>("/profiles.json");
  const rows: BufferProfile[] = (raw || []).map((p) => ({
    id: p._id || p.id,
    service: p.service,
    serviceUsername: p.service_username || p.formatted_username || "",
    serviceType: p.service_type || "",
    formattedUsername: p.formatted_username || p.service_username || "",
    avatarUrl: p.avatar || p.avatar_https || undefined,
    timezone: p.timezone,
  }));
  profilesCache = { at: Date.now(), rows };
  return rows;
}

/** Convenience: only IG + FB profiles (the two surfaces we publish to). */
export async function listIgFbProfiles(): Promise<BufferProfile[]> {
  const all = await listProfiles();
  return all.filter((p) => p.service === "instagram" || p.service === "facebook");
}

// --- Create post ----------------------------------------------------------

function buildMediaParams(media?: PostMedia): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!media) return out;

  const [first, ...rest] = media.urls;

  switch (media.kind) {
    case "image":
      if (first) out["media[photo]"] = first;
      break;

    case "carousel":
      // Buffer carousel: first image on `media[photo]`, rest on extra_media[i][photo].
      // IG allows up to 10 slides. We cap quietly.
      if (first) out["media[photo]"] = first;
      rest.slice(0, 9).forEach((url, i) => {
        out[`extra_media[${i}][photo]`] = url;
      });
      break;

    case "video":
      if (first) out["media[video]"] = first;
      if (media.thumbnailUrl) out["media[thumbnail]"] = media.thumbnailUrl;
      break;

    case "reel":
      // IG Reels: video + thumbnail + instagram_reel flag. Buffer routes this
      // to the IG Reels surface rather than a feed post.
      if (first) out["media[video]"] = first;
      if (media.thumbnailUrl) out["media[thumbnail]"] = media.thumbnailUrl;
      out["instagram_reel"] = true;
      break;
  }
  return out;
}

export interface CreatePostResult {
  success: boolean;
  updates: BufferUpdate[];
  bufferResponse: any;
}

/** Validate media shape before hitting Buffer — cheap client-side checks. */
function validateMedia(media?: PostMedia): string | null {
  if (!media) return null;
  if (media.urls.length === 0) return "media.urls must contain at least one URL.";
  if (media.kind === "image" && media.urls.length !== 1) return "image kind expects exactly 1 URL.";
  if (media.kind === "carousel" && (media.urls.length < 2 || media.urls.length > 10))
    return "carousel kind expects 2–10 URLs.";
  if (media.kind === "video" && media.urls.length !== 1) return "video kind expects exactly 1 URL.";
  if (media.kind === "reel") {
    if (media.urls.length !== 1) return "reel kind expects exactly 1 video URL.";
    if (!media.thumbnailUrl) return "reel kind requires thumbnailUrl.";
  }
  return null;
}

export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  if (!input.profileIds || input.profileIds.length === 0) {
    throw new Error("createPost: profileIds is required.");
  }
  if (!input.text && !input.media) {
    throw new Error("createPost: text or media is required.");
  }
  const mediaErr = validateMedia(input.media);
  if (mediaErr) throw new Error(`createPost: ${mediaErr}`);

  const params: Record<string, string | number | boolean | string[]> = {
    text: input.text || "",
    profile_ids: input.profileIds,
    ...buildMediaParams(input.media),
  };

  // Scheduling semantics:
  //   draft=true          → save as draft (shared: false, top: false, no schedule)
  //   now=true            → publish immediately
  //   scheduledAt set     → schedule at that unix second
  //   otherwise           → enqueue (Buffer picks a slot from the profile's schedule)
  if (input.draft) {
    params.shared = false; // stays in drafts tab, not the profile's queue
  } else if (input.now) {
    params.now = true;
  } else if (typeof input.scheduledAt === "number") {
    params.scheduled_at = input.scheduledAt;
  }

  const body = formEncode(params);
  const raw = await bufferFetch<any>("/updates/create.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const updates: BufferUpdate[] = (raw.updates || []).map((u: any) => ({
    id: u._id || u.id,
    profileId: u.profile_id,
    status: u.status,
    text: u.text || "",
    createdAt: u.created_at,
    scheduledAt: u.scheduled_at ?? null,
    sentAt: u.sent_at ?? null,
    serviceLink: u.service_link ?? null,
  }));

  return { success: !!raw.success, updates, bufferResponse: raw };
}

// --- List / delete ---------------------------------------------------------

function mapUpdate(u: any): BufferUpdate {
  return {
    id: u._id || u.id,
    profileId: u.profile_id,
    status: u.status,
    text: u.text || "",
    createdAt: u.created_at,
    scheduledAt: u.scheduled_at ?? null,
    sentAt: u.sent_at ?? null,
    serviceLink: u.service_link ?? null,
  };
}

/** Pending queue for a profile (scheduled + buffer + drafts). */
export async function listPending(profileId: string): Promise<BufferUpdate[]> {
  const raw = await bufferFetch<any>(`/profiles/${profileId}/updates/pending.json`);
  return (raw.updates || []).map(mapUpdate);
}

/** Recently sent updates for a profile — useful for the "history" tab. */
export async function listSent(profileId: string, opts?: { count?: number }): Promise<BufferUpdate[]> {
  const count = Math.min(Math.max(opts?.count ?? 20, 1), 50);
  const raw = await bufferFetch<any>(
    `/profiles/${profileId}/updates/sent.json?count=${count}`,
  );
  return (raw.updates || []).map(mapUpdate);
}

export async function deleteUpdate(updateId: string): Promise<{ success: boolean }> {
  const raw = await bufferFetch<any>(`/updates/${updateId}/destroy.json`, {
    method: "POST",
  });
  return { success: !!raw.success };
}

/** Push a queued (not scheduled) update out immediately. */
export async function shareNow(updateId: string): Promise<{ success: boolean }> {
  const raw = await bufferFetch<any>(`/updates/${updateId}/share.json`, {
    method: "POST",
  });
  return { success: !!raw.success };
}

export function hasBufferToken(): boolean {
  try {
    getToken();
    return true;
  } catch {
    return false;
  }
}
