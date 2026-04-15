import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  XCircle,
  Loader2,
  Heart,
  Wine,
  Utensils,
  Phone,
  Mail,
  Clock,
  Cake,
  Coffee,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteLineItem {
  id?: string;
  name: string;
  quantity: number;
  price: number; // in cents
}

interface PublicEstimate {
  id: number;
  eventType: string;
  eventDate: string | null;
  guestCount: number | null;
  venue: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueZip: string | null;
  items: QuoteLineItem[] | string | null;
  additionalServices: unknown;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined";
  notes: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
}

interface PublicClient {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

// Wedding-specific richness pulled from the source quote_request
interface PublicWedding {
  firstName: string;
  lastName: string;
  partnerFirstName: string | null;
  partnerLastName: string | null;
  eventType: string;
  eventDate: string | null;
  guestCount: number;
  venueName: string | null;
  venueAddress: { street?: string; city?: string; state?: string; zip?: string } | null;
  hasCeremony: boolean | null;
  ceremonyStartTime: string | null;
  ceremonyEndTime: string | null;
  serviceType: string | null;
  serviceStyle: string | null;
  hasCocktailHour: boolean | null;
  cocktailStartTime: string | null;
  cocktailEndTime: string | null;
  hasMainMeal: boolean | null;
  mainMealStartTime: string | null;
  mainMealEndTime: string | null;
  menuTheme: string | null;
  menuTier: string | null;
  menuSelections: Array<{ name: string; category: string; itemId?: string; upcharge?: number }> | null;
  appetizers: { serviceStyle?: string; selections: Array<{ itemName: string; quantity: number; pricePerPiece: number; subtotal: number; category: string }> } | null;
  desserts: Array<{ itemName: string; quantity: number; pricePerPiece: number; subtotal: number }> | null;
  beverages: {
    hasNonAlcoholic: boolean;
    nonAlcoholicSelections?: string[];
    mocktails?: string[];
    hasAlcoholic: boolean;
    bartendingType?: string;
    liquorQuality?: string;
    coffeeTeaService?: boolean;
  } | null;
  equipment: { items: Array<{ item: string; quantity: number; pricePerUnit: number; subtotal: number; category: string }>; otherNotes?: string } | null;
  dietary: { restrictions?: string[]; allergies?: string[]; specialNotes?: string } | null;
  specialRequests: string | null;
  estimatedPerPersonCents: number | null;
  estimatedSubtotalCents: number | null;
  estimatedServiceFeeCents: number | null;
  estimatedTaxCents: number | null;
  estimatedTotalCents: number | null;
}

interface PublicQuotePayload {
  estimate: PublicEstimate;
  client: PublicClient | null;
  wedding: PublicWedding | null;
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

// Line items may be stored as JSONB or a JSON string — normalize.
function parseLineItems(raw: QuoteLineItem[] | string | null): QuoteLineItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function titleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function serviceStyleLabel(s: string | null): string {
  switch (s) {
    case "buffet": return "Buffet";
    case "plated": return "Plated dinner";
    case "family_style": return "Family-style";
    case "cocktail_party": return "Cocktail reception";
    case "stations": return "Food stations";
    default: return s ? titleCase(s) : "";
  }
}

function menuThemeLabel(t: string | null): string {
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
function formatTime(t: string | null): string {
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

// Title for the couple — uses partner names if both present
function coupleTitle(w: PublicWedding | null, c: PublicClient | null): string {
  if (w?.partnerFirstName && w.firstName) {
    return `${w.firstName} & ${w.partnerFirstName}`;
  }
  if (w?.firstName) return w.firstName;
  if (c?.firstName) return c.firstName;
  return "there";
}

// Group menu selections by category for the menu section
function groupMenuSelections(
  selections: PublicWedding["menuSelections"],
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

// Display order for menu categories
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

export default function PublicQuote() {
  const [, params] = useRoute("/quote/:token");
  const token = params?.token ?? null;

  const [localStatus, setLocalStatus] = useState<
    "idle" | "accepting" | "accepted" | "declining" | "declined"
  >("idle");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [eventPublicUrl, setEventPublicUrl] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<PublicQuotePayload>({
    queryKey: [`/api/public/quote/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/quote/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to load quote");
      }
      return res.json();
    },
    enabled: !!token,
  });

  // Stamp viewedAt the first time the customer opens the quote
  useEffect(() => {
    if (!token || !data) return;
    fetch(`/api/public/quote/${token}/view`, { method: "POST" }).catch(() => undefined);
  }, [token, data?.estimate.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!data) return;
    if (data.estimate.status === "accepted") setLocalStatus("accepted");
    else if (data.estimate.status === "declined") setLocalStatus("declined");
  }, [data]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/quote/${token}/accept`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to accept quote");
      }
      return res.json() as Promise<{ ok: boolean; eventPublicUrl?: string | null }>;
    },
    onMutate: () => setLocalStatus("accepting"),
    onSuccess: (result) => {
      setLocalStatus("accepted");
      if (result.eventPublicUrl) setEventPublicUrl(result.eventPublicUrl);
      refetch();
    },
    onError: (e: Error) => {
      setLocalStatus("idle");
      alert(e.message);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/public/quote/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to decline quote");
      }
      return res.json();
    },
    onMutate: () => setLocalStatus("declining"),
    onSuccess: () => {
      setLocalStatus("declined");
      setShowDeclineForm(false);
      refetch();
    },
    onError: (e: Error) => {
      setLocalStatus("idle");
      alert(e.message);
    },
  });

  const estimate = data?.estimate;
  const client = data?.client ?? null;
  const wedding = data?.wedding ?? null;
  const lineItems = useMemo(() => parseLineItems(estimate?.items ?? null), [estimate?.items]);

  // ─── Loading / error ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-32 text-stone-500">
          <Loader2 className="h-10 w-10 animate-spin mb-3" />
          <p>Loading your proposal…</p>
        </div>
      </PageShell>
    );
  }

