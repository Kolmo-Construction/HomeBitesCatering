// QuoteProposalView — the shared renderer for the customer-facing wedding
// proposal. Used in two places:
//
//   1. /quote/:token (public, token-keyed) via PublicQuote.tsx — mode="public"
//   2. /estimates/:id/view (admin) via AdminEstimatePreview.tsx — mode="preview"
//
// Both paths feed the same Proposal blob from estimate.proposal so the admin
// sees pixel-identical output to what the customer will see.

import { useState } from "react";
import { Helmet } from "react-helmet";
import homebitesLogo from "@assets/homebites-logo.avif";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Loader2,
  Heart,
  Wine,
  Utensils,
  Phone,
  Mail,
  Clock,
  Cake,
  Coffee,
  Pencil,
  Send,
  ArrowLeft,
  Eye,
} from "lucide-react";
import type { Proposal } from "@shared/proposal";

// ─── Props ────────────────────────────────────────────────────────────────────

export type QuoteViewMode = "public" | "preview";

// P0-3: categorized decline reason — aggregated for reporting
export type DeclineCategory = "pricing" | "menu" | "timing" | "other";
const DECLINE_OPTIONS: { value: DeclineCategory; label: string; blurb: string }[] = [
  { value: "pricing", label: "Pricing or budget", blurb: "The numbers didn't line up." },
  { value: "menu", label: "Menu or style", blurb: "The food wasn't quite the right fit." },
  { value: "timing", label: "Timing or logistics", blurb: "Date, location, or availability." },
  { value: "other", label: "Something else", blurb: "A different reason." },
];

export interface QuoteProposalViewProps {
  proposal: Proposal;
  estimateStatus: "draft" | "sent" | "viewed" | "accepted" | "declined";
  mode: QuoteViewMode;

  // Public mode — accept/decline handlers. The component owns the decline
  // form state internally and calls onDecline({ category, notes }) when the
  // customer confirms. Category is the structured P0-3 decline reason.
  onAccept?: () => void;
  onDecline?: (payload: { category: DeclineCategory | null; notes: string }) => void;
  acceptFlowState?: "idle" | "accepting" | "accepted" | "declining" | "declined";
  acceptedEventUrl?: string | null;

  // P0-2: "I need more info" — opens a conversation path. Parent submits the
  // note and returns the Cal.com booking URL, which this component embeds.
  onRequestInfo?: (note: string) => Promise<{ bookingUrl: string | null } | null>;
  infoFlowState?: "idle" | "submitting" | "submitted";
  // Pre-existing state pulled from the server (set if the user already clicked
  // "Need More Info" in a prior session or already booked a time).
  infoRequestedAt?: string | null;
  consultationBookedAt?: string | null;
  consultationMeetingUrl?: string | null;
  // Resolved Cal.com URL (from /booking-config) — used when re-opening the
  // embed on a subsequent visit.
  resolvedBookingUrl?: string | null;

