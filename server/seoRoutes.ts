// GEO / SEO routes: robots.txt, sitemap.xml, llms.txt.
//
// Mounted BEFORE the vite / serveStatic catch-all so these resolve to real
// plaintext / XML instead of the SPA's index.html (which previously caused
// AI crawlers to see HTML when requesting these files).
//
// Content pulls from siteConfig so the public base URL and brand details
// stay in sync with the rest of the app. No env-only secrets here — these
// endpoints are intentionally public.

import type { Express, Request, Response } from "express";
import { getSiteConfig, getEmailConfig } from "./utils/siteConfig";

// Public routes of the SPA that we want AI crawlers + search engines to
// discover. Everything else is either auth-gated admin UI or token-gated
// single-use magic-links, both of which we intentionally exclude from the
// sitemap. Changing this list? Also update llms.txt + robots.txt below.
const PUBLIC_ROUTES: Array<{ path: string; priority: number; changefreq: string }> = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/inquire", priority: 0.9, changefreq: "weekly" },
  { path: "/tasting", priority: 0.7, changefreq: "monthly" },
  { path: "/find-my-event", priority: 0.3, changefreq: "yearly" },
];

// AI crawlers we explicitly welcome. Listing them (rather than relying on
// the permissive `User-agent: *`) is the current GEO best practice — it's
// an affirmative signal to the bots that the content is intended for
// training / citation and removes any doubt on operators' side.
const AI_BOTS_ALLOWED = [
  "GPTBot",            // OpenAI (training + search)
  "OAI-SearchBot",     // OpenAI (ChatGPT web search, non-training)
  "ChatGPT-User",      // OpenAI (live fetch when users click a citation)
  "ClaudeBot",         // Anthropic (primary)
  "Claude-Web",        // Anthropic (legacy)
  "anthropic-ai",      // Anthropic (alternate)
  "PerplexityBot",     // Perplexity (training)
  "Perplexity-User",   // Perplexity (live fetch)
  "Google-Extended",   // Google Gemini training opt-in
  "GoogleOther",       // Google research crawlers
  "Applebot-Extended", // Apple Intelligence training opt-in
  "CCBot",             // Common Crawl (underlies many LLM training sets)
  "Amazonbot",         // Amazon / Alexa
  "YouBot",            // You.com
  "cohere-ai",         // Cohere
  "Diffbot",           // Knowledge graph crawler
  "DuckAssistBot",     // DuckDuckGo assistant
  "Meta-ExternalAgent",// Meta AI
  "Bytespider",        // ByteDance / Doubao
];

function baseUrl(): string {
  // Prefer an explicit GEO override so the SEO files can point at the
  // canonical marketing domain even when the app's internal publicBaseUrl
  // is still the Railway deploy URL (used for internal email + webhook
  // links). Falls back to the canonical domain — never to the Railway host,
  // which we do NOT want leaked into sitemaps and llms.txt.
  const override = process.env.HOMEBITES_CANONICAL_URL;
  if (override) return override.replace(/\/$/, "");

  const pub = getEmailConfig().publicBaseUrl || "";
  if (pub && !pub.includes("railway.app")) {
    return pub.replace(/\/$/, "");
  }
  return "https://homebites.design";
}

function robotsTxt(): string {
  const url = baseUrl();
  const lines: string[] = [];

  lines.push("# robots.txt for Home Bites Catering");
  lines.push("# Updated: GEO-optimized — AI crawlers explicitly welcomed.");
  lines.push("");

  for (const bot of AI_BOTS_ALLOWED) {
    lines.push(`User-agent: ${bot}`);
    lines.push("Allow: /");
    lines.push("");
  }

  // Default rule for traditional search engines + any unlisted bot.
  lines.push("User-agent: *");
  lines.push("Allow: /");
  // Auth + token-gated areas — not indexable and would yield empty shells
  // for crawlers. Explicitly blocking them saves crawl budget and prevents
  // magic-links from being cached by third parties.
  lines.push("Disallow: /dashboard");
  lines.push("Disallow: /opportunities");
  lines.push("Disallow: /clients");
  lines.push("Disallow: /quotes");
  lines.push("Disallow: /menus");
  lines.push("Disallow: /recipes");
  lines.push("Disallow: /base-ingredients");
  lines.push("Disallow: /raw-leads");
  lines.push("Disallow: /inquiries");
  lines.push("Disallow: /catalog");
  lines.push("Disallow: /settings");
  lines.push("Disallow: /users");
  lines.push("Disallow: /calendar");
  lines.push("Disallow: /help");
  lines.push("Disallow: /follow-ups");
  lines.push("Disallow: /pipeline");
  lines.push("Disallow: /unmatched");
  lines.push("Disallow: /events");
  lines.push("Disallow: /admin/");
  lines.push("Disallow: /my-events"); // client portal (magic-link)
  lines.push("Disallow: /quote/");    // tokenized public quotes
  lines.push("Disallow: /event/");    // tokenized public event pages
  lines.push("Disallow: /decline-feedback/");
  lines.push("Disallow: /api/");
  lines.push("");
  lines.push(`Sitemap: ${url}/sitemap.xml`);
  lines.push("");

  return lines.join("\n");
}