  if (isError || !estimate) {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-rose-200 p-12 text-center shadow-sm">
          <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-serif font-semibold mb-1">Proposal not found</h2>
          <p className="text-stone-600">
            This link may have expired. Please reach out to us directly and we&rsquo;ll send you a fresh one.
          </p>
        </div>
      </PageShell>
    );
  }

  const effectiveStatus =
    localStatus === "accepted" || estimate.status === "accepted"
      ? "accepted"
      : localStatus === "declined" || estimate.status === "declined"
      ? "declined"
      : "pending";

  // Pricing — prefer the source quote's per-person if available, else compute from estimate
  const guests = wedding?.guestCount ?? estimate.guestCount ?? 0;
  const perPersonCents = wedding?.estimatedPerPersonCents
    ?? (guests > 0 ? Math.round(estimate.subtotal / guests) : 0);
  const subtotalCents = estimate.subtotal;
  const serviceFeeCents = wedding?.estimatedServiceFeeCents ?? 0;
  const taxCents = estimate.tax;
  const totalCents = estimate.total;

  // 35% / 65% payment split
  const depositCents = Math.round(totalCents * 0.35);
  const balanceCents = totalCents - depositCents;

  const eventDate = wedding?.eventDate ?? estimate.eventDate;
  const longDate = formatLongDate(eventDate);
  const balanceDueDate = dayBefore(eventDate);

  const groupedMenu = groupMenuSelections(wedding?.menuSelections ?? null);
  const menuCategories = sortCategories(Object.keys(groupedMenu));
  const isWedding = (wedding?.eventType ?? estimate.eventType ?? "").toLowerCase().includes("wedding");
  const venueName = wedding?.venueName || estimate.venue || "";
  const venueLine = wedding?.venueAddress
    ? [wedding.venueAddress.street, wedding.venueAddress.city, wedding.venueAddress.state].filter(Boolean).join(", ")
    : [estimate.venueAddress, estimate.venueCity].filter(Boolean).join(", ");

  const hasMenu =
    menuCategories.length > 0 ||
    (wedding?.appetizers?.selections?.length ?? 0) > 0 ||
    (wedding?.desserts?.length ?? 0) > 0 ||
    !!wedding?.menuTheme;

  const hasTimeline =
    !!wedding &&
    !!(wedding.hasCeremony || wedding.hasCocktailHour || wedding.hasMainMeal);