  // Preview mode — admin actions
  onBack?: () => void;
  onEdit?: () => void;
  onSend?: () => void;
  sendLabel?: string;
  sendDisabled?: boolean;
  // Subtitle shown in the admin status bar (e.g. "Draft · last edited 2 hours ago")
  previewSubtitle?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "$0.00";
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCentsWhole(cents: number | null | undefined): string {
  if (cents == null) return "$0";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function formatLongDate(iso: string | null): string {
  if (!iso) return "Date to be confirmed";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMediumDate(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// 24h before the event date — used as the "balance due" deadline
function dayBefore(iso: string | null): string {
  if (!iso) return "the day before your event";
  const d = new Date(iso);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function titleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function serviceStyleLabel(s: string | null | undefined): string {
  switch (s) {
    case "buffet":
      return "Buffet";
    case "plated":
      return "Plated dinner";
    case "family_style":
      return "Family-style";
    case "cocktail_party":
      return "Cocktail reception";
    case "stations":
      return "Food stations";
    default:
      return s ? titleCase(s) : "";
  }
}

function menuThemeLabel(t: string | null | undefined): string {
  if (!t) return "";
  const map: Record<string, string> = {
    italy: "Italian",
    italian: "Italian",
    greece: "Greek",
    greek: "Greek",
    bbq: "American BBQ",
    taco_fiesta: "Taco Fiesta",
    kebab: "Mediterranean Kebab",
    vegan: "Plant-Based",
  };
  return map[t] ?? titleCase(t);
}

// Format "16:30" → "4:30 PM"
function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function coupleTitle(p: Proposal): string {
  if (p.partnerFirstName && p.firstName) {
    return `${p.firstName} & ${p.partnerFirstName}`;
  }
  if (p.firstName) return p.firstName;
  return "there";
}

function groupMenuSelections(
  selections: Proposal["menuSelections"],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!selections) return out;
  for (const sel of selections) {
    const cat = sel.category || "main";
    if (!out[cat]) out[cat] = [];
    out[cat].push(sel.name);
  }
  return out;
}

const CATEGORY_LABELS: Record<string, string> = {
  appetizer: "To Start",
  appetizers: "To Start",
  starters: "To Start",
  cocktail: "Cocktail Hour",
  entree: "The Main",
  main: "The Main",
  mains: "The Main",
  protein: "The Main",
  side: "On The Side",
  sides: "On The Side",
  dessert: "Sweet Endings",
  desserts: "Sweet Endings",
  beverage: "To Drink",
  beverages: "To Drink",
};

const CATEGORY_ORDER = [
  "appetizer",
  "appetizers",
  "starters",
  "cocktail",
  "entree",
  "main",
  "mains",
  "protein",
  "side",
  "sides",
  "dessert",
  "desserts",
  "beverage",
  "beverages",
];

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c.toLowerCase()] ?? titleCase(c);
}

function sortCategories(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.toLowerCase());
    const ib = CATEGORY_ORDER.indexOf(b.toLowerCase());
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function QuoteProposalView({
  proposal,
  estimateStatus,
  mode,
  onAccept,
  onDecline,
  acceptFlowState = "idle",
  acceptedEventUrl = null,
  onRequestInfo,
  infoFlowState = "idle",
  infoRequestedAt = null,
  consultationBookedAt = null,
  consultationMeetingUrl = null,
  resolvedBookingUrl = null,
  onBack,
  onEdit,
  onSend,
  sendLabel,
  sendDisabled,
  previewSubtitle,
}: QuoteProposalViewProps) {
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineCategory, setDeclineCategory] = useState<DeclineCategory | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoNote, setInfoNote] = useState("");
  const [activeBookingUrl, setActiveBookingUrl] = useState<string | null>(resolvedBookingUrl);

  const effectiveStatus =
    acceptFlowState === "accepted" || estimateStatus === "accepted"
      ? "accepted"
      : acceptFlowState === "declined" || estimateStatus === "declined"
      ? "declined"
      : "pending";

  // Pricing — all pulled from proposal.pricing (the source of truth)
  const guests = proposal.guestCount ?? 0;
  const perPersonCents =
    proposal.pricing.perPersonCents ??
    (guests > 0 ? Math.round(proposal.pricing.subtotalCents / guests) : 0);
  const subtotalCents = proposal.pricing.subtotalCents;
  const serviceFeeCents = proposal.pricing.serviceFeeCents ?? 0;
  const taxCents = proposal.pricing.taxCents;
  const totalCents = proposal.pricing.totalCents;
  const depositPercent = proposal.pricing.depositPercent ?? 35;
  const depositCents = Math.round((totalCents * depositPercent) / 100);
  const balanceCents = totalCents - depositCents;

  const eventDate = proposal.eventDate;
  const longDate = formatLongDate(eventDate);
  const balanceDueDate = dayBefore(eventDate);

  const groupedMenu = groupMenuSelections(proposal.menuSelections);
  const menuCategories = sortCategories(Object.keys(groupedMenu));
  const isWedding = (proposal.eventType || "").toLowerCase().includes("wedding");
  const venueName = proposal.venue?.name || "";
  const venueLine = proposal.venue
    ? [proposal.venue.street, proposal.venue.city, proposal.venue.state]
        .filter(Boolean)
        .join(", ")
    : "";

  const hasMenu =
    menuCategories.length > 0 ||
    (proposal.appetizers?.length ?? 0) > 0 ||
    (proposal.desserts?.length ?? 0) > 0 ||
    !!proposal.menuTheme;

  const hasTimeline = !!(
    proposal.hasCeremony ||
    proposal.hasCocktailHour ||
    proposal.hasMainMeal
  );

  const handleConfirmDecline = () => {
    if (onDecline) onDecline({ category: declineCategory, notes: declineReason.trim() });
  };

  // P0-2: open the modal. If the user already requested info in a prior
  // session, jump straight to the iframe using the previously-resolved URL.
  const handleNeedMoreInfoClick = () => {
    if (infoRequestedAt && activeBookingUrl) {
      setShowInfoModal(true);
      return;
    }
    setShowInfoModal(true);
  };

