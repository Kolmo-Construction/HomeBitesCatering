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
  CreditCard,
  Phone,
  Mail,
  Clock,
  Sparkles,
  Cake,
  Coffee,
  ChevronRight,
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

function formatShortDate(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
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
    weekday: "long",
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
    case "cocktail_party": return "Cocktail-style reception";
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

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c.toLowerCase()] ?? titleCase(c);
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
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
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
          <p className="text-muted-foreground">
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
  const menuCategories = Object.keys(groupedMenu);
  const isWedding = (wedding?.eventType ?? estimate.eventType ?? "").toLowerCase().includes("wedding");

  return (
    <PageShell>
      <Helmet>
        <title>{coupleTitle(wedding, client)} · Wedding Proposal · Homebites</title>
      </Helmet>

      {/* ═══════════════ STATUS BANNERS ═══════════════ */}
      {effectiveStatus === "accepted" && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center shadow-sm">
          <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-2xl font-serif font-bold text-emerald-900">
            We&rsquo;re officially booked!
          </h2>
          <p className="text-emerald-800 mt-2 max-w-md mx-auto">
            Thank you for choosing Homebites to be part of your day. We&rsquo;ll
            be in touch within 24 hours with the contract and deposit
            instructions.
          </p>
          {eventPublicUrl && (
            <a
              href={eventPublicUrl}
              className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-emerald-700 text-white text-sm font-semibold rounded-full hover:bg-emerald-800 transition shadow-md"
            >
              <Heart className="h-4 w-4" />
              Open your event page
            </a>
          )}
        </div>
      )}

      {effectiveStatus === "declined" && (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-700">
            We&rsquo;ve recorded that this proposal isn&rsquo;t the right fit. If
            anything changes — new date, different headcount, a tweak to the
            menu — just reply to our email and we&rsquo;ll start fresh.
          </p>
        </div>
      )}

      {/* ═══════════════ HERO ═══════════════ */}
      <div className="text-center mb-12 pt-4">
        {isWedding && (
          <div className="inline-flex items-center gap-2 text-rose-700/80 text-xs uppercase tracking-[0.3em] mb-4 font-medium">
            <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
            Wedding Proposal
            <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
          </div>
        )}
        <h1 className="font-serif text-5xl md:text-6xl text-stone-900 mb-3 leading-tight" data-testid="text-couple-title">
          {coupleTitle(wedding, client)}
        </h1>
        <p className="text-stone-600 text-lg italic font-serif">{longDate}</p>
        {wedding?.venueName && (
          <p className="text-stone-500 text-sm mt-1">at {wedding.venueName}</p>
        )}
        <div className="mt-8 max-w-xl mx-auto">
          <p className="text-stone-700 leading-relaxed">
            {isWedding ? (
              <>
                Congratulations on your engagement! It would be our honor to
                feed your guests on the day you say <em>I do</em>. Here&rsquo;s
                what we&rsquo;ve put together for you.
              </>
            ) : (
              <>
                Thank you for thinking of us. Here&rsquo;s the proposal we&rsquo;ve
                put together for your event.
              </>
            )}
          </p>
        </div>
      </div>

      {/* ═══════════════ YOUR DAY AT A GLANCE ═══════════════ */}
      <Section title="Your day at a glance" icon={<Sparkles className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DetailCell
            icon={<Calendar className="h-4 w-4" />}
            label="Date"
            value={longDate}
          />
          <DetailCell
            icon={<Users className="h-4 w-4" />}
            label="Guests"
            value={`${guests} guests`}
          />
          <DetailCell
            icon={<Utensils className="h-4 w-4" />}
            label="Service"
            value={serviceStyleLabel(wedding?.serviceStyle ?? wedding?.serviceType ?? null) || "Custom"}
          />
        </div>

        {(wedding?.venueName || estimate.venue) && (
          <div className="mt-6 pt-6 border-t border-stone-100 flex items-start gap-3">
            <MapPin className="h-5 w-5 mt-0.5 text-stone-400 shrink-0" />
            <div>
              <p className="font-medium text-stone-900">
                {wedding?.venueName || estimate.venue}
              </p>
              {wedding?.venueAddress && (
                <p className="text-sm text-stone-500">
                  {[
                    wedding.venueAddress.street,
                    wedding.venueAddress.city,
                    wedding.venueAddress.state,
                    wedding.venueAddress.zip,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {!wedding?.venueAddress && estimate.venueAddress && (
                <p className="text-sm text-stone-500">
                  {[estimate.venueAddress, estimate.venueCity, estimate.venueZip]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Timeline of the day */}
        {wedding && (wedding.hasCeremony || wedding.hasCocktailHour || wedding.hasMainMeal) && (
          <div className="mt-6 pt-6 border-t border-stone-100">
            <p className="text-xs uppercase tracking-wide text-stone-500 mb-3 font-medium">
              <Clock className="h-3 w-3 inline mr-1.5" />
              Timeline
            </p>
            <ul className="space-y-2">
              {wedding.hasCeremony && wedding.ceremonyStartTime && (
                <TimelineRow
                  label="Ceremony"
                  start={wedding.ceremonyStartTime}
                  end={wedding.ceremonyEndTime}
                />
              )}
              {wedding.hasCocktailHour && wedding.cocktailStartTime && (
                <TimelineRow
                  label="Cocktail hour"
                  start={wedding.cocktailStartTime}
                  end={wedding.cocktailEndTime}
                />
              )}
              {wedding.hasMainMeal && wedding.mainMealStartTime && (
                <TimelineRow
                  label="Reception dinner"
                  start={wedding.mainMealStartTime}
                  end={wedding.mainMealEndTime}
                />
              )}
            </ul>
          </div>
        )}
      </Section>

      {/* ═══════════════ THE MENU ═══════════════ */}
      {(menuCategories.length > 0 || wedding?.menuTheme) && (
        <Section
          title="The menu"
          subtitle={
            wedding?.menuTheme
              ? `${menuThemeLabel(wedding.menuTheme)}${wedding.menuTier ? ` · ${titleCase(wedding.menuTier)} package` : ""}`
              : undefined
          }
          icon={<Utensils className="h-4 w-4" />}
        >
          {menuCategories.length === 0 ? (
            <p className="text-stone-500 italic text-sm">
              Menu details will be confirmed during your tasting.
            </p>
          ) : (
            <div className="space-y-6">
              {menuCategories.map((cat) => (
                <div key={cat}>
                  <h3 className="font-serif text-lg text-stone-800 mb-2 italic">
                    {categoryLabel(cat)}
                  </h3>
                  <ul className="space-y-1.5">
                    {groupedMenu[cat].map((name, i) => (
                      <li
                        key={`${cat}-${i}`}
                        className="text-stone-700 flex items-start gap-2"
                      >
                        <span className="text-rose-300 mt-1.5 leading-none">·</span>
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Appetizers / Cocktail Hour */}
          {wedding?.appetizers?.selections && wedding.appetizers.selections.length > 0 && (
            <div className="mt-6 pt-6 border-t border-stone-100">
              <h3 className="font-serif text-lg text-stone-800 mb-2 italic">
                Cocktail Hour Bites
              </h3>
              <ul className="space-y-1.5">
                {wedding.appetizers.selections.map((a, i) => (
                  <li key={i} className="text-stone-700 flex items-start gap-2">
                    <span className="text-rose-300 mt-1.5 leading-none">·</span>
                    <span>
                      {a.itemName}
                      {a.quantity > 0 && (
                        <span className="text-stone-400 text-sm ml-1.5">
                          ({a.quantity} pieces)
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Desserts */}
          {wedding?.desserts && wedding.desserts.length > 0 && (
            <div className="mt-6 pt-6 border-t border-stone-100">
              <h3 className="font-serif text-lg text-stone-800 mb-2 italic flex items-center gap-2">
                <Cake className="h-4 w-4 text-rose-400" />
                Sweet Endings
              </h3>
              <ul className="space-y-1.5">
                {wedding.desserts.map((d, i) => (
                  <li key={i} className="text-stone-700 flex items-start gap-2">
                    <span className="text-rose-300 mt-1.5 leading-none">·</span>
                    <span>
                      {d.itemName}
                      {d.quantity > 0 && (
                        <span className="text-stone-400 text-sm ml-1.5">
                          ({d.quantity})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Beverages */}
          {wedding?.beverages && (wedding.beverages.hasNonAlcoholic || wedding.beverages.hasAlcoholic) && (
            <div className="mt-6 pt-6 border-t border-stone-100">
              <h3 className="font-serif text-lg text-stone-800 mb-2 italic flex items-center gap-2">
                <Wine className="h-4 w-4 text-rose-400" />
                The Bar
              </h3>
              <ul className="space-y-1.5 text-stone-700 text-sm">
                {wedding.beverages.hasAlcoholic && wedding.beverages.bartendingType && (
                  <li>
                    {wedding.beverages.liquorQuality && (
                      <strong>{titleCase(wedding.beverages.liquorQuality)} </strong>
                    )}
                    bar service
                  </li>
                )}
                {wedding.beverages.nonAlcoholicSelections?.map((n, i) => (
                  <li key={`na-${i}`} className="flex items-start gap-2">
                    <span className="text-rose-300 mt-1.5 leading-none">·</span>
                    <span>{titleCase(n)}</span>
                  </li>
                ))}
                {wedding.beverages.mocktails?.map((n, i) => (
                  <li key={`mt-${i}`} className="flex items-start gap-2">
                    <span className="text-rose-300 mt-1.5 leading-none">·</span>
                    <span>Mocktail: {titleCase(n)}</span>
                  </li>
                ))}
                {wedding.beverages.coffeeTeaService && (
                  <li className="flex items-center gap-2">
                    <Coffee className="h-3.5 w-3.5 text-stone-400" />
                    Coffee &amp; tea service
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Dietary callouts */}
          {wedding?.dietary && (
            ((wedding.dietary.restrictions?.length ?? 0) > 0 ||
              (wedding.dietary.allergies?.length ?? 0) > 0 ||
              wedding.dietary.specialNotes) && (
              <div className="mt-6 pt-6 border-t border-stone-100">
                <p className="text-xs uppercase tracking-wide text-stone-500 mb-2 font-medium">
                  Dietary accommodations
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {wedding.dietary.restrictions?.map((r) => (
                    <Badge key={r} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-normal">
                      {titleCase(r)}
                    </Badge>
                  ))}
                  {wedding.dietary.allergies?.map((a) => (
                    <Badge key={a} className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 font-normal">
                      {titleCase(a)}-free needed
                    </Badge>
                  ))}
                </div>
                {wedding.dietary.specialNotes && (
                  <p className="text-sm text-stone-600 italic">
                    &ldquo;{wedding.dietary.specialNotes}&rdquo;
                  </p>
                )}
              </div>
            )
          )}
        </Section>
      )}

      {/* ═══════════════ EQUIPMENT & RENTALS ═══════════════ */}
      {wedding?.equipment?.items && wedding.equipment.items.length > 0 && (
        <Section title="Equipment & rentals" icon={<Sparkles className="h-4 w-4" />}>
          <ul className="space-y-1.5">
            {wedding.equipment.items.map((e, i) => (
              <li key={i} className="text-stone-700 flex items-start gap-2">
                <span className="text-rose-300 mt-1.5 leading-none">·</span>
                <span>
                  {e.item}
                  {e.quantity > 1 && (
                    <span className="text-stone-400 text-sm ml-1.5">×{e.quantity}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {wedding.equipment.otherNotes && (
            <p className="mt-3 text-sm text-stone-500 italic">
              {wedding.equipment.otherNotes}
            </p>
          )}
        </Section>
      )}

      {/* ═══════════════ SPECIAL REQUESTS ═══════════════ */}
      {wedding?.specialRequests && (
        <Section title="Your special requests" icon={<Heart className="h-4 w-4 text-rose-400" />}>
          <p className="text-stone-700 italic leading-relaxed whitespace-pre-wrap">
            &ldquo;{wedding.specialRequests}&rdquo;
          </p>
          <p className="mt-3 text-sm text-stone-500">
            We&rsquo;ve noted these and they&rsquo;re part of the plan.
          </p>
        </Section>
      )}

      {/* ═══════════════ INVESTMENT ═══════════════ */}
      <Section title="Your investment" icon={<CreditCard className="h-4 w-4" />}>
        <div className="space-y-3 text-sm">
          {perPersonCents > 0 && guests > 0 && (
            <Row
              label={`Catering (${formatCents(perPersonCents)} × ${guests} guests)`}
              value={formatCents(perPersonCents * guests)}
            />
          )}
          {perPersonCents === 0 && lineItems.length > 0 && (
            <>
              {lineItems.map((it, i) => (
                <Row
                  key={it.id ?? i}
                  label={`${it.name}${it.quantity > 1 ? ` × ${it.quantity}` : ""}`}
                  value={formatCents(it.price * it.quantity)}
                />
              ))}
            </>
          )}
          {serviceFeeCents > 0 && (
            <Row label="Service fee" value={formatCents(serviceFeeCents)} />
          )}
          <Row label="Subtotal" value={formatCents(subtotalCents)} muted />
          <Row label="Tax" value={formatCents(taxCents)} muted />

          <div className="pt-4 mt-2 border-t border-stone-200">
            <div className="flex justify-between items-baseline">
              <span className="font-serif text-lg text-stone-900">Total</span>
              <span className="font-serif text-3xl text-stone-900" data-testid="text-total">
                {formatCents(totalCents)}
              </span>
            </div>
            {guests > 0 && (
              <div className="text-right text-xs text-stone-500 mt-1">
                That&rsquo;s {formatCents(Math.round(totalCents / guests))} per
                guest, all-in.
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ═══════════════ PAYMENT SCHEDULE ═══════════════ */}
      <Section title="Payment schedule" icon={<CreditCard className="h-4 w-4" />}>
        <p className="text-sm text-stone-600 mb-5">
          Two simple payments — one to lock in your date, one before the big day.
        </p>
        <div className="space-y-4">
          <PaymentStage
            number={1}
            label="To book your date"
            amount={depositCents}
            percent={35}
            when="Due on signing"
            description="This deposit reserves your date and starts our planning. Non-refundable but transferable if you need to reschedule."
          />
          <PaymentStage
            number={2}
            label="Final balance"
            amount={balanceCents}
            percent={65}
            when={`Due ${balanceDueDate}`}
            description="Paid 24 hours before your event. We'll send a reminder a week out."
            isLast
          />
        </div>
      </Section>

      {/* ═══════════════ WHAT HAPPENS NEXT ═══════════════ */}
      <Section title="What happens next" icon={<ChevronRight className="h-4 w-4" />}>
        <ol className="space-y-4">
          <NextStep
            num={1}
            title="You accept this proposal"
            body="Click the button below. Takes 10 seconds."
          />
          <NextStep
            num={2}
            title="We send the contract"
            body="Within 24 hours, you'll get the signing link and instructions for the deposit."
          />
          <NextStep
            num={3}
            title="Your date is locked"
            body="As soon as the deposit clears, your date is officially ours. We start coordinating with your venue and other vendors."
          />
          <NextStep
            num={4}
            title="Tasting & menu confirmation"
            body="About 2 months out, we'll schedule a tasting (if you'd like one) and lock in the final menu."
          />
          <NextStep
            num={5}
            title="The big day"
            body="We arrive, set up, serve, and clean up. You enjoy your wedding."
          />
        </ol>
      </Section>

      {/* ═══════════════ ACCEPT / DECLINE ═══════════════ */}
      {effectiveStatus === "pending" && !showDeclineForm && (
        <div className="mt-10 mb-6 text-center">
          <Button
            size="lg"
            onClick={() => acceptMutation.mutate()}
            disabled={localStatus === "accepting"}
            className="h-16 px-12 text-base bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg shadow-rose-200 transition-all hover:shadow-xl hover:shadow-rose-300"
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
          <p className="mt-4 text-sm">
            <button
              type="button"
              onClick={() => setShowDeclineForm(true)}
              className="text-stone-500 hover:text-stone-700 underline underline-offset-2"
              data-testid="button-show-decline"
            >
              I need to pass on this
            </button>
          </p>
        </div>
      )}

      {effectiveStatus === "pending" && showDeclineForm && (
        <div className="mt-10 mb-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-serif text-stone-700 mb-2">
            We&rsquo;re sorry to hear this isn&rsquo;t the right fit. If you
            don&rsquo;t mind sharing why, it helps us improve.
          </p>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Optional — budget, timing, found another caterer, change of plans…"
            rows={3}
            className="border-stone-300"
          />
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeclineForm(false)}
            >
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
        <p className="font-serif text-lg text-stone-800 italic">
          {isWedding ? (
            <>Looking forward to celebrating with you,</>
          ) : (
            <>Looking forward to working with you,</>
          )}
        </p>
        <p className="font-serif text-2xl text-stone-900 mt-2">— Mike &amp; the Homebites team</p>
        <div className="mt-6 pt-6 border-t border-stone-200 flex flex-col sm:flex-row gap-4 justify-center text-sm text-stone-600">
          <a
            href="tel:+12065550100"
            className="flex items-center gap-2 justify-center hover:text-rose-700 transition"
          >
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
        <p className="text-xs text-stone-400 mt-6 italic">
          Questions about anything in this proposal? Reply to the email we sent
          you, or call us — we&rsquo;d love to hear from you.
        </p>
      </div>
    </PageShell>
  );
}

// ─── Layout primitives ─────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/40 via-stone-50 to-stone-50 pb-16">
      {/* Header */}
      <header className="w-full bg-white/70 backdrop-blur-sm border-b border-stone-200/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <img src={homebitesLogo} alt="Homebites" className="h-9" />
          <div>
            <p className="font-serif font-bold text-base leading-tight text-stone-900">
              Homebites Catering
            </p>
            <p className="text-[11px] text-stone-500 italic">
              Crafted for your celebration
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
      <header className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 text-rose-700/70 text-[10px] uppercase tracking-[0.2em] font-medium">
          {icon}
          {title}
        </div>
        {subtitle && (
          <p className="text-stone-500 text-sm italic mt-0.5">{subtitle}</p>
        )}
      </header>
      <div className="px-6 pb-6">{children}</div>
    </section>
  );
}

function DetailCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-stone-400 text-[10px] uppercase tracking-wide mb-1">
        {icon}
        {label}
      </div>
      <div className="font-serif text-stone-900">{value}</div>
    </div>
  );
}

function TimelineRow({
  label,
  start,
  end,
}: {
  label: string;
  start: string;
  end: string | null;
}) {
  return (
    <li className="flex items-baseline gap-3 text-sm">
      <span className="text-stone-400 font-mono text-xs shrink-0 w-28 tabular-nums">
        {formatTime(start)}
        {end ? ` – ${formatTime(end)}` : ""}
      </span>
      <span className="text-stone-700">{label}</span>
    </li>
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
      className={`flex justify-between items-baseline ${muted ? "text-stone-500" : "text-stone-700"}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function PaymentStage({
  number,
  label,
  amount,
  percent,
  when,
  description,
  isLast,
}: {
  number: number;
  label: string;
  amount: number;
  percent: number;
  when: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 rounded-full bg-rose-100 border-2 border-rose-200 text-rose-700 font-serif text-base flex items-center justify-center">
          {number}
        </div>
        {!isLast && (
          <div className="flex-1 w-0.5 bg-rose-100 mt-1" style={{ minHeight: 24 }} />
        )}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex justify-between items-baseline gap-3">
          <p className="font-serif text-base text-stone-900">{label}</p>
          <p className="font-serif text-xl text-stone-900 tabular-nums">
            {formatCentsWhole(amount)}
          </p>
        </div>
        <div className="flex justify-between items-baseline gap-3 text-xs text-stone-500">
          <p>{when}</p>
          <p>{percent}% of total</p>
        </div>
        <p className="text-sm text-stone-600 mt-1.5">{description}</p>
      </div>
    </div>
  );
}

function NextStep({
  num,
  title,
  body,
}: {
  num: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 text-sm font-serif flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </div>
      <div className="flex-1">
        <p className="font-medium text-stone-900">{title}</p>
        <p className="text-sm text-stone-600 mt-0.5">{body}</p>
      </div>
    </li>
  );
}
