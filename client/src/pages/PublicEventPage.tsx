import { useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import homebitesLogo from "@assets/homebites-logo.avif";
import { getEventPreset } from "@shared/eventPresets";
import { applyThemeCSS } from "@/lib/eventPresetCSS";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Heart,
  Sparkles,
  ChefHat,
  AlertTriangle,
  Loader2,
  CalendarCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicEvent {
  id: number;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  venue: string;
  status: "confirmed" | "in-progress" | "completed" | "cancelled";
}

interface PublicClient {
  firstName: string;
  lastName: string;
  company: string | null;
}

interface PublicInquiry {
  partnerFirstName: string | null;
  partnerLastName: string | null;
  menuTheme: string | null;
  menuTier: string | null;
  menuSelections: Array<{ name: string; category: string; description?: string | null }> | null;
  appetizers: {
    selections: Array<{ category: string; itemName: string; quantity: number; description?: string | null }>;
  } | null;
  desserts: Array<{ itemName: string; quantity: number; description?: string | null }> | null;
  beverages: {
    hasNonAlcoholic: boolean;
    hasAlcoholic: boolean;
    bartendingType?: string;
  } | null;
  dietary: {
    restrictions?: string[];
    allergies?: string[];
    specialNotes?: string;
  } | null;
  hasCocktailHour: boolean | null;
  cocktailStartTime: string | null;
  cocktailEndTime: string | null;
  mainMealStartTime: string | null;
  mainMealEndTime: string | null;
  specialRequests: string | null;
  serviceStyle: string | null;
  quoteViewToken: string | null;
}

interface PublicMenu {
  name: string;
  description: string | null;
  themeKey: string | null;
}

interface SiteConfig {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  chef: {
    firstName: string;
    lastName: string;
    role: string;
    bio: string;
    photoUrl: string | null;
    phone: string;
    email: string;
  };
  social: {
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
  };
}

interface PublicReviewConfig {
  googleReviewUrl: string | null;
  referralCreditDollars: number;
}

interface PublicEventPayload {
  event: PublicEvent;
  client: PublicClient | null;
  inquiry: PublicInquiry | null;
  menu: PublicMenu | null;
  siteConfig: SiteConfig;
  reviewConfig?: PublicReviewConfig;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  const now = new Date();
  const then = new Date(iso);
  now.setHours(0, 0, 0, 0);
  then.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - now.getTime()) / 86400000);
}

