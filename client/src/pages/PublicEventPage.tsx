import { useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import homebitesLogo from "@assets/homebites-logo.avif";
import { getEventTheme, applyThemeCSS } from "@/lib/eventThemes";
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

interface PublicQuoteRequest {
  partnerFirstName: string | null;
  partnerLastName: string | null;
  menuTheme: string | null;
  menuTier: string | null;
  menuSelections: Array<{ name: string; category: string }> | null;
  appetizers: {
    selections: Array<{ category: string; itemName: string; quantity: number }>;
  } | null;
  desserts: Array<{ itemName: string; quantity: number }> | null;
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

interface PublicEventPayload {
  event: PublicEvent;
  client: PublicClient | null;
  quoteRequest: PublicQuoteRequest | null;
  menu: PublicMenu | null;
  siteConfig: SiteConfig;
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

  const { event, client, quoteRequest, menu, siteConfig } = data;
  const days = daysUntil(event.eventDate);
  const hasPassed = days < 0;
  const isCompleted = event.status === "completed";
  const isCancelled = event.status === "cancelled";

  // Tier 3: Event-type theme
  const theme = getEventTheme(event.eventType);
  const themeStyles = applyThemeCSS(theme);

  // Build the personalized title
  const personTitle = buildPersonTitle(client, quoteRequest);
  const eventTitle = personTitle
    ? `${personTitle}'s ${titleCase(event.eventType)}`
    : `Your ${titleCase(event.eventType)}`;

  const themeLabel = quoteRequest?.menuTheme
    ? THEME_NAMES[quoteRequest.menuTheme] ?? titleCase(quoteRequest.menuTheme)
    : menu?.name || "Your menu";

  return (
    <PageShell siteConfig={siteConfig}>
      <Helmet>
        <title>{eventTitle} · {siteConfig.businessName}</title>
      </Helmet>

      {/* ─── Themed Hero ──────────────────────────────────────────────── */}
      <div className="text-center py-8 px-4" style={themeStyles}>
        <div
          className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: theme.gradient }}
        >
          {theme.icon}
        </div>
        <p className="italic text-sm mb-2" style={{ color: theme.textSecondary, fontFamily: theme.fontBody }}>
          A celebration prepared with care
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
        <p className="mt-1 italic" style={{ color: theme.textSecondary, fontFamily: theme.fontBody }}>
          We can't wait to cook for you.
        </p>
      </div>

      {/* ─── Countdown card ───────────────────────────────────────────── */}
      {!hasPassed && !isCancelled && (
        <Card className="mb-6 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="font-serif text-sm uppercase tracking-widest text-amber-700 mb-2">
              Countdown
            </p>
            <div className="font-serif text-6xl md:text-7xl font-bold text-stone-900">
              {days === 0 ? "Today" : days === 1 ? "Tomorrow" : days}
            </div>
            {days > 1 && (
              <p className="font-serif text-stone-600 text-lg mt-1">
                day{days === 1 ? "" : "s"} until your celebration
              </p>
            )}
            <Separator className="my-5 max-w-xs mx-auto bg-amber-200" />
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone-700 font-serif">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-stone-500" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-stone-500" />
                {event.guestCount} guests
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-stone-500" />
                {formatTimeOfDay(event.startTime)}
              </span>
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
              Thank you for letting us be part of your day
            </h2>
            <p className="font-serif text-stone-600 mt-2 max-w-md mx-auto">
              It was our honor to prepare your event. If you'd ever like to book with us
              again, we'd love to be part of your next celebration.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Cancelled state ──────────────────────────────────────────── */}
      {isCancelled && (
        <Card className="mb-6 border-stone-300 bg-stone-100">
          <CardContent className="py-8 text-center">
            <p className="font-serif text-stone-700">
              This event has been cancelled. If this wasn't intentional, please reach out to
              us — we'd love to help make it right.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── The menu ─────────────────────────────────────────────────── */}
      {quoteRequest && (
        <Card className="mb-6 bg-white shadow-sm">
          <CardContent className="py-10 px-6 md:px-12">
            <div className="text-center mb-8">
              <Sparkles className="h-5 w-5 text-amber-500 mx-auto mb-2" />
              <h2 className="font-serif text-3xl text-stone-900">{themeLabel}</h2>
              <p className="font-serif italic text-stone-500 mt-1 text-sm">
                Curated for your celebration
              </p>
            </div>

            <TastingMenu quoteRequest={quoteRequest} />
          </CardContent>
        </Card>
      )}

      {/* ─── Flow of the day ──────────────────────────────────────────── */}
      {quoteRequest && !hasPassed && (
        <Card className="mb-6 bg-white/80">
          <CardContent className="py-8 px-6">
            <h3 className="font-serif text-2xl text-center text-stone-900 mb-6">
              The flow of your day
            </h3>
            <EventTimeline event={event} quoteRequest={quoteRequest} />
          </CardContent>
        </Card>
      )}

      {/* ─── Dietary reassurance ──────────────────────────────────────── */}
      {quoteRequest?.dietary &&
        ((quoteRequest.dietary.allergies?.length ?? 0) > 0 ||
          (quoteRequest.dietary.restrictions?.length ?? 0) > 0) && (
          <Card className="mb-6 bg-emerald-50/40 border-emerald-200">
            <CardContent className="py-6 px-6">
              <h3 className="font-serif text-xl text-stone-900 mb-3 text-center">
                We've got everyone covered
              </h3>
              {(quoteRequest.dietary.allergies?.length ?? 0) > 0 && (
                <p className="text-sm text-stone-700 font-serif text-center">
                  Allergies on our radar:{" "}
                  <span className="font-semibold">
                    {quoteRequest.dietary.allergies!.map(titleCase).join(", ")}
                  </span>
                  . All dishes will be clearly labeled at service, and our prep surfaces
                  are sanitized end-to-end. If anything changes, just let us know.
                </p>
              )}
              {(quoteRequest.dietary.restrictions?.length ?? 0) > 0 && (
                <p className="text-sm text-stone-700 font-serif text-center mt-3">
                  Dietary preferences noted:{" "}
                  <span className="font-semibold">
                    {quoteRequest.dietary.restrictions!.map(titleCase).join(", ")}
                  </span>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* ─── Meet the chef ────────────────────────────────────────────── */}
      <Card className="mb-6 bg-gradient-to-br from-stone-50 to-amber-50/30 border-stone-200">
        <CardContent className="py-8 px-6">
          <div className="flex flex-col items-center md:flex-row md:items-start md:gap-6 text-center md:text-left">
            <div className="shrink-0 mb-4 md:mb-0">
              {siteConfig.chef.photoUrl ? (
                <img
                  src={siteConfig.chef.photoUrl}
                  alt={siteConfig.chef.firstName}
                  className="h-24 w-24 rounded-full object-cover border-2 border-amber-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-amber-100 border-2 border-amber-200 flex items-center justify-center">
                  <ChefHat className="h-12 w-12 text-amber-700" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-serif text-sm uppercase tracking-wide text-amber-700">
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
                  className="flex items-center gap-1.5 text-amber-800 hover:text-amber-900"
                >
                  <Phone className="h-4 w-4" />
                  {siteConfig.chef.phone}
                </a>
                <a
                  href={`mailto:${siteConfig.chef.email}`}
                  className="flex items-center gap-1.5 text-amber-800 hover:text-amber-900"
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
              {quoteRequest?.quoteViewToken && (
                <p>
                  Want to adjust the menu, pricing, or logistics?{" "}
                  <a
                    href={`/quote/${quoteRequest.quoteViewToken}`}
                    className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
                  >
                    View your quote
                  </a>
                </p>
              )}
              <p>
                Anything else?{" "}
                <a
                  href={`tel:${siteConfig.chef.phone}`}
                  className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
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
  quoteRequest: PublicQuoteRequest | null
): string {
  if (!client) return "";
  const partner = quoteRequest?.partnerFirstName;
  if (partner) {
    return `${client.firstName} & ${partner}`;
  }
  return client.firstName;
}

function TastingMenu({ quoteRequest }: { quoteRequest: PublicQuoteRequest }) {
  // Group main menu selections by category
  const grouped: Record<string, string[]> = {};
  for (const sel of quoteRequest.menuSelections ?? []) {
    if (!grouped[sel.category]) grouped[sel.category] = [];
    grouped[sel.category].push(sel.name);
  }

  const sections: Array<{ title: string; items: string[] }> = [];

  if (quoteRequest.appetizers?.selections?.length) {
    sections.push({
      title: "Antipasti · To Begin",
      items: quoteRequest.appetizers.selections.map((a) => a.itemName),
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

  if (quoteRequest.desserts?.length) {
    sections.push({
      title: "Dolci · Something Sweet",
      items: quoteRequest.desserts.map((d) => d.itemName),
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
          <ul className="space-y-1.5">
            {section.items.map((item, j) => (
              <li key={j} className="font-serif text-lg text-stone-800">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {quoteRequest.beverages &&
        (quoteRequest.beverages.hasNonAlcoholic || quoteRequest.beverages.hasAlcoholic) && (
          <div className="text-center pt-2">
            <p className="font-serif text-xs uppercase tracking-[0.25em] text-stone-400 mb-3">
              ⸻ Beverages ⸻
            </p>
            <p className="font-serif text-stone-700 italic">
              {quoteRequest.beverages.hasAlcoholic && quoteRequest.beverages.hasNonAlcoholic
                ? "Full bar service · non-alcoholic selections"
                : quoteRequest.beverages.hasAlcoholic
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
  quoteRequest,
}: {
  event: PublicEvent;
  quoteRequest: PublicQuoteRequest;
}) {
  const entries: Array<{ time: string; label: string; icon: "sparkle" | "chef" | "heart" }> = [];

  if (quoteRequest.hasCocktailHour && quoteRequest.cocktailStartTime) {
    entries.push({
      time: quoteRequest.cocktailStartTime,
      label: "Welcome cocktails & canapés",
      icon: "sparkle",
    });
  }

  const mealStart = quoteRequest.mainMealStartTime || formatTimeOfDay(event.startTime);
  if (mealStart) {
    entries.push({
      time: mealStart,
      label: "Your feast is served",
      icon: "chef",
    });
  }

  if (quoteRequest.desserts?.length) {
    const mealEnd = quoteRequest.mainMealEndTime;
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
          <div className="h-8 w-px bg-amber-300" />
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
}: {
  children: React.ReactNode;
  siteConfig: SiteConfig | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-stone-50 to-stone-100 pb-12">
      <div className="bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={homebitesLogo} alt="Homebites" className="h-10" />
          <div>
            <p className="font-serif font-bold text-lg leading-tight">
              {siteConfig?.businessName || "Homebites Catering"}
            </p>
            {siteConfig?.tagline && (
              <p className="text-xs text-stone-500 italic font-serif line-clamp-1">
                {siteConfig.tagline}
              </p>
            )}
          </div>
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
                <a href={siteConfig.social.instagram} className="hover:text-amber-700">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {siteConfig.social.facebook && (
                <a href={siteConfig.social.facebook} className="hover:text-amber-700">
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