  return (
    <PageShell>
      <Helmet>
        <title>{coupleTitle(wedding, client)} · Wedding Proposal · Homebites</title>
      </Helmet>

      {/* ═══════════════ STATUS BANNERS ═══════════════ */}
      {effectiveStatus === "accepted" && (
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
          {eventPublicUrl && (
            <a
              href={eventPublicUrl}
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-emerald-700 text-white text-sm font-medium rounded-full hover:bg-emerald-800 transition shadow-md"
            >
              <Heart className="h-4 w-4 fill-current" />
              Open your event page
            </a>
          )}
        </div>
      )}

      {effectiveStatus === "declined" && (
        <div className="mb-8 rounded-3xl border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-700 leading-relaxed">
            We&rsquo;ve recorded that this proposal isn&rsquo;t the right fit. If
            anything changes — new date, different headcount, a tweak to the
            menu — just reply to our email and we&rsquo;ll start fresh.
          </p>
        </div>
      )}

      {/* ═══════════════ HERO CARD ═══════════════ */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-amber-50/40 to-rose-50/60 shadow-sm">
        {/* Decorative corner ornaments */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t border-l border-rose-200/70 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-rose-200/70 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 border-b border-l border-rose-200/70 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b border-r border-rose-200/70 rounded-br-3xl" />

        <div className="relative px-8 py-14 sm:py-16 text-center">
          {isWedding && (
            <div className="inline-flex items-center gap-3 text-rose-700/80 text-[10px] uppercase tracking-[0.35em] mb-5 font-medium">
              <span className="h-px w-8 bg-rose-300" />
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
              A Wedding Proposal
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
              <span className="h-px w-8 bg-rose-300" />
            </div>
          )}
          <h1
            className="font-serif text-5xl sm:text-6xl md:text-7xl text-stone-900 leading-[1.05] tracking-tight"
            style={{ fontOpticalSizing: "auto", fontVariationSettings: "'opsz' 144" }}
            data-testid="text-couple-title"
          >
            {coupleTitle(wedding, client)}
          </h1>
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className="h-px w-12 bg-stone-300" />
            <p className="text-stone-800 text-lg sm:text-xl font-medium">{longDate}</p>
            <span className="h-px w-12 bg-stone-300" />
          </div>
          {venueName && (
            <p className="mt-3 text-stone-600 text-base">
              {venueName}
              {venueLine && <span className="text-stone-500"> · {venueLine}</span>}
            </p>
          )}
          <p className="mt-8 max-w-lg mx-auto text-stone-700 leading-relaxed text-base">
            {isWedding ? (
              <>
                Congratulations on your engagement. It would be our honor to feed
                your guests on the day you say <em>I do</em>. Here&rsquo;s what
                we&rsquo;ve put together for you.
              </>
            ) : (
              <>Thank you for thinking of us. Here&rsquo;s the proposal we&rsquo;ve put together for your event.</>
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
            value={serviceStyleLabel(wedding?.serviceStyle ?? wedding?.serviceType ?? null) || "Custom"}
          />
          <Fact
            icon={<MapPin className="h-4 w-4" />}
            label="Venue"
            value={venueName || "TBD"}
          />
        </div>

        {hasTimeline && (
          <div className="mt-6 pt-6 border-t border-dashed border-stone-200">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-4">
              <Clock className="h-3 w-3" />
              Timeline
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {wedding!.hasCeremony && wedding!.ceremonyStartTime && (
                <TimelineBlock
                  label="Ceremony"
                  start={wedding!.ceremonyStartTime}
                  end={wedding!.ceremonyEndTime}
                />
              )}
              {wedding!.hasCocktailHour && wedding!.cocktailStartTime && (
                <TimelineBlock
                  label="Cocktail hour"
                  start={wedding!.cocktailStartTime}
                  end={wedding!.cocktailEndTime}
                />
              )}
              {wedding!.hasMainMeal && wedding!.mainMealStartTime && (
                <TimelineBlock
                  label="Reception"
                  start={wedding!.mainMealStartTime}
                  end={wedding!.mainMealEndTime}
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
            wedding?.menuTheme
              ? `${menuThemeLabel(wedding.menuTheme)}${wedding.menuTier ? ` · ${titleCase(wedding.menuTier)} package` : ""}`
              : undefined
          }
        >
          {menuCategories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
              {menuCategories.map((cat) => (
                <MenuCourse key={cat} title={categoryLabel(cat)}>
                  {groupedMenu[cat].map((name, i) => (
                    <MenuItem key={`${cat}-${i}`}>{name}</MenuItem>
                  ))}
                </MenuCourse>
              ))}

              {wedding?.appetizers?.selections && wedding.appetizers.selections.length > 0 && (
                <MenuCourse title="Cocktail Hour Bites">
                  {wedding.appetizers.selections.map((a, i) => (
                    <MenuItem key={`app-${i}`}>
                      {a.itemName}
                      {a.quantity > 0 && (
                        <span className="text-stone-400 text-xs ml-1.5">({a.quantity} pieces)</span>
                      )}
                    </MenuItem>
                  ))}
                </MenuCourse>
              )}

              {wedding?.desserts && wedding.desserts.length > 0 && (
                <MenuCourse title="Sweet Endings" icon={<Cake className="h-3.5 w-3.5" />}>
                  {wedding.desserts.map((d, i) => (
                    <MenuItem key={`d-${i}`}>
                      {d.itemName}
                      {d.quantity > 0 && (
                        <span className="text-stone-400 text-xs ml-1.5">({d.quantity})</span>
                      )}
                    </MenuItem>
                  ))}
                </MenuCourse>
              )}

              {wedding?.beverages &&
                (wedding.beverages.hasNonAlcoholic || wedding.beverages.hasAlcoholic) && (
                  <MenuCourse title="The Bar" icon={<Wine className="h-3.5 w-3.5" />}>
                    {wedding.beverages.hasAlcoholic && wedding.beverages.bartendingType && (
                      <MenuItem>
                        {wedding.beverages.liquorQuality && (
                          <strong className="font-medium">
                            {titleCase(wedding.beverages.liquorQuality)}{" "}
                          </strong>
                        )}
                        bar service
                      </MenuItem>
                    )}
                    {wedding.beverages.nonAlcoholicSelections?.map((n, i) => (
                      <MenuItem key={`na-${i}`}>{titleCase(n)}</MenuItem>
                    ))}
                    {wedding.beverages.mocktails?.map((n, i) => (
                      <MenuItem key={`mt-${i}`}>Mocktail: {titleCase(n)}</MenuItem>
                    ))}
                    {wedding.beverages.coffeeTeaService && (
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
          )}

          {menuCategories.length === 0 && !wedding?.appetizers?.selections?.length && (
            <p className="text-stone-600 text-base">
              Menu details will be confirmed during your tasting.
            </p>
          )}

          {/* Dietary callouts */}
          {wedding?.dietary &&
            ((wedding.dietary.restrictions?.length ?? 0) > 0 ||
              (wedding.dietary.allergies?.length ?? 0) > 0 ||
              wedding.dietary.specialNotes) && (
              <div className="mt-8 pt-6 border-t border-dashed border-rose-200/60">
                <p className="text-[10px] uppercase tracking-[0.25em] text-rose-700/70 mb-3 font-medium">
                  Dietary accommodations
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {wedding.dietary.restrictions?.map((r) => (
                    <Badge
                      key={r}
                      className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-normal"
                    >
                      {titleCase(r)}
                    </Badge>
                  ))}
                  {wedding.dietary.allergies?.map((a) => (
                    <Badge
                      key={a}
                      className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 font-normal"
                    >
                      {titleCase(a)}-free
                    </Badge>
                  ))}
                </div>
                {wedding.dietary.specialNotes && (
                  <p className="text-sm text-stone-700">
                    &ldquo;{wedding.dietary.specialNotes}&rdquo;
                  </p>
                )}
              </div>
            )}
        </MenuCard>
      )}

      {/* ═══════════════ SPECIAL REQUESTS ═══════════════ */}
      {wedding?.specialRequests && (
        <div className="mb-8 rounded-3xl border border-rose-200/70 bg-rose-50/40 p-7 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-rose-700/80 mb-3">
            <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
            Your special requests
          </div>
          <p className="text-stone-800 leading-relaxed whitespace-pre-wrap text-base">
            &ldquo;{wedding.specialRequests}&rdquo;
          </p>
          <p className="mt-3 text-sm text-stone-600">We&rsquo;ve noted these — they&rsquo;re part of the plan.</p>
        </div>
      )}

      {/* ═══════════════ TWO-COLUMN: INVESTMENT + PAYMENT PLAN ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Investment card */}
        <div className="lg:col-span-3">
          <Card kicker="Your investment" title="What it comes to">
            <div className="space-y-3 text-base">
              {perPersonCents > 0 && guests > 0 && (
                <Row
                  label={`Catering · ${formatCents(perPersonCents)} × ${guests}`}
                  value={formatCents(perPersonCents * guests)}
                />
              )}
              {perPersonCents === 0 &&
                lineItems.map((it, i) => (
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

            <div className="mt-6 pt-5 border-t border-stone-200">
              <div className="flex justify-between items-baseline">
                <span className="font-serif text-lg text-stone-900">Total</span>
                <span
                  className="font-serif text-4xl text-stone-900 tabular-nums"
                  style={{ fontVariationSettings: "'opsz' 144" }}
                  data-testid="text-total"
                >
                  {formatCents(totalCents)}
                </span>
              </div>
              {guests > 0 && (
                <div className="text-right text-sm text-stone-600 mt-1.5">
                  {formatCents(Math.round(totalCents / guests))} per guest, all-in
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Payment plan card */}
        <div className="lg:col-span-2">
          <Card kicker="Payment plan" title="Two simple payments" className="h-full">
            <PaymentTile
              step="1 of 2"
              label="Deposit"
              amount={depositCents}
              percent={35}
              when="Due on signing"
              note="Locks in your date."
              accent="rose"
            />
            <div className="my-4 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
            <PaymentTile
              step="2 of 2"
              label="Final balance"
              amount={balanceCents}
              percent={65}
              when={`Due ${balanceDueDate}`}
              note="24 hours before your event."
              accent="stone"
            />
          </Card>
        </div>
      </div>

      {/* ═══════════════ ACCEPT / DECLINE CARD ═══════════════ */}
      {effectiveStatus === "pending" && !showDeclineForm && (
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-rose-600 via-rose-600 to-rose-700 p-8 sm:p-10 text-center shadow-lg shadow-rose-200">
          <p className="text-white text-xl font-medium mb-2">Ready to make it official?</p>
          <p className="text-rose-50 text-base mb-6 max-w-sm mx-auto leading-relaxed">
            Accept the proposal and we&rsquo;ll send the contract and deposit instructions within 24 hours.
          </p>
          <Button
            size="lg"
            onClick={() => acceptMutation.mutate()}
            disabled={localStatus === "accepting"}
            className="h-14 px-10 text-base bg-white text-rose-700 hover:bg-rose-50 rounded-full shadow-xl font-medium transition-all hover:scale-[1.02]"
            data-testid="button-accept"
          >
            {localStatus === "accepting" ? (
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
          <p className="mt-5 text-sm">
            <button
              type="button"
              onClick={() => setShowDeclineForm(true)}
              className="text-rose-100/80 hover:text-white underline underline-offset-4"
              data-testid="button-show-decline"
            >
              I need to pass on this
            </button>
          </p>
        </div>
      )}

      {effectiveStatus === "pending" && showDeclineForm && (
        <div className="mb-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-base text-stone-700 mb-3">
            We&rsquo;re sorry to hear this isn&rsquo;t the right fit. If you don&rsquo;t
            mind sharing why, it helps us improve.
          </p>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Optional — budget, timing, found another caterer, change of plans…"
            rows={3}
            className="border-stone-300"
          />
          <div className="flex gap-2 mt-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeclineForm(false)}>
              Back
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-stone-400 text-stone-700 hover:bg-stone-100"
              disabled={localStatus === "declining"}
              onClick={() => declineMutation.mutate(declineReason.trim())}
              data-testid="button-confirm-decline"
            >
              {localStatus === "declining" ? "Sending…" : "Confirm"}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════ SIGN-OFF ═══════════════ */}
      <div className="mt-12 mb-6 text-center max-w-md mx-auto">
        <p className="text-stone-700 text-base">
          {isWedding ? <>Looking forward to celebrating with you,</> : <>Looking forward to working with you,</>}
        </p>
        <p
          className="font-serif text-2xl text-stone-900 mt-2"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          Mike &amp; the Homebites team
        </p>
        <div className="mt-6 pt-6 border-t border-stone-200 flex flex-col sm:flex-row gap-4 justify-center text-sm text-stone-700">
          <a href="tel:+12065550100" className="flex items-center gap-2 justify-center hover:text-rose-700 transition">
            <Phone className="h-4 w-4" />
            (206) 555-0100
          </a>
          <a
            href="mailto:hello@homebitescatering.com"
            className="flex items-center gap-2 justify-center hover:text-rose-700 transition"
          >
            <Mail className="h-4 w-4" />
            hello@homebitescatering.com
          </a>
        </div>
        <p className="text-sm text-stone-500 mt-6">
          Questions about anything in this proposal? Reply to our email or give us a call — we&rsquo;d love to hear from you.
        </p>
      </div>
    </PageShell>
  );
}

// ─── Layout primitives ─────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fbf8f4] pb-16" style={{ fontFeatureSettings: '"ss01", "ss02"' }}>
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-sm border-b border-stone-200/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <img src={homebitesLogo} alt="Homebites" className="h-9" />
          <div>
            <p
              className="font-serif font-medium text-base leading-tight text-stone-900"
              style={{ fontVariationSettings: "'opsz' 144" }}
            >
              Homebites Catering
            </p>
            <p className="text-[11px] text-stone-500">Crafted for your celebration</p>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 sm:px-6 py-10">{children}</main>
    </div>
  );
}

/** Standard content card with kicker + title header */
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
    <section className={`mb-8 bg-white rounded-3xl border border-stone-200/70 shadow-sm overflow-hidden ${className}`}>
      <header className="px-7 pt-7 pb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-rose-700/70 font-medium">{kicker}</div>
        <h2
          className="font-serif text-2xl sm:text-[28px] text-stone-900 mt-1 leading-tight"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          {title}
        </h2>
      </header>
      <div className="px-7 pb-7">{children}</div>
    </section>
  );
}

/** Special ornate card specifically for the menu — looks like a keepsake menu */
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
    <section className="mb-8 rounded-3xl border-2 border-double border-rose-200/80 bg-gradient-to-b from-[#fbf5ef] to-white shadow-sm overflow-hidden">
      <div className="px-7 pt-9 pb-2 text-center">
        <div className="flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em] text-rose-700/80 mb-3">
          <span className="h-px w-10 bg-rose-300" />
          Menu
          <span className="h-px w-10 bg-rose-300" />
        </div>
        <h2
          className="font-serif text-4xl sm:text-5xl text-stone-900 leading-tight"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-stone-600 text-base">{subtitle}</p>
        )}
        <div className="mx-auto mt-4 w-16 h-px bg-gradient-to-r from-transparent via-rose-300 to-transparent" />
      </div>
      <div className="px-8 pt-4 pb-9">{children}</div>
    </section>
  );
}

/** A single course/section inside the menu card */
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
        className="font-serif italic text-xl text-stone-900 mb-3 flex items-center gap-2"
        style={{ fontVariationSettings: "'opsz' 144" }}
      >
        {icon && <span className="text-rose-400">{icon}</span>}
        {title}
      </h3>
      <ul className="space-y-2 text-stone-800 leading-relaxed">{children}</ul>
    </div>
  );
}

function MenuItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-2.5 text-base">
      <span className="text-rose-300 select-none leading-none">·</span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

/** Compact key/value stat used in the at-a-glance card */
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
    <div className="rounded-2xl bg-stone-50 border border-stone-100 px-4 py-4">
      <div className="flex items-center gap-1.5 text-stone-500 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">
        {icon}
        {label}
      </div>
      <div
        className="text-stone-900 text-base font-semibold leading-snug truncate"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

/** Horizontal timeline block used in the at-a-glance card */
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
    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-rose-700 font-semibold">{label}</div>
      <div className="mt-1 text-stone-900 text-base font-semibold tabular-nums">
        {formatTime(start)}
        {end ? ` – ${formatTime(end)}` : ""}
      </div>
    </div>
  );
}

/** A single line-item row in the investment breakdown */
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
      className={`flex justify-between items-baseline gap-4 ${muted ? "text-stone-500" : "text-stone-800"}`}
    >
      <span className="truncate">{label}</span>
      <span className="tabular-nums shrink-0 font-medium">{value}</span>
    </div>
  );
}

/** One of the two payment stages — rich card-like presentation */
function PaymentTile({
  step,
  label,
  amount,
  percent,
  when,
  note,
  accent,
}: {
  step: string;
  label: string;
  amount: number;
  percent: number;
  when: string;
  note: string;
  accent: "rose" | "stone";
}) {
  const accentClasses =
    accent === "rose" ? "text-rose-700" : "text-stone-600";
  return (
    <div>
      <div className={`flex items-center justify-between text-[10px] uppercase tracking-[0.22em] font-semibold ${accentClasses}`}>
        <span>Step {step}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 flex justify-between items-baseline gap-3">
        <p className="text-lg text-stone-900 font-semibold">{label}</p>
        <p
          className="font-serif text-3xl text-stone-900 tabular-nums"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          {formatCentsWhole(amount)}
        </p>
      </div>
      <p className="text-sm text-stone-700 mt-1 font-medium">{when}</p>
      <p className="text-sm text-stone-600 mt-1">{note}</p>
    </div>
  );
}
