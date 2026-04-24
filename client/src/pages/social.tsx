// Social publishing — admin UI for Instagram + Facebook via Buffer.
//
// Two tabs:
//   1. Compose — write a post, pick channels, attach media (image / carousel /
//      video / reel), choose draft / queue / schedule / post-now.
//   2. Queue — per-profile pending + recent sent history, with delete.
//
// Agent drafts land here too (it always saves as draft); Mike approves in UI.

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsAdmin } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Instagram, Facebook, Plus, Trash2, Loader2, Send, Clock, FileText, Image as ImageIcon } from "lucide-react";

// --- Types ---------------------------------------------------------------

type Service = "instagram" | "facebook";
type MediaKind = "image" | "carousel" | "video" | "reel";
type Mode = "draft" | "queue" | "schedule" | "now";

interface Profile {
  id: string;
  service: Service;
  username: string;
  serviceType: string;
}

interface Update {
  id: string;
  status: string;
  text: string;
  scheduledAt: number | null;
  sentAt: number | null;
  serviceLink: string | null;
}

// --- Helpers -------------------------------------------------------------

function serviceIcon(service: Service) {
  return service === "instagram" ? (
    <Instagram className="h-4 w-4" />
  ) : (
    <Facebook className="h-4 w-4" />
  );
}

