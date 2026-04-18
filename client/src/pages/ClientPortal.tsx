/**
 * Client Portal — post-acceptance workspace.
 *
 * URL: /my-events (magic-link authenticated)
 *
 * After the couple signs, this is where they track everything: milestone
 * progress (Booked → Contract signed → Deposit paid → Headcount confirmed →
 * Balance paid → Event day), payment and contract state, documents, and a
 * change-request path that creates a communications record for Mike.
 */
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { getEventTheme } from "@/lib/eventThemes";
import {
  Calendar,
  Users,
  MapPin,
  Mail,
  Loader2,
  ExternalLink,
  FileText,
  PartyPopper,
  LogOut,
  ChevronRight,
  Check,
  Circle,
  CreditCard,
  PenLine,
  Download,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SESSION_KEY = "hb_portal_session";
const CLIENT_KEY = "hb_portal_client";

// ─── Types ──────────────────────────────────────────────────────────────────

type MilestoneStatus = "done" | "current" | "pending" | "overdue";

interface Milestone {
  key: string;
  label: string;
  status: MilestoneStatus;
  hint?: string;
}

interface PortalEventDocument {
  label: string;
  url: string;
  kind: "contract" | "quote" | "receipt";
}

interface PortalEvent {
  id: number;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  venue: string;
  status: string;
  viewToken: string | null;
  daysToEvent: number;
  totalCents: number | null;
  payment: {
    depositAmountCents: number | null;
    depositPercent: number | null;
    depositPaidAt: string | null;
    depositPayUrl: string | null;
    balanceAmountCents: number | null;
    balancePaidAt: string | null;
    balancePayUrl: string | null;
  };
  contract: {
    status: string;
    signingUrl: string | null;
    signedAt: string | null;
    pdfUrl: string | null;
  } | null;
  milestones: Milestone[];
  nextStep: { label: string; cta: string; url: string | null } | null;
  documents: PortalEventDocument[];
}

interface PortalQuote {
  id: number;
  eventType: string;
  eventDate: string | null;
  guestCount: number | null;
  venue: string | null;
  status: string;
  total: number;
  viewToken: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
}

interface PortalClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  type: string;
}

interface PortalData {
  client: PortalClient;
  events: PortalEvent[];
  quotes: PortalQuote[];
}