function formatDate(iso: string | null): string {
  if (!iso) return "Date to be confirmed";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeOfDay(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * True when the stored startTime looks like a sentinel the server generates
 * as a fallback (midnight or "noon local" which becomes 5 AM / 8 PM when
 * rendered across timezones). Heuristic: UTC hour ∈ {0, 12, 16, 17} AND
 * minutes = 0. Safe because real event times rarely land on these sentinels.
 */
function isDefaultMidnight(iso: string | null): boolean {
  if (!iso) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  const minutes = d.getUTCMinutes();
  if (minutes !== 0) return false;
  const hour = d.getUTCHours();
  // 0 = midnight UTC, 16/17 = noon Pacific in summer/winter, 12 = noon UTC
  return hour === 0 || hour === 12 || hour === 16 || hour === 17;
}

function titleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Pretty theme names to match what customers saw on the marketing site.
const THEME_NAMES: Record<string, string> = {
  taco_fiesta: "Taco Fiesta",
  bbq: "American BBQ",
  greece: "A Taste of Greece",
  kebab: "Kebab Feast",
  italy: "Your Italian Feast",
  vegan: "Garden-Forward Vegan",
  custom: "Your Custom Menu",
};

const ITALIAN_COURSES: Record<string, string> = {
  protein: "Il Secondo",
  entree: "Il Secondo",
  main: "Il Secondo",
  side: "Contorni",
  pasta: "Il Primo",
  salad: "Insalata",
  salsa: "Salse",
  condiment: "Salse",
  spread: "Antipasti",
};

const CATEGORY_TITLES: Record<string, string> = {
  protein: "Mains",
  entree: "Mains",
  main: "Mains",
  side: "Sides",
  pasta: "Pasta",
  salad: "Salads",
  salsa: "Salsas",
  condiment: "Condiments",
  spread: "Spreads",
  sauce: "Sauces",
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function PublicEventPage() {
  const [, params] = useRoute("/event/:token");
  const token = params?.token ?? null;

  const { data, isLoading, isError } = useQuery<PublicEventPayload>({
    queryKey: [`/api/public/event/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to load event");
      }
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <PageShell siteConfig={null}>
        <div className="flex flex-col items-center justify-center py-32 text-stone-500">
          <Loader2 className="h-10 w-10 animate-spin mb-3" />
          <p className="font-serif italic">Preparing your event page…</p>
        </div>
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell siteConfig={null}>
        <Card className="border-stone-300 bg-white/70">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-stone-400 mx-auto mb-3" />
            <h2 className="text-xl font-serif font-semibold">Event not found</h2>
            <p className="text-stone-600 mt-2 font-serif">
              This link may be invalid or expired. Please reach out to us directly and we'll
              get you the right one.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const { event, client, inquiry, menu, siteConfig, reviewConfig } = data;
  const days = daysUntil(event.eventDate);
  const hasPassed = days < 0;
  const isCompleted = event.status === "completed";
  const isCancelled = event.status === "cancelled";

  // Event-type preset drives theme + copy + section opt-ins.
  const preset = getEventPreset(event.eventType);
  const { theme, copy } = preset;
  const themeStyles = applyThemeCSS(theme);

  const personTitle = buildPersonTitle(client, inquiry, event.eventType);
  const eventTitle = copy.composeEventTitle(personTitle || null, preset.label);

  // Use the real meal start time from the inquiry when available; otherwise
  // skip rendering a time (instead of showing a bogus midnight/noon sentinel
  // converted to the browser's local timezone).
  const displayStartTime =
    inquiry?.mainMealStartTime || (event.startTime && !isDefaultMidnight(event.startTime) ? formatTimeOfDay(event.startTime) : null);

  const themeLabel = inquiry?.menuTheme
    ? THEME_NAMES[inquiry.menuTheme] ?? titleCase(inquiry.menuTheme)
    : menu?.name || "Your menu";

  return (
    <PageShell siteConfig={siteConfig} themeStyles={themeStyles}>
      <Helmet>
        <title>{eventTitle} · {siteConfig.businessName}</title>
      </Helmet>

      {/* ─── Themed Hero ──────────────────────────────────────────────── */}
      <div className="text-center py-8 px-4">
        <div
          className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: theme.gradient }}
        >
          {theme.icon}
        </div>
        <p className="italic text-sm mb-2" style={{ color: theme.textSecondary, fontFamily: theme.fontBody }}>
          {copy.celebrationKicker}
        </p>
        <h1
          className="text-4xl md:text-5xl font-semibold leading-tight"
          style={{ color: theme.textPrimary, fontFamily: theme.fontHeading }}
        >
          {eventTitle}
        </h1>
        <p className="text-lg mt-3" style={{ color: theme.textSecondary, fontFamily: theme.fontBody }}>
          {formatDate(event.eventDate)}
        </p>
      </div>

      {/* ─── Countdown card ───────────────────────────────────────────── */}
      {!hasPassed && !isCancelled && (
        <Card className="mb-6 border-[color:var(--theme-border)] bg-gradient-to-br from-[var(--theme-bg)] to-white shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="font-serif text-sm uppercase tracking-widest text-[color:var(--theme-primary)] mb-2">
              Countdown
            </p>
            <div className="font-serif text-6xl md:text-7xl font-bold text-stone-900">
              {days === 0 ? "Today" : days === 1 ? "Tomorrow" : days}
            </div>
            {days > 1 && (
              <p className="font-serif text-stone-600 text-lg mt-1">
                day{days === 1 ? "" : "s"} {copy.countdownUnit}
              </p>
            )}
            <Separator className="my-5 max-w-xs mx-auto bg-[color:var(--theme-border)]" />
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone-700 font-serif">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-stone-500" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-stone-500" />
                {event.guestCount} guests
              </span>
              {displayStartTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-stone-500" />
                  {displayStartTime}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Post-event / completed state ─────────────────────────────── */}
      {isCompleted && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/60">
          <CardContent className="py-10 text-center">
            <Heart className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
            <h2 className="font-serif text-2xl text-stone-900">
              {copy.completedHeadline}
            </h2>
            <p className="font-serif text-stone-600 mt-2 max-w-md mx-auto">
              {copy.completedBlurb}
            </p>
            {(reviewConfig?.googleReviewUrl || (reviewConfig?.referralCreditDollars ?? 0) > 0) && (
              <div className="mt-6 flex flex-col items-center gap-3">
                {reviewConfig?.googleReviewUrl && (
                  <a
                    href={reviewConfig.googleReviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-serif text-sm font-semibold text-white shadow-sm hover:brightness-110"
                    style={{ background: theme.gradient }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Leave a Google review
                  </a>
                )}
                {(reviewConfig?.referralCreditDollars ?? 0) > 0 && (
                  <p className="text-sm text-stone-600 font-serif italic max-w-md">
                    Know someone planning an event? Send them our way and we'll send you a $
                    {reviewConfig!.referralCreditDollars} credit when they book.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Cancelled state ──────────────────────────────────────────── */}
      {isCancelled && (
        <Card className="mb-6 border-stone-300 bg-stone-100">
          <CardContent className="py-8 text-center">
            <p className="font-serif text-stone-700">
              {copy.cancelledBlurb}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── The menu ─────────────────────────────────────────────────── */}
      {inquiry && (
        <Card className="mb-6 bg-white shadow-sm">
          <CardContent className="py-10 px-6 md:px-12">
            <div className="text-center mb-8">
              <Sparkles className="h-5 w-5 text-[color:var(--theme-accent)] mx-auto mb-2" />
              <h2 className="font-serif text-3xl text-stone-900">{themeLabel}</h2>
              <p className="font-serif italic text-stone-500 mt-1 text-sm">
                Curated for your celebration
              </p>
            </div>

            <TastingMenu inquiry={inquiry} />
          </CardContent>
        </Card>
      )}

      {/* ─── Flow of the day ──────────────────────────────────────────── */}
      {inquiry && !hasPassed && (
        <Card className="mb-6 bg-white/80">
          <CardContent className="py-8 px-6">
            <h3 className="font-serif text-2xl text-center text-stone-900 mb-6">
              {copy.comingNextLabel}
            </h3>
            <EventTimeline event={event} inquiry={inquiry} />
          </CardContent>
        </Card>
      )}

      {/* ─── Dietary reassurance ──────────────────────────────────────── */}
      {inquiry?.dietary &&
        ((inquiry.dietary.allergies?.length ?? 0) > 0 ||
          (inquiry.dietary.restrictions?.length ?? 0) > 0) && (
          <Card className="mb-6 bg-emerald-50/40 border-emerald-200">
            <CardContent className="py-6 px-6">
              <h3 className="font-serif text-xl text-stone-900 mb-3 text-center">
                We've got everyone covered
              </h3>
              {(inquiry.dietary.allergies?.length ?? 0) > 0 && (
                <p className="text-sm text-stone-700 font-serif text-center">
                  Allergies on our radar:{" "}
                  <span className="font-semibold">
                    {inquiry.dietary.allergies!.map(titleCase).join(", ")}
                  </span>
                  . All dishes will be clearly labeled at service, and our prep surfaces
                  are sanitized end-to-end. If anything changes, just let us know.
                </p>
              )}
              {(inquiry.dietary.restrictions?.length ?? 0) > 0 && (
                <p className="text-sm text-stone-700 font-serif text-center mt-3">
                  Dietary preferences noted:{" "}
                  <span className="font-semibold">
                    {inquiry.dietary.restrictions!.map(titleCase).join(", ")}
                  </span>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* ─── Meet the chef ────────────────────────────────────────────── */}
      <Card className="mb-6 bg-gradient-to-br from-stone-50 to-[var(--theme-bg)] border-stone-200">
        <CardContent className="py-8 px-6">
          <div className="flex flex-col items-center md:flex-row md:items-start md:gap-6 text-center md:text-left">
            <div className="shrink-0 mb-4 md:mb-0">
              {siteConfig.chef.photoUrl ? (
                <img
                  src={siteConfig.chef.photoUrl}
                  alt={siteConfig.chef.firstName}
                  className="h-24 w-24 rounded-full object-cover border-2 border-[color:var(--theme-border)]"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-[var(--theme-bg)] border-2 border-[color:var(--theme-border)] flex items-center justify-center">
                  <ChefHat className="h-12 w-12 text-[color:var(--theme-primary)]" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-serif text-sm uppercase tracking-wide text-[color:var(--theme-primary)]">
                Meet your chef
              </p>
              <h3 className="font-serif text-2xl text-stone-900 mt-1">
                {siteConfig.chef.firstName}
                {siteConfig.chef.lastName ? ` ${siteConfig.chef.lastName}` : ""}
              </h3>
              <p className="font-serif text-stone-500 italic text-sm">
                {siteConfig.chef.role}
              </p>
              <p className="font-serif text-stone-700 mt-3 leading-relaxed">
                {siteConfig.chef.bio}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start text-sm">
                <a
                  href={`tel:${siteConfig.chef.phone}`}
                  className="flex items-center gap-1.5 text-[color:var(--theme-primary)] hover:brightness-90"
                >
                  <Phone className="h-4 w-4" />
                  {siteConfig.chef.phone}
                </a>
                <a
                  href={`mailto:${siteConfig.chef.email}`}
                  className="flex items-center gap-1.5 text-[color:var(--theme-primary)] hover:brightness-90"
                >
                  <Mail className="h-4 w-4" />
                  {siteConfig.chef.email}
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Milestones ──────────────────────────────────────────────── */}
      {!hasPassed && !isCancelled && (
        <Card className="mb-6 bg-white/80">
          <CardContent className="py-8 px-6">
            <h3 className="font-serif text-xl text-stone-900 mb-4 text-center">
              What's coming next
            </h3>
            <Milestones daysUntilEvent={days} />
          </CardContent>
        </Card>
      )}

      {/* ─── Need changes / contact ──────────────────────────────────── */}
      {!hasPassed && !isCancelled && (
        <Card className="mb-6 border-stone-200 bg-white/80">
          <CardContent className="py-6 px-6">
            <h3 className="font-serif text-xl text-stone-900 mb-3 text-center">
              Need to change something?
            </h3>
            <div className="space-y-3 text-center font-serif text-stone-700">
              {inquiry?.quoteViewToken && (
                <p>
                  Want to adjust the menu, pricing, or logistics?{" "}
                  <a
                    href={`/quote/${inquiry.quoteViewToken}`}
                    className="text-[color:var(--theme-primary)] underline underline-offset-2 hover:brightness-90"
                  >
                    View your quote
                  </a>
                </p>
              )}
              <p>
                Anything else?{" "}
                <a
                  href={`tel:${siteConfig.chef.phone}`}
                  className="text-[color:var(--theme-primary)] underline underline-offset-2 hover:brightness-90"
                >
                  Call or text {siteConfig.chef.firstName} directly
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-10 mb-4 text-center text-xs text-stone-500 font-serif italic">
        Prepared with care for your celebration — The {siteConfig.businessName} team.
      </div>
    </PageShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function buildPersonTitle(
  client: PublicClient | null,
  inquiry: PublicInquiry | null,
  eventType: string
): string {
  if (!client) return "";
  // Delegate to the event-type preset so wedding/corporate/etc render the
  // right shape. Never duplicates the same name with an ampersand.
  return getEventPreset(eventType).copy.displayTitle({
    firstName: client.firstName,
    lastName: client.lastName,
    partnerFirstName: inquiry?.partnerFirstName ?? null,
    company: client.company,
  });
}

function TastingMenu({ inquiry }: { inquiry: PublicInquiry }) {
  type MenuLine = { name: string; description?: string | null };

  // Group main menu selections by category (carrying description through)
  const grouped: Record<string, MenuLine[]> = {};
  for (const sel of inquiry.menuSelections ?? []) {
    if (!grouped[sel.category]) grouped[sel.category] = [];
    grouped[sel.category].push({ name: sel.name, description: sel.description ?? null });
  }

  const sections: Array<{ title: string; items: MenuLine[] }> = [];

  if (inquiry.appetizers?.selections?.length) {
    sections.push({
      title: "Antipasti · To Begin",
      items: inquiry.appetizers.selections.map((a) => ({
        name: a.itemName,
        description: a.description ?? null,
      })),
    });
  }

  // Order main menu groups for nicer reading
  const order = ["pasta", "protein", "entree", "main", "side", "salad", "salsa", "condiment", "sauce", "spread"];
  const seen = new Set<string>();
  for (const cat of order) {
    if (grouped[cat]?.length) {
      sections.push({
        title: CATEGORY_TITLES[cat] ?? titleCase(cat),
        items: grouped[cat],
      });
      seen.add(cat);
    }
  }
  // Remaining categories (just in case)
  for (const [cat, items] of Object.entries(grouped)) {
    if (seen.has(cat) || !items.length) continue;
    sections.push({ title: CATEGORY_TITLES[cat] ?? titleCase(cat), items });
  }

  if (inquiry.desserts?.length) {
    sections.push({
      title: "Dolci · Something Sweet",
      items: inquiry.desserts.map((d) => ({
        name: d.itemName,
        description: d.description ?? null,
      })),
    });
  }

  if (sections.length === 0) {
    return (
      <p className="text-center text-stone-500 font-serif italic">
        The menu is being finalized. We'll share the details soon.
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {sections.map((section, i) => (
        <div key={i} className="text-center">
          <p className="font-serif text-xs uppercase tracking-[0.25em] text-stone-400 mb-3">
            ⸻ {section.title} ⸻
          </p>
          <ul className="space-y-3">
            {section.items.map((item, j) => (
              <li key={j} className="font-serif">
                <div className="text-lg text-stone-800">{item.name}</div>
                {item.description && (
                  <div className="text-sm text-stone-500 italic mt-0.5 px-6">
                    {item.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {inquiry.beverages &&
        (inquiry.beverages.hasNonAlcoholic || inquiry.beverages.hasAlcoholic) && (
          <div className="text-center pt-2">
            <p className="font-serif text-xs uppercase tracking-[0.25em] text-stone-400 mb-3">
              ⸻ Beverages ⸻
            </p>
            <p className="font-serif text-stone-700 italic">
              {inquiry.beverages.hasAlcoholic && inquiry.beverages.hasNonAlcoholic
                ? "Full bar service · non-alcoholic selections"
                : inquiry.beverages.hasAlcoholic
                ? "Full bar service"
                : "Non-alcoholic selections"}
            </p>
          </div>
        )}
    </div>
  );
}

function EventTimeline({
  event,
  inquiry,
}: {
  event: PublicEvent;
  inquiry: PublicInquiry;
}) {
  const entries: Array<{ time: string; label: string; icon: "sparkle" | "chef" | "heart" }> = [];

  if (inquiry.hasCocktailHour && inquiry.cocktailStartTime) {
    entries.push({
      time: inquiry.cocktailStartTime,
      label: "Welcome cocktails & canapés",
      icon: "sparkle",
    });
  }

  const mealStart = inquiry.mainMealStartTime || formatTimeOfDay(event.startTime);
  if (mealStart) {
    entries.push({
      time: mealStart,
      label: "Your feast is served",
      icon: "chef",
    });
  }

  if (inquiry.desserts?.length) {
    const mealEnd = inquiry.mainMealEndTime;
    if (mealEnd) {
      entries.push({
        time: mealEnd,
        label: "Dessert & toasts",
        icon: "heart",
      });
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-center text-stone-500 font-serif italic">
        Timing will be finalized closer to the date.
      </p>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {entries.map((e, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="shrink-0 w-20 text-right font-serif font-semibold text-stone-900">
            {e.time}
          </div>
          <div className="h-8 w-px bg-[color:var(--theme-accent)]" />
          <div className="flex-1 font-serif text-stone-700">{e.label}</div>
        </div>
      ))}
    </div>
  );
}

function Milestones({ daysUntilEvent }: { daysUntilEvent: number }) {
  const milestones: Array<{ label: string; when: string; done: boolean }> = [
    {
      label: "We'll confirm the final headcount with you",
      when: "~2 weeks out",
      done: daysUntilEvent <= 14,
    },
    {
      label: "Dietary needs locked in for prep",
      when: "~1 week out",
      done: daysUntilEvent <= 7,
    },
    {
      label: "Your food goes into prep",
      when: "48 hours out",
      done: daysUntilEvent <= 2,
    },
    {
      label: "Our team arrives on site to set up",
      when: "Day of",
      done: daysUntilEvent <= 0,
    },
  ];

  return (
    <ul className="space-y-3 max-w-md mx-auto">
      {milestones.map((m, i) => (
        <li key={i} className="flex items-start gap-3">
          <div
            className={`shrink-0 mt-1 h-2.5 w-2.5 rounded-full ${
              m.done ? "bg-emerald-500" : "bg-stone-300"
            }`}
          />
          <div className="flex-1">
            <div className="font-serif text-stone-800">{m.label}</div>
            <div className="text-xs text-stone-500 font-serif italic">{m.when}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Shell ─────────────────────────────────────────────────────────────────

function PageShell({
  children,
  siteConfig,
  themeStyles,
}: {
  children: React.ReactNode;
  siteConfig: SiteConfig | null;
  themeStyles?: React.CSSProperties;
}) {
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[var(--theme-bg)] via-stone-50 to-stone-100 pb-12"
      style={themeStyles}
    >
      <div className="bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <img
            src={homebitesLogo}
            alt={siteConfig?.businessName || "Homebites Catering"}
            className="h-10"
          />
          {siteConfig?.tagline && (
            <p className="text-xs text-stone-500 italic font-serif line-clamp-1 hidden sm:block">
              {siteConfig.tagline}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">{children}</div>

      {siteConfig && (
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
          <Separator className="mb-4" />
          <div className="text-center text-xs text-stone-500 font-serif space-y-2">
            <div>{siteConfig.address}</div>
            <div className="flex justify-center gap-4">
              {siteConfig.social.instagram && (
                <a href={siteConfig.social.instagram} className="hover:text-[color:var(--theme-primary)]">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {siteConfig.social.facebook && (
                <a href={siteConfig.social.facebook} className="hover:text-[color:var(--theme-primary)]">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