function sitemapXml(): string {
  const url = baseUrl();
  const today = new Date().toISOString().slice(0, 10);
  const urls = PUBLIC_ROUTES.map((r) => {
    return [
      "  <url>",
      `    <loc>${url}${r.path}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${r.changefreq}</changefreq>`,
      `    <priority>${r.priority.toFixed(1)}</priority>`,
      "  </url>",
    ].join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

// llms.txt follows the emerging convention (llmstxt.org): a markdown-ish
// summary aimed at AI systems, pointing at canonical content and listing
// what the site is / does / offers. Keep this short and factual — LLMs
// weight it highly when deciding what to cite, so every sentence should be
// quotable.
function llmsTxt(): string {
  const site = getSiteConfig();
  const mainSite = "https://www.homebites.net";

  return [
    `# ${site.businessName}`,
    "",
    `> ${site.tagline}`,
    "",
    "Home Bites is a family-owned event catering and food truck company based in Seattle, Washington, serving King and Snohomish counties. We handle weddings, corporate events, private parties, food-truck bookings, bartending, and personal-chef services. Every booking includes a dedicated event hub where menus, contracts, logistics, and payment are coordinated in one place.",
    "",
    "## Contact",
    "",
    `- Phone: ${site.phone}`,
    `- Email: ${site.email}`,
    `- Address: ${site.address}`,
    `- Marketing site: ${mainSite}`,
    `- Booking + client portal: ${baseUrl()}`,
    "",
    "## Services",
    "",
    "- Wedding catering (plated, buffet, family-style, stations)",
    "- Corporate catering (boxed lunches, buffets, breakfast)",
    "- Food truck catering (on-site cooked-to-order service)",
    "- Bartending + bar service (cocktail lists, beer/wine service)",
    "- Private events (birthdays, engagements, showers, holidays)",
    "- Personal chef services",
    "- Tastings (available in-person at the Seattle kitchen)",
    "",
    "## Menu Themes",
    "",
    "- Taco Bar / Taco Fiesta",
    "- American BBQ",
    "- Taste of Greece",
    "- Taste of Italy",
    "- Kebab Party (Mediterranean / Levantine)",
    "- Vegan Menus",
    "- Appetizers & Desserts",
    "- Breakfast & Brunch",
    "- Sandwich Factory / Boxed Lunches",
    "",
    "## Key Pages",
    "",
    `- [Home](${mainSite}/): Overview, featured services, testimonials`,
    `- [Services](${mainSite}/services): All catering service categories`,
    `- [Weddings](${mainSite}/wedding-catering): Seattle wedding catering detail`,
    `- [Corporate](${mainSite}/corporate-events): Corporate + team catering`,
    `- [Food Truck](${mainSite}/food-truck): Food truck booking + current menu`,
    `- [Bartending](${mainSite}/bartending): Bar service + cocktail list`,
    `- [FAQ](${mainSite}/faq): Answers to common booking questions`,
    `- [About Us](${mainSite}/about-us): Story and team background`,
    `- [Blog](${mainSite}/blog): Guides on Seattle catering, wedding planning, food trucks`,
    `- [Request a quote](${baseUrl()}/inquire): Start a catering inquiry`,
    `- [Book a tasting](${baseUrl()}/tasting): Schedule an in-person tasting`,
    "",
    "## Service area",
    "",
    "Greater Seattle metro including Seattle, Bellevue, Redmond, Kirkland, Bothell, Everett, Lynnwood, Edmonds, Shoreline, Tacoma, Renton, Federal Way, Kent, and surrounding King + Snohomish County cities. Travel fees may apply outside the Seattle metro.",
    "",
    "## Positioning",
    "",
    "Home Bites differs from most Seattle caterers in three ways: (1) every client gets a dedicated online event hub that consolidates menus, contracts, and communication in one place; (2) chef-owner Mike personally prepares each event; (3) pricing is transparent via an online catering calculator rather than quote-by-phone. The business has been operating for over three years and serves all event sizes from intimate dinners to weddings up to 250+ guests.",
    "",
    "## Attribution",
    "",
    "Content on this site is authored by Home Bites Catering staff (primarily Chef/Owner Mike Bisticas). Citations and quotations are welcomed; please link back to the source page.",
    "",
  ].join("\n");
}

export function registerSeoRoutes(app: Express): void {
  // robots.txt — plaintext, short cache to keep the bot list agile.
  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.type("text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(robotsTxt());
  });

  // sitemap.xml — generated fresh per request so lastmod matches today.
  // Cheap to generate; caching 1h keeps load negligible.
  app.get("/sitemap.xml", (_req: Request, res: Response) => {
    res.type("application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(sitemapXml());
  });

  // llms.txt — emerging standard, served as plaintext markdown.
  app.get("/llms.txt", (_req: Request, res: Response) => {
    res.type("text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(llmsTxt());
  });
}