// ─── Login screen ────────────────────────────────────────────────────────────

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const requestMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/public/portal/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to request link");
      return res.json();
    },
    onSuccess: () => setSent(true),
    onError: () => toast({ title: "Something went wrong", variant: "destructive" }),
  });

  if (sent) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Mail className="h-12 w-12 text-[#8B7355] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "Georgia, serif" }}>
              Check your email
            </h2>
            <p className="text-gray-600">
              If we found your account, we've sent a login link to{" "}
              <strong>{email}</strong>. It expires in 30 minutes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle style={{ fontFamily: "Georgia, serif" }}>My events</CardTitle>
          <CardDescription>Enter your email to access your event portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestMutation.mutate(email);
            }}
            className="space-y-4"
          >
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full bg-[#8B7355] hover:bg-[#6B5345]"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send login link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Milestone tracker ──────────────────────────────────────────────────────

function MilestoneTracker({ milestones }: { milestones: Milestone[] }) {
  return (
    <ol className="space-y-3">
      {milestones.map((m, i) => {
        const isLast = i === milestones.length - 1;
        return (
          <li key={m.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0 transition",
                  m.status === "done" && "bg-emerald-500 border-emerald-500 text-white",
                  m.status === "current" &&
                    "border-[#E28C0A] text-[#E28C0A] bg-[#fff6e6] ring-4 ring-[#E28C0A]/15",
                  m.status === "pending" && "border-stone-300 text-stone-300 bg-white",
                  m.status === "overdue" && "border-red-500 text-red-600 bg-red-50",
                )}
              >
                {m.status === "done" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[1.5rem]",
                    m.status === "done" ? "bg-emerald-500" : "bg-stone-200",
                  )}
                />
              )}
            </div>
            <div className="flex-1 pb-5">
              <div
                className={cn(
                  "font-medium leading-tight",
                  m.status === "current" && "text-[#8B7355]",
                  m.status === "pending" && "text-stone-500",
                  m.status === "done" && "text-stone-900",
                  m.status === "overdue" && "text-red-700",
                )}
              >
                {m.label}
              </div>
              {m.hint && (
                <div className="text-sm text-stone-500 mt-0.5 leading-snug">
                  {m.hint}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Active event hero ──────────────────────────────────────────────────────

function ActiveEventHero({
  event,
  onRequestChange,
}: {
  event: PortalEvent;
  onRequestChange: () => void;
}) {
  const theme = getEventTheme(event.eventType);
  const days = event.daysToEvent;

  return (
    <section className="rounded-3xl bg-white border border-[#e8ddc8] shadow-sm overflow-hidden">
      <div className="h-2" style={{ background: theme.gradient }} />
      <div className="p-6 sm:p-8">
        {/* Top row: event title + countdown */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#8B7355] font-semibold mb-1">
              Your next event
            </div>
            <h2
              className="text-3xl sm:text-4xl font-serif text-stone-900 leading-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {theme.icon}{" "}
              <span className="capitalize">{event.eventType.replace(/_/g, " ")}</span>
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-700 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#8B7355]" />
                {formatDate(new Date(event.eventDate))}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#8B7355]" />
                {event.guestCount} guests
              </span>
              {event.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#8B7355]" />
                  {event.venue}
                </span>
              )}
            </div>
          </div>
          <div
            className="text-center rounded-2xl px-5 py-3 shrink-0"
            style={{ background: theme.gradient, color: "white" }}
          >
            <div className="text-3xl font-bold leading-none">{Math.max(days, 0)}</div>
            <div className="text-xs opacity-90 mt-1">
              {days <= 0 ? "today!" : `day${days === 1 ? "" : "s"} to go`}
            </div>
          </div>
        </div>

        {/* Next step CTA */}
        {event.nextStep && (
          <div className="mt-6 rounded-2xl border border-[#E28C0A]/30 bg-gradient-to-br from-[#fff6e6] to-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-[#8B7355] font-semibold">
                What's next
              </div>
              <div className="text-stone-900 font-medium mt-0.5">
                {event.nextStep.label}
              </div>
            </div>
            {event.nextStep.url ? (
              <a
                href={event.nextStep.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 bg-[#E28C0A] hover:bg-[#c77a00] text-white font-medium px-5 py-2.5 rounded-full text-sm transition shadow-sm"
              >
                {event.nextStep.cta}
                <ChevronRight className="h-4 w-4" />
              </a>
            ) : (
              <div className="text-sm text-stone-500 shrink-0">{event.nextStep.cta}</div>
            )}
          </div>
        )}

        {/* Milestones */}
        <div className="mt-8">
          <div className="text-xs uppercase tracking-[0.22em] text-[#8B7355] font-semibold mb-4">
            Progress
          </div>
          <MilestoneTracker milestones={event.milestones} />
        </div>

        {/* Quick actions */}
        <div className="mt-6 pt-6 border-t border-stone-200 flex flex-wrap gap-2">
          {event.contract?.signingUrl && event.contract.status !== "signed" && (
            <a
              href={event.contract.signingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#8B7355] text-white hover:bg-[#7a6448] transition"
            >
              <PenLine className="h-4 w-4" /> Sign contract
            </a>
          )}
          {event.payment.depositPayUrl && !event.payment.depositPaidAt && (
            <a
              href={event.payment.depositPayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white border border-stone-300 hover:bg-stone-50 transition"
            >
              <CreditCard className="h-4 w-4" /> Pay deposit
            </a>
          )}
          {event.payment.balancePayUrl && !event.payment.balancePaidAt && (
            <a
              href={event.payment.balancePayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white border border-stone-300 hover:bg-stone-50 transition"
            >
              <CreditCard className="h-4 w-4" /> Pay balance
            </a>
          )}
          {event.viewToken && (
            <a
              href={`/event/${event.viewToken}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white border border-stone-300 hover:bg-stone-50 transition"
            >
              <ExternalLink className="h-4 w-4" /> Event page
            </a>
          )}
          <button
            type="button"
            onClick={onRequestChange}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white border border-stone-300 hover:bg-stone-50 transition"
          >
            <MessageSquare className="h-4 w-4" /> Request a change
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Documents ──────────────────────────────────────────────────────────────

function DocumentLocker({ events }: { events: PortalEvent[] }) {
  const docs = useMemo(() => {
    const all: Array<{ eventId: number; label: string; url: string; kind: string; context: string }> = [];
    for (const e of events) {
      for (const d of e.documents) {
        all.push({
          eventId: e.id,
          label: d.label,
          url: d.url,
          kind: d.kind,
          context: `${e.eventType.replace(/_/g, " ")} · ${formatDate(new Date(e.eventDate))}`,
        });
      }
    }
    return all;
  }, [events]);

  if (docs.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle
          className="text-lg flex items-center gap-2"
          style={{ fontFamily: "Georgia, serif" }}
        >
          <FileText className="h-5 w-5 text-[#8B7355]" />
          Your documents
        </CardTitle>
        <CardDescription>Everything for your event in one place.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-stone-100">
          {docs.map((d, i) => (
            <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="font-medium text-stone-900 text-sm truncate">
                  {d.label}
                </div>
                <div className="text-xs text-stone-500 capitalize mt-0.5 truncate">
                  {d.context}
                </div>
              </div>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-300 hover:bg-stone-50 transition"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Change-request modal ───────────────────────────────────────────────────

const CHANGE_CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: "headcount", label: "Guest count", hint: "Adding or removing guests" },
  { key: "menu", label: "Menu swap", hint: "Change an item or dietary needs" },
  { key: "timeline", label: "Timeline / times", hint: "Start time, service order" },
  { key: "venue", label: "Venue / logistics", hint: "Address, access, setup notes" },
  { key: "other", label: "Something else", hint: "Anything that doesn't fit above" },
];

function ChangeRequestModal({
  event,
  sessionToken,
  onClose,
  onSuccess,
}: {
  event: PortalEvent;
  sessionToken: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState<string>("headcount");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/public/portal/events/${event.id}/change-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ category, message: message.trim() }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send request");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "We got it",
        description: "Mike will reach out shortly to work through the details.",
      });
      onSuccess();
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't send", description: err.message, variant: "destructive" }),
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <h3
                className="text-xl font-semibold text-stone-900"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Request a change
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Tell us what you'd like to tweak. Mike reads every one.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 space-y-1.5">
            {CHANGE_CATEGORIES.map((opt) => {
              const selected = category === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setCategory(opt.key)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border text-sm transition",
                    selected
                      ? "border-[#8B7355] bg-[#faf5e9] ring-2 ring-[#E28C0A]/30"
                      : "border-stone-200 bg-white hover:border-stone-300",
                  )}
                >
                  <div className="font-medium text-stone-900">{opt.label}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{opt.hint}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-stone-700 block mb-1">
              Details
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. 'We'd like to add 12 more guests, mostly vegetarian.'"
              rows={4}
              className="border-stone-300"
            />
            <div className="text-xs text-stone-400 mt-1">
              {message.length}/5000 characters
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[#8B7355] hover:bg-[#6B5345] text-white"
              disabled={!message.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

function PortalDashboard({
  data,
  sessionToken,
  onLogout,
}: {
  data: PortalData;
  sessionToken: string;
  onLogout: () => void;
}) {
  const qc = useQueryClient();
  const [changeEventId, setChangeEventId] = useState<number | null>(null);

  const upcomingEvents = data.events
    .filter((e) => new Date(e.eventDate) >= new Date() && e.status !== "cancelled")
    .sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );
  const pastEvents = data.events
    .filter(
      (e) => new Date(e.eventDate) < new Date() || e.status === "completed",
    )
    .sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );
  const pendingQuotes = data.quotes.filter(
    (e) => e.status === "sent" || e.status === "viewed",
  );

  const heroEvent = upcomingEvents[0];
  const otherUpcoming = upcomingEvents.slice(1);

  const changeEvent = changeEventId
    ? data.events.find((e) => e.id === changeEventId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8ddc8] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Welcome back, {data.client.firstName}
            </h1>
            <p className="text-sm text-gray-500">{data.client.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Pending quotes — still need action */}
        {pendingQuotes.length > 0 && (
          <div>
            <h2
              className="text-lg font-semibold mb-3"
              style={{ fontFamily: "Georgia, serif" }}
            >
              <FileText className="h-5 w-5 inline mr-2 text-amber-600" />
              Quotes awaiting your review
            </h2>
            <div className="grid gap-3">
              {pendingQuotes.map((q) => {
                const theme = getEventTheme(q.eventType);
                return (
                  <a
                    key={q.id}
                    href={q.viewToken ? `/quote/${q.viewToken}` : "#"}
                    className="block"
                  >
                    <Card
                      className="hover:shadow-md transition cursor-pointer"
                      style={{ borderLeftColor: theme.primary, borderLeftWidth: 4 }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">
                            {q.eventType.replace(/_/g, " ")}
                          </div>
                          <div className="text-sm text-gray-500">
                            {q.eventDate ? formatDate(new Date(q.eventDate)) : "Date TBD"}{" "}
                            · {q.guestCount || "?"} guests
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold">
                            ${(q.total / 100).toLocaleString()}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Active event hero */}
        {heroEvent ? (
          <ActiveEventHero
            event={heroEvent}
            onRequestChange={() => setChangeEventId(heroEvent.id)}
          />
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <PartyPopper className="h-10 w-10 text-[#8B7355] mx-auto mb-3" />
              No events booked yet. Once you accept a proposal, we'll track
              everything here.
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {heroEvent && <DocumentLocker events={upcomingEvents} />}

        {/* Other upcoming events */}
        {otherUpcoming.length > 0 && (
          <div>
            <h2
              className="text-lg font-semibold mb-3"
              style={{ fontFamily: "Georgia, serif" }}
            >
              <Calendar className="h-5 w-5 inline mr-2 text-[#8B7355]" />
              More upcoming events
            </h2>
            <div className="grid gap-3">
              {otherUpcoming.map((evt) => {
                const theme = getEventTheme(evt.eventType);
                return (
                  <Card key={evt.id} className="hover:shadow-md transition overflow-hidden">
                    <div className="h-1" style={{ background: theme.gradient }} />
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{theme.icon}</span>
                            <span className="font-medium capitalize truncate">
                              {evt.eventType.replace(/_/g, " ")}
                            </span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {evt.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(new Date(evt.eventDate))}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {evt.guestCount}
                            </span>
                            {evt.venue && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3.5 w-3.5" />
                                {evt.venue}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setChangeEventId(evt.id)}
                            className="text-xs px-3 py-1.5 rounded-full bg-white border border-stone-300 hover:bg-stone-50 transition"
                          >
                            Change
                          </button>
                          {evt.viewToken && (
                            <a
                              href={`/event/${evt.viewToken}`}
                              className="text-xs px-3 py-1.5 rounded-full bg-white border border-stone-300 hover:bg-stone-50 transition inline-flex items-center gap-1"
                            >
                              Open <ChevronRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Past events */}
        {pastEvents.length > 0 && (
          <div>
            <h2
              className="text-lg font-semibold mb-3"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Past events
            </h2>
            <div className="grid gap-2">
              {pastEvents.map((evt) => {
                const theme = getEventTheme(evt.eventType);
                return (
                  <a
                    key={evt.id}
                    href={evt.viewToken ? `/event/${evt.viewToken}` : "#"}
                    className="block"
                  >
                    <Card className="hover:shadow-sm transition cursor-pointer opacity-80">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{theme.icon}</span>
                          <span className="text-sm font-medium capitalize">
                            {evt.eventType.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(new Date(evt.eventDate))}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" /> View
                        </Button>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {changeEvent && (
        <ChangeRequestModal
          event={changeEvent}
          sessionToken={sessionToken}
          onClose={() => setChangeEventId(null)}
          onSuccess={() => {
            setChangeEventId(null);
            qc.invalidateQueries({ queryKey: ["/api/public/portal/data"] });
          }}
        />
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ClientPortal() {
  const [location] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(
    localStorage.getItem(SESSION_KEY),
  );
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const magicToken = urlParams.get("token");

  useEffect(() => {
    if (magicToken && !sessionToken) {
      setVerifying(true);
      fetch("/api/public/portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: magicToken }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Verification failed");
          }
          return res.json();
        })
        .then((data) => {
          localStorage.setItem(SESSION_KEY, data.sessionToken);
          if (data.client)
            localStorage.setItem(CLIENT_KEY, JSON.stringify(data.client));
          setSessionToken(data.sessionToken);
          window.history.replaceState({}, "", "/my-events");
        })
        .catch((err) => {
          toast({
            title: "Login failed",
            description: err.message,
            variant: "destructive",
          });
        })
        .finally(() => setVerifying(false));
    }
  }, [magicToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: portalData, isLoading, isError } = useQuery<PortalData>({
    queryKey: ["/api/public/portal/data", sessionToken],
    queryFn: async () => {
      const res = await fetch("/api/public/portal/data", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(CLIENT_KEY);
          setSessionToken(null);
          throw new Error("Session expired");
        }
        throw new Error("Failed to load");
      }
      return res.json();
    },
    enabled: !!sessionToken,
  });

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(CLIENT_KEY);
    setSessionToken(null);
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
        <p className="ml-3 text-gray-600">Verifying your login…</p>
      </div>
    );
  }

  if (!sessionToken) return <LoginScreen />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (isError || !portalData) return <LoginScreen />;

  return (
    <PortalDashboard
      data={portalData}
      sessionToken={sessionToken}
      onLogout={handleLogout}
    />
  );
}