  const handleSubmitInfoRequest = async () => {
    if (!onRequestInfo) return;
    const result = await onRequestInfo(infoNote.trim());
    if (result?.bookingUrl) setActiveBookingUrl(result.bookingUrl);
  };

  return (
    <PageShell mode={mode}>
      <Helmet>
        <title>{coupleTitle(proposal)} · Wedding Proposal · Homebites</title>
      </Helmet>

      {/* ═══════════════ ADMIN PREVIEW BAR ═══════════════ */}
      {mode === "preview" && (
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-[#e8ddc8] bg-white/90 backdrop-blur px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack} className="shrink-0">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8B7355] font-semibold">
                <Eye className="h-3.5 w-3.5" />
                Customer Preview
              </div>
              <p className="text-sm text-stone-600 truncate">
                {previewSubtitle || "This is exactly what the customer will see."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" onClick={onEdit} data-testid="button-customize">
                <Pencil className="h-4 w-4 mr-1.5" />
                Customize
              </Button>
            )}
            {onSend && (
              <Button
                onClick={onSend}
                disabled={sendDisabled}
                className="bg-gradient-to-br from-[#8B7355] to-[#E28C0A] text-white hover:from-[#7a6449] hover:to-[#c77a00]"
                data-testid="button-send-quote"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {sendLabel || "Send to customer"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ STATUS BANNERS (public mode) ═══════════════ */}
      {mode === "public" && effectiveStatus === "accepted" && (
        <div className="mb-8 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-8 text-center shadow-sm">
          <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto mb-3" />
          <h2 className="font-serif text-3xl font-medium text-emerald-900">
            We&rsquo;re officially booked!
          </h2>
          <p className="text-emerald-800 mt-3 max-w-md mx-auto leading-relaxed">
            Thank you for choosing Homebites to be part of your day. We&rsquo;ll
            be in touch within 24 hours with the contract and deposit
            instructions.
          </p>
          {acceptedEventUrl && (
            <a
              href={acceptedEventUrl}
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-emerald-700 text-white text-sm font-medium rounded-full hover:bg-emerald-800 transition shadow-md"
            >
              <Heart className="h-4 w-4 fill-current" />
              Open your event page
            </a>
          )}
        </div>
      )}

      {mode === "public" && effectiveStatus === "declined" && (
        <div className="mb-8 rounded-3xl border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-700 leading-relaxed">
            We&rsquo;ve recorded that this proposal isn&rsquo;t the right fit. If
            anything changes — new date, different headcount, a tweak to the
            menu — just reply to our email and we&rsquo;ll start fresh.
          </p>
        </div>
      )}

      {/* ═══════════════ HERO CARD ═══════════════ */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-[#e0d0b3] bg-gradient-to-br from-[#fbf6ea] via-[#fdf8ec] to-[#faf0dc] shadow-sm">
        {/* Decorative corner ornaments */}
        <div className="absolute top-0 left-0 w-28 h-28 border-t-2 border-l-2 border-[#d4c09a] rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-28 h-28 border-t-2 border-r-2 border-[#d4c09a] rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-28 h-28 border-b-2 border-l-2 border-[#d4c09a] rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-28 h-28 border-b-2 border-r-2 border-[#d4c09a] rounded-br-3xl" />

        <div className="relative px-8 py-16 sm:py-20 text-center">
          {isWedding && (
            <div className="inline-flex items-center gap-3 text-[#8B7355] text-xs sm:text-sm uppercase tracking-[0.32em] mb-6 font-semibold">
              <span className="h-px w-10 bg-[#c9b089]" />
              <Heart className="h-3.5 w-3.5 fill-[#E28C0A] text-[#E28C0A]" />
              A Wedding Proposal
              <Heart className="h-3.5 w-3.5 fill-[#E28C0A] text-[#E28C0A]" />
              <span className="h-px w-10 bg-[#c9b089]" />
            </div>
          )}
          <h1
            className="font-serif text-6xl sm:text-7xl md:text-8xl text-stone-900 leading-[1.02] tracking-tight"
            style={{ fontOpticalSizing: "auto", fontVariationSettings: "'opsz' 144" }}
            data-testid="text-couple-title"
          >
            {coupleTitle(proposal)}
          </h1>
          <div className="flex items-center justify-center gap-5 mt-8">
            <span className="h-px w-16 bg-[#c9b089]" />
            <p className="text-stone-800 text-xl sm:text-2xl font-semibold">{longDate}</p>
            <span className="h-px w-16 bg-[#c9b089]" />
          </div>
          {venueName && (
            <p className="mt-4 text-stone-700 text-lg">
              {venueName}
              {venueLine && <span className="text-stone-500"> · {venueLine}</span>}
            </p>
          )}
          <p className="mt-10 max-w-xl mx-auto text-stone-700 leading-relaxed text-lg">
            {isWedding ? (
              <>
                Congratulations on your engagement. It would be our honor to feed
                your guests on the day you say <em>I do</em>. Here&rsquo;s what
                we&rsquo;ve put together for you.
              </>
            ) : (
              <>
                Thank you for thinking of us. Here&rsquo;s the proposal
                we&rsquo;ve put together for your event.
              </>
            )}
          </p>
        </div>
      </div>

      {/* ═══════════════ AT A GLANCE CARD ═══════════════ */}
      <Card kicker="The essentials" title="Your day at a glance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Fact icon={<Calendar className="h-4 w-4" />} label="Date" value={formatMediumDate(eventDate)} />
          <Fact icon={<Users className="h-4 w-4" />} label="Guests" value={`${guests}`} />
          <Fact
            icon={<Utensils className="h-4 w-4" />}
            label="Service"
            value={serviceStyleLabel(proposal.serviceStyle ?? proposal.serviceType) || "Custom"}
          />
          <Fact icon={<MapPin className="h-4 w-4" />} label="Venue" value={venueName || "TBD"} />
        </div>

        {hasTimeline && (
          <div className="mt-8 pt-8 border-t border-dashed border-[#e0d0b3]">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#8B7355] mb-4 font-semibold">
              <Clock className="h-3.5 w-3.5" />
              Timeline
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {proposal.hasCeremony && proposal.ceremonyStartTime && (
                <TimelineBlock
                  label="Ceremony"
                  start={proposal.ceremonyStartTime}
                  end={proposal.ceremonyEndTime ?? null}
                />
              )}
              {proposal.hasCocktailHour && proposal.cocktailStartTime && (
                <TimelineBlock
                  label="Cocktail hour"
                  start={proposal.cocktailStartTime}
                  end={proposal.cocktailEndTime ?? null}
                />
              )}
              {proposal.hasMainMeal && proposal.mainMealStartTime && (
                <TimelineBlock
                  label="Reception"
                  start={proposal.mainMealStartTime}
                  end={proposal.mainMealEndTime ?? null}
                />
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════ MENU CARD ═══════════════ */}
      {hasMenu && (
        <MenuCard
          title="The menu"
          subtitle={
            proposal.menuTheme
              ? `${menuThemeLabel(proposal.menuTheme)}${
                  proposal.menuTier ? ` · ${titleCase(proposal.menuTier)} package` : ""
                }`
              : undefined
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
            {menuCategories.map((cat) => (
              <MenuCourse key={cat} title={categoryLabel(cat)}>
                {groupedMenu[cat].map((name, i) => (
                  <MenuItem key={`${cat}-${i}`}>{name}</MenuItem>
                ))}
              </MenuCourse>
            ))}

            {proposal.appetizers && proposal.appetizers.length > 0 && (
              <MenuCourse title="Cocktail Hour Bites">
                {proposal.appetizers.map((a, i) => (
                  <MenuItem key={`app-${i}`}>
                    {a.itemName}
                    {a.quantity > 0 && (
                      <span className="text-stone-400 text-xs ml-1.5">({a.quantity} pieces)</span>
                    )}
                  </MenuItem>
                ))}
              </MenuCourse>
            )}

            {proposal.desserts && proposal.desserts.length > 0 && (
              <MenuCourse title="Sweet Endings" icon={<Cake className="h-3.5 w-3.5" />}>
                {proposal.desserts.map((d, i) => (
                  <MenuItem key={`d-${i}`}>
                    {d.itemName}
                    {d.quantity > 0 && (
                      <span className="text-stone-400 text-xs ml-1.5">({d.quantity})</span>
                    )}
                  </MenuItem>
                ))}
              </MenuCourse>
            )}

            {proposal.beverages &&
              (proposal.beverages.hasNonAlcoholic || proposal.beverages.hasAlcoholic) && (
                <MenuCourse title="The Bar" icon={<Wine className="h-3.5 w-3.5" />}>
                  {proposal.beverages.hasAlcoholic && proposal.beverages.bartendingType && (
                    <MenuItem>
                      {proposal.beverages.liquorQuality && (
                        <strong className="font-medium">
                          {titleCase(proposal.beverages.liquorQuality)}{" "}
                        </strong>
                      )}
                      bar service
                    </MenuItem>
                  )}
                  {proposal.beverages.nonAlcoholicSelections?.map((n, i) => (
                    <MenuItem key={`na-${i}`}>{titleCase(n)}</MenuItem>
                  ))}
                  {proposal.beverages.mocktails?.map((n, i) => (
                    <MenuItem key={`mt-${i}`}>Mocktail: {titleCase(n)}</MenuItem>
                  ))}
                  {proposal.beverages.coffeeTeaService && (
                    <MenuItem>
                      <span className="inline-flex items-center gap-1.5">
                        <Coffee className="h-3.5 w-3.5 text-stone-400" />
                        Coffee &amp; tea service
                      </span>
                    </MenuItem>
                  )}
                </MenuCourse>
              )}
          </div>

          {menuCategories.length === 0 && (proposal.appetizers?.length ?? 0) === 0 && (
            <p className="text-stone-600 text-base">
              Menu details will be confirmed during your tasting.
            </p>
          )}

          {/* Dietary callouts */}
          {proposal.dietary &&
            ((proposal.dietary.restrictions?.length ?? 0) > 0 ||
              (proposal.dietary.allergies?.length ?? 0) > 0 ||
              proposal.dietary.specialNotes) && (
              <div className="mt-8 pt-6 border-t border-dashed border-[#e0d0b3]">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#8B7355] mb-3 font-semibold">
                  Dietary accommodations
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {proposal.dietary.restrictions?.map((r) => (
                    <Badge
                      key={r}
                      className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-normal"
                    >
                      {titleCase(r)}
                    </Badge>
                  ))}
                  {proposal.dietary.allergies?.map((a) => (
                    <Badge
                      key={a}
                      className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 font-normal"
                    >
                      {titleCase(a)}-free
                    </Badge>
                  ))}
                </div>
                {proposal.dietary.specialNotes && (
                  <p className="text-sm text-stone-700">
                    &ldquo;{proposal.dietary.specialNotes}&rdquo;
                  </p>
                )}
              </div>
            )}
        </MenuCard>
      )}

      {/* ═══════════════ SPECIAL REQUESTS ═══════════════ */}
      {proposal.specialRequests && (
        <div className="mb-8 rounded-3xl border border-[#e0d0b3] bg-[#faf5e9]/60 p-8 shadow-sm">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#8B7355] mb-4 font-semibold">
            <Heart className="h-3.5 w-3.5 fill-[#E28C0A] text-[#E28C0A]" />
            Your special requests
          </div>
          <p className="text-stone-800 leading-relaxed whitespace-pre-wrap text-lg">
            &ldquo;{proposal.specialRequests}&rdquo;
          </p>
          <p className="mt-4 text-base text-stone-600">
            We&rsquo;ve noted these — they&rsquo;re part of the plan.
          </p>
        </div>
      )}

      {/* ═══════════════ INVESTMENT CARD ═══════════════ */}
      <Card kicker="Your investment" title="What it comes to">
        <div className="space-y-3.5 text-lg">
          {perPersonCents > 0 && guests > 0 && proposal.lineItems.length === 0 && (
            <Row
              label={`Catering · ${formatCents(perPersonCents)} × ${guests}`}
              value={formatCents(perPersonCents * guests)}
            />
          )}
          {proposal.lineItems.length > 0 &&
            proposal.lineItems.map((it, i) => (
              <Row
                key={it.id ?? i}
                label={`${it.name}${it.quantity > 1 ? ` × ${it.quantity}` : ""}`}
                value={formatCents(it.price * it.quantity)}
              />
            ))}
          {serviceFeeCents > 0 && <Row label="Service fee" value={formatCents(serviceFeeCents)} />}
          <Row label="Subtotal" value={formatCents(subtotalCents)} muted />
          <Row label="Tax" value={formatCents(taxCents)} muted />
        </div>

        <div className="mt-8 pt-6 border-t border-stone-200">
          <div className="flex justify-between items-baseline">
            <span className="text-xl text-stone-900 font-semibold">Total</span>
            <span
              className="font-serif text-5xl text-stone-900 tabular-nums"
              style={{ fontVariationSettings: "'opsz' 144" }}
              data-testid="text-total"
            >
              {formatCents(totalCents)}
            </span>
          </div>
          {guests > 0 && (
            <div className="text-right text-base text-stone-600 mt-2">
              {formatCents(Math.round(totalCents / guests))} per guest, all-in
            </div>
          )}
        </div>
      </Card>

      {/* ═══════════════ PAYMENT PLAN CARD ═══════════════ */}
      <Card kicker="Payment plan" title="Two simple payments">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <PaymentTile
            step="1 of 2"
            label="Deposit"
            amount={depositCents}
            percent={depositPercent}
            when="Due on signing"
            note="Locks in your date."
          />
          <PaymentTile
            step="2 of 2"
            label="Final balance"
            amount={balanceCents}
            percent={100 - depositPercent}
            when={`Due ${balanceDueDate}`}
            note="24 hours before your event."
          />
        </div>
      </Card>

      {/* ═══════════════ ACCEPT / DECLINE (public only) ═══════════════ */}
      {mode === "public" && effectiveStatus === "pending" && !showDeclineForm && (
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#8B7355] via-[#a67c5a] to-[#E28C0A] p-10 sm:p-12 text-center shadow-xl shadow-[#e0d0b3]">
          <p className="text-white text-2xl font-semibold mb-3">Ready to make it official?</p>
          <p className="text-[#fef9ed] text-base sm:text-lg mb-7 max-w-md mx-auto leading-relaxed">
            Accept the proposal and we&rsquo;ll send the contract and deposit
            instructions within 24 hours.
          </p>
          <Button
            size="lg"
            onClick={onAccept}
            disabled={acceptFlowState === "accepting"}
            className="h-16 px-12 text-lg bg-white text-[#8B7355] hover:bg-[#faf5e9] rounded-full shadow-xl font-semibold transition-all hover:scale-[1.02]"
            data-testid="button-accept"
          >
            {acceptFlowState === "accepting" ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Locking in your date…
              </>
            ) : (
              <>
                <Heart className="h-5 w-5 mr-2 fill-current" />
                Yes — let&rsquo;s do this
              </>
            )}
          </Button>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm">
            {onRequestInfo && (
              <button
                type="button"
                onClick={handleNeedMoreInfoClick}
                className="text-white hover:text-white underline underline-offset-4 font-medium"
                data-testid="button-need-more-info"
              >
                I need more info — let&rsquo;s talk
              </button>
            )}
            <a
              href="/tasting"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-white underline underline-offset-4 font-medium"
              data-testid="button-book-tasting"
            >
              🍴 Book a tasting first
            </a>
            <button
              type="button"
              onClick={() => setShowDeclineForm(true)}
              className="text-[#fdf4e3]/80 hover:text-white underline underline-offset-4"
              data-testid="button-show-decline"
            >
              I need to pass on this
            </button>
          </div>
          {consultationBookedAt && (
            <p className="mt-4 text-sm text-white/90" data-testid="consultation-booked-indicator">
              ✓ Call scheduled for {new Date(consultationBookedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* ═══════════════ "I NEED MORE INFO" MODAL ═══════════════ */}
      {mode === "public" && showInfoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-8 overflow-y-auto"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step 1: collect the optional note */}
            {!activeBookingUrl && infoFlowState !== "submitted" && (
              <div className="p-6 sm:p-8">
                <h3 className="text-2xl font-serif text-stone-900 mb-2">
                  Let&rsquo;s talk it through
                </h3>
                <p className="text-stone-600 mb-5">
                  What would you like to discuss? Totally optional — you can skip and
                  go straight to booking a time.
                </p>
                <Textarea
                  value={infoNote}
                  onChange={(e) => setInfoNote(e.target.value)}
                  placeholder="e.g. 'Can we swap the salmon for something else?', 'Curious about budget flexibility', 'Want to ask about timing on the day…'"
                  rows={4}
                  className="border-stone-300 mb-4"
                  data-testid="input-info-note"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowInfoModal(false);
                      setInfoNote("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-[#8B7355] hover:bg-[#7a6448] text-white"
                    disabled={infoFlowState === "submitting"}
                    onClick={handleSubmitInfoRequest}
                    data-testid="button-confirm-need-info"
                  >
                    {infoFlowState === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Getting calendar…
                      </>
                    ) : (
                      "Pick a time →"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Cal.com embed (or fallback) */}
            {activeBookingUrl && (
              <div>
                <div className="px-6 pt-5 pb-3 border-b border-stone-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-serif text-stone-900">Pick a time to talk</h3>
                    <p className="text-sm text-stone-500">Zoom or phone — your choice.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInfoModal(false)}
                    className="text-stone-400 hover:text-stone-700 text-2xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <iframe
                  src={activeBookingUrl}
                  className="w-full h-[70vh] border-0"
                  title="Book a consultation"
                  data-testid="iframe-cal-booking"
                />
              </div>
            )}

            {/* Fallback: no Cal.com configured */}
            {!activeBookingUrl && infoFlowState === "submitted" && (
              <div className="p-8 text-center">
                <p className="text-stone-700 mb-2">
                  Thanks — we&rsquo;ve got your message.
                </p>
                <p className="text-stone-500 text-sm mb-4">
                  We&rsquo;ll reach out shortly to set up a call.
                </p>
                <Button onClick={() => setShowInfoModal(false)}>Close</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "public" && effectiveStatus === "pending" && showDeclineForm && (
        <div className="mb-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-base text-stone-700 mb-1">
            We&rsquo;re sorry to hear this isn&rsquo;t the right fit.
          </p>
          <p className="text-sm text-stone-500 mb-4">
            If you don&rsquo;t mind, which of these was closest to the reason?
          </p>

          <div className="space-y-2 mb-4">
            {DECLINE_OPTIONS.map((opt) => {
              const selected = declineCategory === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeclineCategory(opt.value)}
                  data-testid={`decline-option-${opt.value}`}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selected
                      ? "border-[#8B7355] bg-[#faf5e9] ring-2 ring-[#E28C0A]/30"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="font-medium text-stone-900 text-sm">{opt.label}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{opt.blurb}</div>
                </button>
              );
            })}
          </div>

          <label className="text-sm text-stone-700 block mb-1">
            Anything else we should know? <span className="text-stone-400">(optional)</span>
          </label>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Any detail helps — no pressure either way."
            rows={3}
            className="border-stone-300"
            data-testid="input-decline-notes"
          />

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowDeclineForm(false);
                setDeclineCategory(null);
                setDeclineReason("");
              }}
            >
              Back
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-stone-400 text-stone-700 hover:bg-stone-100"
              disabled={acceptFlowState === "declining" || !declineCategory}
              onClick={handleConfirmDecline}
              data-testid="button-confirm-decline"
            >
              {acceptFlowState === "declining" ? "Sending…" : "Send feedback"}
            </Button>
          </div>
          <p className="text-xs text-stone-400 mt-2 text-center">
            Takes 10 seconds. No login needed.
          </p>
        </div>
      )}

      {/* ═══════════════ SIGN-OFF ═══════════════ */}
      <div className="mt-14 mb-6 text-center max-w-lg mx-auto">
        <p className="text-stone-700 text-lg">
          {isWedding ? (
            <>Looking forward to celebrating with you,</>
          ) : (
            <>Looking forward to working with you,</>
          )}
        </p>
        <p
          className="font-serif text-3xl text-stone-900 mt-3"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          Mike &amp; the Homebites team
        </p>
        <div className="mt-7 pt-7 border-t border-[#e0d0b3] flex flex-col sm:flex-row gap-5 justify-center text-base text-stone-700">
          <a
            href="tel:+12065550100"
            className="flex items-center gap-2 justify-center hover:text-[#8B7355] transition font-medium"
          >
            <Phone className="h-4 w-4" />
            (206) 555-0100
          </a>
          <a
            href="mailto:hello@homebitescatering.com"
            className="flex items-center gap-2 justify-center hover:text-[#8B7355] transition font-medium"
          >
            <Mail className="h-4 w-4" />
            hello@homebitescatering.com
          </a>
        </div>
        <p className="text-base text-stone-600 mt-7 leading-relaxed">
          Questions about anything in this proposal? Reply to our email or give
          us a call — we&rsquo;d love to hear from you.
        </p>
      </div>
    </PageShell>
  );
}

// ─── Layout primitives ─────────────────────────────────────────────────────

function PageShell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: QuoteViewMode;
}) {
  return (
    <div
      className="min-h-screen bg-[#fbf6ea] pb-20"
      style={{ fontFeatureSettings: '"ss01", "ss02"' }}
    >
      {/* Homebites branded header — rendered in both modes so the admin sees
          exactly what the customer sees (plus the preview bar below). */}
      <header className="w-full bg-white/85 backdrop-blur-sm border-b border-[#e8ddc8] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <img src={homebitesLogo} alt="Homebites" className="h-10" />
          <div>
            <p
              className="font-serif font-semibold text-lg leading-tight text-stone-900"
              style={{ fontVariationSettings: "'opsz' 144" }}
            >
              Homebites Catering
            </p>
            <p className="text-xs text-[#8B7355] font-medium">
              {mode === "preview" ? "Customer proposal preview" : "Crafted for your celebration"}
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-12">{children}</main>
    </div>
  );
}

function Card({
  kicker,
  title,
  children,
  className = "",
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mb-8 bg-white rounded-3xl border border-[#e8ddc8] shadow-sm overflow-hidden ${className}`}
    >
      <header className="px-8 pt-8 pb-5">
        <div className="text-xs uppercase tracking-[0.25em] text-[#8B7355] font-semibold">{kicker}</div>
        <h2
          className="font-serif text-[32px] sm:text-4xl text-stone-900 mt-2 leading-tight"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          {title}
        </h2>
      </header>
      <div className="px-8 pb-8">{children}</div>
    </section>
  );
}

function MenuCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-3xl border-2 border-double border-[#d4c09a] bg-gradient-to-b from-[#fbf5ea] via-[#fefaf0] to-white shadow-sm overflow-hidden">
      <div className="px-8 pt-10 pb-2 text-center">
        <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] text-[#8B7355] mb-4 font-semibold">
          <span className="h-px w-12 bg-[#c9b089]" />
          Menu
          <span className="h-px w-12 bg-[#c9b089]" />
        </div>
        <h2
          className="font-serif text-5xl sm:text-6xl text-stone-900 leading-tight"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          {title}
        </h2>
        {subtitle && <p className="mt-3 text-stone-600 text-lg">{subtitle}</p>}
        <div className="mx-auto mt-6 w-24 h-px bg-gradient-to-r from-transparent via-[#c9b089] to-transparent" />
      </div>
      <div className="px-8 pt-6 pb-10">{children}</div>
    </section>
  );
}

function MenuCourse({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3
        className="font-serif italic text-2xl text-stone-900 mb-4 flex items-center gap-2"
        style={{ fontVariationSettings: "'opsz' 144" }}
      >
        {icon && <span className="text-[#b8926a]">{icon}</span>}
        {title}
      </h3>
      <ul className="space-y-2.5 text-stone-800 leading-relaxed">{children}</ul>
    </div>
  );
}

function MenuItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-3 text-lg">
      <span className="text-[#c9b089] select-none leading-none">·</span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#faf5e9]/60 border border-[#e8ddc8] px-5 py-5">
      <div className="flex items-center gap-1.5 text-[#8B7355] text-xs uppercase tracking-[0.18em] mb-2 font-semibold">
        {icon}
        {label}
      </div>
      <div
        className="text-stone-900 text-lg font-semibold leading-snug truncate"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function TimelineBlock({
  label,
  start,
  end,
}: {
  label: string;
  start: string;
  end: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[#e8ddc8] bg-[#faf5e9]/70 px-5 py-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[#8B7355] font-semibold">{label}</div>
      <div className="mt-1.5 text-stone-900 text-lg font-semibold tabular-nums">
        {formatTime(start)}
        {end ? ` – ${formatTime(end)}` : ""}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-baseline gap-4 ${
        muted ? "text-stone-500" : "text-stone-800"
      }`}
    >
      <span className="truncate">{label}</span>
      <span className="tabular-nums shrink-0 font-medium">{value}</span>
    </div>
  );
}

function PaymentTile({
  step,
  label,
  amount,
  percent,
  when,
  note,
}: {
  step: string;
  label: string;
  amount: number;
  percent: number;
  when: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e8ddc8] bg-[#faf5e9]/50 p-6">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] font-semibold text-[#8B7355]">
        <span>Step {step}</span>
        <span>{percent}%</span>
      </div>
      <p className="mt-3 text-xl text-stone-900 font-semibold">{label}</p>
      <p
        className="mt-2 font-serif text-4xl text-stone-900 tabular-nums leading-none"
        style={{ fontVariationSettings: "'opsz' 144" }}
      >
        {formatCentsWhole(amount)}
      </p>
      <p className="text-base text-stone-800 mt-4 font-medium">{when}</p>
      <p className="text-base text-stone-600 mt-1">{note}</p>
    </div>
  );
}