function fmtUnix(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toUnixSeconds(localDateTime: string): number | null {
  if (!localDateTime) return null;
  const d = new Date(localDateTime);
  if (isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

// --- Main page -----------------------------------------------------------

export default function SocialPage() {
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Social publishing</CardTitle>
            <CardDescription>Admin only.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Social</h1>
        <p className="text-sm text-neutral-500">
          Post to Instagram + Facebook via Buffer. The chat agent drafts land here too.
        </p>
      </div>

      <StatusBanner />

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="queue">Queue & history</TabsTrigger>
        </TabsList>
        <TabsContent value="compose" className="mt-4">
          <Compose />
        </TabsContent>
        <TabsContent value="queue" className="mt-4">
          <Queue />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Status banner -------------------------------------------------------

function StatusBanner() {
  const { data } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/social/status"],
    queryFn: async () => {
      const res = await fetch("/api/social/status", { credentials: "include" });
      if (!res.ok) return { configured: false };
      return res.json();
    },
  });
  if (data && !data.configured) {
    return (
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="py-3 text-sm text-amber-900">
          Buffer isn't configured. Set <code className="font-mono">BUFFER_ACCESS_TOKEN</code> in Railway
          env vars (prod) or <code className="font-mono">.infra_keys</code> (dev) and restart.
        </CardContent>
      </Card>
    );
  }
  return null;
}

// --- Compose tab ---------------------------------------------------------

function Compose() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profileData, isLoading: loadingProfiles } = useQuery<{ profiles: Profile[] }>({
    queryKey: ["/api/social/profiles"],
    queryFn: async () => {
      const res = await fetch("/api/social/profiles", { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to load profiles");
      return res.json();
    },
  });
  const profiles = profileData?.profiles || [];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaKind, setMediaKind] = useState<MediaKind>("image");
  const [mediaUrlsText, setMediaUrlsText] = useState(""); // one URL per line
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [mode, setMode] = useState<Mode>("draft");
  const [scheduleAt, setScheduleAt] = useState(""); // datetime-local string

  const mediaUrls = useMemo(
    () => mediaUrlsText.split("\n").map((s) => s.trim()).filter(Boolean),
    [mediaUrlsText],
  );

  // IG requires media; flag if the user targets IG with no media
  const targetingInstagram = profiles.some(
    (p) => selectedIds.has(p.id) && p.service === "instagram",
  );
  const mediaMissingForIg = targetingInstagram && !hasMedia;

  const toggleProfile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        profileIds: Array.from(selectedIds),
        text,
        mode,
      };
      if (hasMedia) {
        body.media = {
          kind: mediaKind,
          urls: mediaUrls,
          ...(mediaKind === "video" || mediaKind === "reel"
            ? { thumbnailUrl }
            : {}),
        };
      }
      if (mode === "schedule") {
        const ts = toUnixSeconds(scheduleAt);
        if (!ts) throw new Error("Pick a valid future date/time.");
        body.scheduledAt = ts;
      }
      const res = await apiRequest("POST", "/api/social/posts", body);
      return res;
    },
    onSuccess: (res: any) => {
      const count = res?.updates?.length ?? 0;
      const label =
        mode === "draft" ? "Draft saved" :
        mode === "now" ? "Posted" :
        mode === "schedule" ? "Scheduled" :
        "Queued";
      toast({ title: label, description: `${count} post(s) created in Buffer.` });
      setText("");
      setMediaUrlsText("");
      setThumbnailUrl("");
      setHasMedia(false);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["/api/social/queue"] });
    },
    onError: (err: any) => {
      toast({
        title: "Buffer rejected the post",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    selectedIds.size > 0 &&
    (text.trim().length > 0 || hasMedia) &&
    (!hasMedia || mediaUrls.length > 0) &&
    (mediaKind !== "carousel" || mediaUrls.length >= 2) &&
    (mediaKind === "video" || mediaKind === "reel" ? !hasMedia || thumbnailUrl.trim().length > 0 : true) &&
    !mediaMissingForIg &&
    (mode !== "schedule" || !!toUnixSeconds(scheduleAt));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">New post</CardTitle>
          <CardDescription>Publish, schedule, queue, or save as draft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Channels */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-neutral-500">Channels</Label>
            {loadingProfiles ? (
              <div className="text-sm text-neutral-500 mt-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading profiles…
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-sm text-amber-800 mt-2">
                No profiles connected in Buffer. Connect Instagram / Facebook accounts at buffer.com/app.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {profiles.map((p) => {
                  const selected = selectedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProfile(p.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${
                        selected
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      {serviceIcon(p.service)}
                      <span>{p.username}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Text */}
          <div>
            <Label htmlFor="social-text" className="text-xs uppercase tracking-wide text-neutral-500">
              Caption
            </Label>
            <Textarea
              id="social-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="What do you want to say?"
              className="mt-1"
            />
            <div className="text-xs text-neutral-400 mt-1">{text.length} chars</div>
          </div>

          {/* Media */}
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium">Media</span>
                {mediaMissingForIg && (
                  <Badge variant="destructive" className="text-[10px]">
                    Instagram requires media
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant={hasMedia ? "secondary" : "outline"}
                size="sm"
                onClick={() => setHasMedia((v) => !v)}
              >
                {hasMedia ? "Remove" : <><Plus className="h-3.5 w-3.5 mr-1" /> Add media</>}
              </Button>
            </div>

            {hasMedia && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-neutral-500">Kind</Label>
                  <Select value={mediaKind} onValueChange={(v) => setMediaKind(v as MediaKind)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image (1)</SelectItem>
                      <SelectItem value="carousel">Carousel (2–10 images)</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="reel">Reel (IG)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-neutral-500">
                    {mediaKind === "carousel"
                      ? "Image URLs (one per line, 2–10)"
                      : mediaKind === "image"
                      ? "Image URL"
                      : "Video URL"}
                  </Label>
                  <Textarea
                    value={mediaUrlsText}
                    onChange={(e) => setMediaUrlsText(e.target.value)}
                    rows={mediaKind === "carousel" ? 5 : 2}
                    placeholder="https://storage.googleapis.com/…"
                    className="mt-1 font-mono text-xs"
                  />
                </div>

                {(mediaKind === "video" || mediaKind === "reel") && (
                  <div>
                    <Label className="text-xs text-neutral-500">Thumbnail URL (required)</Label>
                    <Input
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="https://…"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                )}

                <p className="text-xs text-neutral-500">
                  URLs must be publicly reachable — Buffer fetches them server-side. Signed GCS URLs work.
                </p>
              </div>
            )}
          </div>

          {/* Mode */}
          <div className="border rounded-lg p-3 space-y-3">
            <Label className="text-xs uppercase tracking-wide text-neutral-500">When to post</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                { v: "draft", label: "Save draft", icon: <FileText className="h-3.5 w-3.5" /> },
                { v: "queue", label: "Add to queue", icon: <Plus className="h-3.5 w-3.5" /> },
                { v: "schedule", label: "Schedule", icon: <Clock className="h-3.5 w-3.5" /> },
                { v: "now", label: "Post now", icon: <Send className="h-3.5 w-3.5" /> },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setMode(opt.v)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm border transition ${
                    mode === opt.v
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
            {mode === "schedule" && (
              <div>
                <Label htmlFor="social-schedule" className="text-xs text-neutral-500">
                  Date & time
                </Label>
                <Input
                  id="social-schedule"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => mutation.mutate()}
              disabled={!canSubmit || mutation.isPending}
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : mode === "now" ? (
                "Post now"
              ) : mode === "schedule" ? (
                "Schedule post"
              ) : mode === "queue" ? (
                "Add to queue"
              ) : (
                "Save draft"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600 space-y-2">
          <p><strong>Instagram:</strong> feed posts and Reels need media. Text-only won't publish.</p>
          <p><strong>Facebook:</strong> text-only works; single image, video, or link post all supported.</p>
          <p><strong>Carousels:</strong> IG allows 2–10 slides.</p>
          <p><strong>Reels:</strong> require a thumbnail image URL alongside the video.</p>
          <p className="pt-2 border-t">Drafts from the chat agent land under <em>Queue & history → drafts</em>.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Queue tab -----------------------------------------------------------

function Queue() {
  const { data: profileData } = useQuery<{ profiles: Profile[] }>({
    queryKey: ["/api/social/profiles"],
    queryFn: async () => {
      const res = await fetch("/api/social/profiles", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const profiles = profileData?.profiles || [];
  const [selected, setSelected] = useState<string>("");
  const activeProfile = selected || profiles[0]?.id || "";

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-neutral-500 text-center">
          No profiles connected.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${
              activeProfile === p.id
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            {serviceIcon(p.service)}
            <span>{p.username}</span>
          </button>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-3">
          <QueueList profileId={activeProfile} kind="pending" />
        </TabsContent>
        <TabsContent value="sent" className="mt-3">
          <QueueList profileId={activeProfile} kind="sent" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QueueList({ profileId, kind }: { profileId: string; kind: "pending" | "sent" }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ updates: Update[] }>({
    queryKey: ["/api/social/queue", profileId, kind],
    queryFn: async () => {
      const url = `/api/social/queue?profileId=${encodeURIComponent(profileId)}&kind=${kind}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    enabled: !!profileId,
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/social/posts/${id}`, null);
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      qc.invalidateQueries({ queryKey: ["/api/social/queue"] });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" });
    },
  });

  const shareM = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/social/posts/${id}/share`, {});
    },
    onSuccess: () => {
      toast({ title: "Posting now" });
      qc.invalidateQueries({ queryKey: ["/api/social/queue"] });
    },
    onError: (err: any) => {
      toast({ title: "Share failed", description: err?.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="text-sm text-neutral-500 flex items-center gap-2 py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const updates = data?.updates || [];
  if (updates.length === 0) {
    return (
      <div className="text-sm text-neutral-500 py-6 text-center border rounded-lg">
        Nothing here yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {updates.map((u) => (
        <li key={u.id} className="border rounded-lg p-3 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {u.status}
                </Badge>
                <span className="text-xs text-neutral-500">
                  {kind === "sent" ? fmtUnix(u.sentAt) : fmtUnix(u.scheduledAt)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{u.text || <em className="text-neutral-400">(no caption)</em>}</p>
              {u.serviceLink && (
                <a
                  href={u.serviceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  View on network →
                </a>
              )}
            </div>
            {kind === "pending" && (
              <div className="flex gap-1 shrink-0">
                {u.status !== "sent" && u.scheduledAt === null && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => shareM.mutate(u.id)}
                    disabled={shareM.isPending}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> Post now
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes it from the Buffer queue. Can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteM.mutate(u.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
