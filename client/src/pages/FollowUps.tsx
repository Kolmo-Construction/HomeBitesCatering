/**
 * Follow-ups inbox — one page for "who is waiting on me right now".
 *
 * Unions 16 sources server-side; client just renders by urgency tier, groups
 * by customer when many items share a client, and offers per-row actions
 * (primary CTA + snooze presets + dismiss + pin).
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Inbox,
  AlertTriangle,
  Clock,
  MessageSquare,
  FileText,
  CreditCard,
  Send,
  Search,
  ExternalLink,
  MoreHorizontal,
  PinIcon,
  X,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─── Types (mirror the server) ──────────────────────────────────────────────

type FollowUpUrgency = "P0" | "P1" | "P2" | "P3";
type FollowUpState = "open" | "snoozed" | "dismissed" | "in_progress";

type FollowUpType =
  | "change_request_open"
  | "inquiry_unread"
  | "info_requested"
  | "quote_unviewed"
  | "quote_viewed_no_action"
  | "tasting_unpaid"
  | "contract_unsigned"
  | "deposit_overdue"
  | "balance_due_window"
  | "auto_draft_pending"
  | "decline_feedback"
  | "drip_paused_stuck"
  | "unmatched_email"
  | "review_not_requested"
  | "tasting_no_show"
  | "lost_lead_nurture";

interface FollowUpItem {
  key: string;
  type: FollowUpType;
  urgency: FollowUpUrgency;
  title: string;
  subtitle: string;
  ageSeconds: number;
  sourceAge: string;
  subjectId: number | string;
  eventId: number | null;
  clientId: number | null;
  opportunityId: number | null;
  quoteId: number | null;
  links: { primary: string; reply?: string };
  actions: string[];
  userState: {
    state: FollowUpState;
    snoozeUntil: string | null;
    note: string | null;
  };
}

interface FollowUpResponse {
  items: FollowUpItem[];
  counts: { p0: number; p1: number; p2: number; p3: number; total: number };
}

// ─── Type metadata for icons + labels ───────────────────────────────────────

const TYPE_ICON: Record<FollowUpType, typeof Inbox> = {
  change_request_open: MessageSquare,
  inquiry_unread: Inbox,
  info_requested: MessageSquare,
  quote_unviewed: FileText,
  quote_viewed_no_action: FileText,
  tasting_unpaid: CreditCard,
  contract_unsigned: FileText,
  deposit_overdue: CreditCard,
  balance_due_window: CreditCard,
  auto_draft_pending: Send,
  decline_feedback: MessageSquare,
  drip_paused_stuck: Clock,
  unmatched_email: Search,
  review_not_requested: CheckCircle2,
  tasting_no_show: AlertTriangle,
  lost_lead_nurture: Clock,
};

const TYPE_LABEL: Record<FollowUpType, string> = {
  change_request_open: "Change request",
  inquiry_unread: "New inquiry",
  info_requested: "Info requested",
  quote_unviewed: "Quote not viewed",
  quote_viewed_no_action: "Quote viewed, no action",
  tasting_unpaid: "Tasting not paid",
  contract_unsigned: "Contract not signed",
  deposit_overdue: "Deposit overdue",
  balance_due_window: "Balance due",
  auto_draft_pending: "Draft ready",
  decline_feedback: "Decline feedback",
  drip_paused_stuck: "Drip paused",
  unmatched_email: "Unmatched inbound",
  review_not_requested: "Review not sent",
  tasting_no_show: "Tasting no-show",
  lost_lead_nurture: "Lost lead nurture",
};

const URGENCY_META: Record<
  FollowUpUrgency,
  { label: string; hint: string; color: string; bg: string; border: string }
> = {
  P0: {
    label: "Respond today",
    hint: "Customer actively waiting",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  P1: {
    label: "This week",
    hint: "Deal at risk",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  P2: {
    label: "Whenever",
    hint: "Housekeeping",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  P3: {
    label: "Quiet",
    hint: "Low priority / nurture",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAge(secs: number): string {
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  const days = Math.floor(secs / 86400);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function snoozeOptions(): Array<{ label: string; date: Date }> {
  const now = new Date();
  const nextMorning = (dayOffset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(9, 0, 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d;
  };
  const monday = () => {
    const d = new Date(now);
    const daysToMon = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysToMon);
    d.setHours(9, 0, 0, 0);
    return d;
  };
  return [
    { label: "1 hour", date: new Date(now.getTime() + 3_600_000) },
    { label: "4 hours", date: new Date(now.getTime() + 4 * 3_600_000) },
    { label: "Tomorrow 9am", date: nextMorning(1) },
    { label: "Monday 9am", date: monday() },
    { label: "1 week", date: new Date(now.getTime() + 7 * 86_400_000) },
  ];
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function FollowUps() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [urgencyFilter, setUrgencyFilter] = useState<FollowUpUrgency[] | null>(null); // null = all
  const [typeFilter, setTypeFilter] = useState<FollowUpType | null>(null);
  const [includeSnoozed, setIncludeSnoozed] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<FollowUpUrgency, boolean>>({
    P0: false,
    P1: false,
    P2: true,
    P3: true,
  });

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (urgencyFilter && urgencyFilter.length) p.set("urgency", urgencyFilter.join(","));
    if (typeFilter) p.set("type", typeFilter);
    if (includeSnoozed) p.set("includeSnoozed", "true");
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [urgencyFilter, typeFilter, includeSnoozed]);

  const { data, isLoading, refetch } = useQuery<FollowUpResponse>({
    queryKey: ["/api/follow-ups", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/follow-ups${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load follow-ups");
      return res.json();
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Refresh when the tab becomes visible
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetch]);

  const actionMutation = useMutation({
    mutationFn: async ({
      path,
      body,
      method = "POST",
    }: {
      path: string;
      body?: any;
      method?: "POST" | "DELETE";
    }) => {
      const res = await apiRequest(method, path, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/follow-ups"] });
      qc.invalidateQueries({ queryKey: ["/api/follow-ups/count"] });
    },
    onError: (err: any) =>
      toast({ title: "Action failed", description: err?.message, variant: "destructive" }),
  });

  const handleSnooze = useCallback(
    (item: FollowUpItem, date: Date) => {
      actionMutation.mutate({
        path: `/api/follow-ups/${encodeURIComponent(item.key)}/snooze`,
        body: { snoozeUntil: date.toISOString() },
      });
      toast({
        title: "Snoozed",
        description: `Reappears at ${date.toLocaleString()}`,
      });
    },
    [actionMutation, toast],
  );

  const handleDismiss = useCallback(
    (item: FollowUpItem) => {
      actionMutation.mutate({
        path: `/api/follow-ups/${encodeURIComponent(item.key)}/dismiss`,
        body: { sourceAge: item.sourceAge },
      });
    },
    [actionMutation],
  );

  const handlePin = useCallback(
    (item: FollowUpItem) => {
      actionMutation.mutate({
        path: `/api/follow-ups/${encodeURIComponent(item.key)}/in-progress`,
        body: {},
      });
    },
    [actionMutation],
  );

  const handleUnpin = useCallback(
    (item: FollowUpItem) => {
      actionMutation.mutate({
        path: `/api/follow-ups/${encodeURIComponent(item.key)}/in-progress`,
        method: "DELETE",
      });
    },
    [actionMutation],
  );

  // Group items by urgency — in_progress items float to a separate "Pinned" group.
  const grouped = useMemo(() => {
    const out: { pinned: FollowUpItem[]; P0: FollowUpItem[]; P1: FollowUpItem[]; P2: FollowUpItem[]; P3: FollowUpItem[] } = {
      pinned: [],
      P0: [],
      P1: [],
      P2: [],
      P3: [],
    };
    for (const item of data?.items ?? []) {
      if (item.userState.state === "in_progress") out.pinned.push(item);
      else out[item.urgency].push(item);
    }
    return out;
  }, [data]);

  const counts = data?.counts ?? { p0: 0, p1: 0, p2: 0, p3: 0, total: 0 };
  const urgentToday = counts.p0;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-neutral-900"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Follow-ups
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {counts.total === 0
              ? "Inbox zero — nothing needs you right now."
              : `${urgentToday} urgent today · ${counts.p1} this week · ${counts.p2 + counts.p3} low priority`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex items-center flex-wrap gap-2 pb-2 border-b border-neutral-200">
        <FilterChip
          active={urgencyFilter === null}
          onClick={() => setUrgencyFilter(null)}
          label="All"
          count={counts.total}
        />
        <FilterChip
          active={urgencyFilter?.includes("P0")}
          onClick={() => setUrgencyFilter(["P0"])}
          label="Urgent"
          count={counts.p0}
          color="red"
        />
        <FilterChip
          active={urgencyFilter?.includes("P1")}
          onClick={() => setUrgencyFilter(["P1"])}
          label="This week"
          count={counts.p1}
          color="orange"
        />
        <FilterChip
          active={urgencyFilter?.includes("P2")}
          onClick={() => setUrgencyFilter(["P2"])}
          label="Whenever"
          count={counts.p2}
          color="amber"
        />
        <FilterChip
          active={urgencyFilter?.includes("P3")}
          onClick={() => setUrgencyFilter(["P3"])}
          label="Quiet"
          count={counts.p3}
          color="sky"
        />
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSnoozed}
            onChange={(e) => setIncludeSnoozed(e.target.checked)}
            className="rounded"
          />
          Show snoozed
        </label>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-neutral-500 py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && counts.total === 0 && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-emerald-900">Inbox zero</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Nothing needs you right now. Last checked just now.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pinned group (in_progress) */}
      {grouped.pinned.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-600 font-semibold">
            <PinIcon className="h-3.5 w-3.5" />
            In progress ({grouped.pinned.length})
          </div>
          <ul className="space-y-2">
            {grouped.pinned.map((item) => (
              <FollowUpRow
                key={item.key}
                item={item}
                onNavigate={navigate}
                onSnooze={handleSnooze}
                onDismiss={handleDismiss}
                onPin={handlePin}
                onUnpin={handleUnpin}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Urgency sections */}
      {(["P0", "P1", "P2", "P3"] as FollowUpUrgency[]).map((urgency) => {
        const items = grouped[urgency];
        if (items.length === 0) return null;
        const meta = URGENCY_META[urgency];
        const isCollapsed = collapsed[urgency];
        return (
          <section key={urgency} className="space-y-2">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [urgency]: !c[urgency] }))}
              className="flex items-center gap-2 text-sm font-semibold hover:text-neutral-900 w-full text-left"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              )}
              <span className={cn(meta.color)}>{meta.label}</span>
              <Badge className={cn("border-0", meta.bg, meta.color)}>{items.length}</Badge>
              <span className="text-xs text-neutral-400 font-normal ml-1">· {meta.hint}</span>
            </button>
            {!isCollapsed && (
              <ul className="space-y-2">
                {items.map((item) => (
                  <FollowUpRow
                    key={item.key}
                    item={item}
                    onNavigate={navigate}
                    onSnooze={handleSnooze}
                    onDismiss={handleDismiss}
                    onPin={handlePin}
                    onUnpin={handleUnpin}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function FollowUpRow({
  item,
  onNavigate,
  onSnooze,
  onDismiss,
  onPin,
  onUnpin,
}: {
  item: FollowUpItem;
  onNavigate: (path: string) => void;
  onSnooze: (item: FollowUpItem, date: Date) => void;
  onDismiss: (item: FollowUpItem) => void;
  onPin: (item: FollowUpItem) => void;
  onUnpin: (item: FollowUpItem) => void;
}) {
  const Icon = TYPE_ICON[item.type];
  const urgencyMeta = URGENCY_META[item.urgency];
  const isPinned = item.userState.state === "in_progress";
  const isSnoozed = item.userState.state === "snoozed";

  const primaryActionLabel = PRIMARY_CTA_LABEL[item.type] || "Open";

  return (
    <li
      className={cn(
        "rounded-lg border bg-white transition hover:shadow-sm",
        urgencyMeta.border,
        isPinned && "ring-2 ring-[#E28C0A]/30 border-[#E28C0A]/40",
        isSnoozed && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className={cn(
            "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
            urgencyMeta.bg,
            urgencyMeta.color,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-900">{item.title}</span>
            <Badge className="bg-neutral-100 text-neutral-700 border-0 text-[10px] px-1.5 py-0 capitalize">
              {TYPE_LABEL[item.type]}
            </Badge>
            {isPinned && (
              <Badge className="bg-[#E28C0A] text-white border-0 text-[10px] px-1.5 py-0">
                <PinIcon className="h-2.5 w-2.5 mr-0.5" /> Pinned
              </Badge>
            )}
            {isSnoozed && item.userState.snoozeUntil && (
              <Badge className="bg-sky-100 text-sky-800 border-0 text-[10px] px-1.5 py-0">
                Snoozed until {new Date(item.userState.snoozeUntil).toLocaleString()}
              </Badge>
            )}
          </div>
          <p className="text-sm text-neutral-600 mt-0.5 break-words">{item.subtitle}</p>
          <p className="text-[11px] text-neutral-400 mt-1">{formatAge(item.ageSeconds)}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="h-7 text-xs bg-[#8B7355] hover:bg-[#7a6448] text-white"
            onClick={() => onNavigate(item.links.primary)}
          >
            {primaryActionLabel}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-500">
                Snooze until…
              </div>
              {snoozeOptions().map((opt) => (
                <DropdownMenuItem
                  key={opt.label}
                  onClick={() => onSnooze(item, opt.date)}
                  className="text-xs"
                >
                  {opt.label}
                  <span className="ml-auto text-[10px] text-neutral-400">
                    {opt.date.toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isPinned ? (
                <DropdownMenuItem onClick={() => onUnpin(item)} className="text-xs">
                  <PinIcon className="h-3.5 w-3.5 mr-2" />
                  Unpin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onPin(item)} className="text-xs">
                  <PinIcon className="h-3.5 w-3.5 mr-2" />
                  Pin (in progress)
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDismiss(item)}
                className="text-xs text-red-600"
              >
                <X className="h-3.5 w-3.5 mr-2" />
                Dismiss
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

const PRIMARY_CTA_LABEL: Record<FollowUpType, string> = {
  change_request_open: "Open",
  inquiry_unread: "Review",
  info_requested: "Reply",
  quote_unviewed: "Resend",
  quote_viewed_no_action: "Follow up",
  tasting_unpaid: "Resend link",
  contract_unsigned: "Resend",
  deposit_overdue: "Payment link",
  balance_due_window: "Invoice",
  auto_draft_pending: "Review",
  decline_feedback: "Read",
  drip_paused_stuck: "Open",
  unmatched_email: "Match",
  review_not_requested: "Send request",
  tasting_no_show: "Reach out",
  lost_lead_nurture: "Nurture",
};

// ─── Filter chip ────────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: "red" | "orange" | "amber" | "sky";
}) {
  const colorMap = {
    red: "bg-red-100 text-red-800 border-red-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    sky: "bg-sky-100 text-sky-800 border-sky-200",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium border transition",
        active
          ? color
            ? colorMap[color]
            : "bg-neutral-900 text-white border-neutral-900"
          : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50",
      )}
    >
      {label}
      {count > 0 && <span className="ml-1.5 opacity-80">{count}</span>}
    </button>
  );
}
