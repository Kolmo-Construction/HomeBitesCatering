/**
 * One-shot script: send 15 example quotes (one per event-type preset) to
 * hello@eathomebites.com so the team can eyeball the customer-facing render
 * for every preset. Each send goes through the real production pipeline
 * (Resend + the same `quoteSentEmail` template a real inquiry would trigger).
 *
 * DB writes:
 *   - 1 client row tagged "[PRESET DEMO]" (or reused if it already exists)
 *   - 15 quote rows tagged "[PRESET DEMO – <key>]" in `notes`
 *
 * Cleanup later:
 *   DELETE FROM quotes  WHERE notes LIKE '[PRESET DEMO%';
 *   DELETE FROM clients WHERE email = 'hello@eathomebites.com'
 *                         AND notes LIKE '[PRESET DEMO%';
 *
 * Run:
 *   tsx scripts/send-preset-quotes.ts
 */

import "dotenv/config";
import { randomBytes } from "crypto";
import { eq, and, like } from "drizzle-orm";
import { db, pool } from "../server/db";
import { clients, quotes } from "../shared/schema";
import { sendEmail } from "../server/utils/email";
import { quoteSentEmail } from "../server/utils/emailTemplates";
import { getEventPreset, listEventTypeKeys } from "../shared/eventPresets";
import type { Proposal } from "../shared/proposal";

const RECIPIENT = "hello@eathomebites.com";
const DEMO_TAG = "[PRESET DEMO]";
const PUBLIC_BASE_URL =
  process.env.HOMEBITES_PUBLIC_BASE_URL ||
  "https://homebitescatering-production.up.railway.app";

// Six months out — well past any cron-driven follow-up reminder windows.
function eventDateMonthsOut(monthsOffset: number, monthsForward = 6): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsForward + monthsOffset);
  d.setUTCHours(18, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Pick a person context per preset family so the rendered quote actually shows
// the right framing (couple title for romantic, company-y feel for corporate,
// solo for celebratory).
function personContextFor(key: string): {
  firstName: string;
  lastName: string;
  partnerFirstName?: string;
} {
  if (["wedding", "engagement", "anniversary"].includes(key)) {
    return { firstName: "Pascal", lastName: "Matta", partnerFirstName: "Sam" };
  }
  if (["corporate", "conference", "workshop", "fundraiser"].includes(key)) {
    // The Proposal type doesn't yet carry `company`; using the company name
    // as firstName is the cleanest demo workaround so the hero reads "Acme Corp"
    // instead of a contact name. (Real fix: extend Proposal with `company`.)
    return { firstName: "Acme Corp", lastName: "" };
  }
  return { firstName: "Pascal", lastName: "Matta" };
}

// Per-preset menu so each quote shows different food rather than one boilerplate.
function menuFor(key: string): {
  menuTheme: string;
  menuTier: string;
  selections: { name: string; category: string; description: string }[];
  appetizers: { itemName: string; quantity: number; description: string }[];
  desserts: { itemName: string; quantity: number; description: string }[];
} {
  const italianClassics = {
    menuTheme: "italy",
    menuTier: "gold",
    selections: [
      {
        name: "Bruschetta al Pomodoro",
        category: "appetizer",
        description: "Heirloom tomato, basil, aged balsamic on grilled sourdough",
      },
      {
        name: "Hand-rolled Pappardelle Bolognese",
        category: "main",
        description: "Slow-braised beef and pork ragù, parmigiano",
      },
      {
        name: "Grilled Branzino",
        category: "main",
        description: "Lemon, capers, salsa verde, charred broccolini",
      },
      {
        name: "Roasted Heirloom Carrots",
        category: "side",
        description: "Honey, harissa, whipped feta",
      },
    ],
    appetizers: [
      {
        itemName: "Arancini",
        quantity: 80,
        description: "Saffron risotto, mozzarella core",
      },
      {
        itemName: "Prosciutto-Wrapped Melon",
        quantity: 80,
        description: "Cantaloupe, basil, cracked pepper",
      },
    ],
    desserts: [
      {
        itemName: "Tiramisu Cups",
        quantity: 80,
        description: "Espresso, mascarpone, cocoa",
      },
    ],
  };
  if (key === "corporate" || key === "conference" || key === "workshop") {
    return {
      menuTheme: "italy",
      menuTier: "silver",
      selections: [
        {
          name: "Caprese Skewers",
          category: "appetizer",
          description: "Bocconcini, cherry tomato, basil, balsamic glaze",
        },
        {
          name: "Pesto Chicken Wraps",
          category: "main",
          description: "Grilled chicken, sun-dried tomato, arugula, ciabatta",
        },
        {
          name: "Roasted Vegetable Pasta Salad",
          category: "main",
          description: "Penne, zucchini, peppers, lemon vinaigrette",
        },
        {
          name: "Mixed Greens",
          category: "side",
          description: "Citrus vinaigrette, shaved fennel, parmesan",
        },
      ],
      appetizers: [
        {
          itemName: "Mediterranean Mezze Boards",
          quantity: 8,
          description: "Hummus, tzatziki, olives, pita, crudités",
        },
      ],
      desserts: [
        {
          itemName: "Mini Cannoli",
          quantity: 80,
          description: "Sweet ricotta, pistachio dust",
        },
      ],
    };
  }
  if (key === "birthday" || key === "graduation" || key === "reunion" || key === "celebration") {
    return {
      menuTheme: "bbq",
      menuTier: "gold",
      selections: [
        {
          name: "Smoked Brisket",
          category: "main",
          description: "12-hour cherry-wood smoke, house BBQ sauce",
        },
        {
          name: "Buttermilk Fried Chicken",
          category: "main",
          description: "Hot honey drizzle, pickle slaw",
        },
        {
          name: "Mac & Cheese",
          category: "side",
          description: "Three cheeses, toasted breadcrumb top",
        },
        {
          name: "Charred Street Corn",
          category: "side",
          description: "Cotija, lime, smoked chili",
        },
      ],
      appetizers: [
        {
          itemName: "Pulled Pork Sliders",
          quantity: 80,
          description: "Brioche, pickled red onion",
        },
      ],
      desserts: [
        {
          itemName: "Mini Pecan Pies",
          quantity: 80,
          description: "Bourbon-vanilla, flaky crust",
        },
      ],
    };
  }
  if (key === "cocktail_party" || key === "fundraiser") {
    return {
      menuTheme: "italy",
      menuTier: "diamond",
      selections: [
        {
          name: "Crudo of Yellowtail",
          category: "starters",
          description: "Yuzu, olive oil, sea salt, micro greens",
        },
        {
          name: "Wagyu Beef Tartare",
          category: "starters",
          description: "Quail egg, capers, brioche toast",
        },
      ],
      appetizers: [
        {
          itemName: "Tuna Tartare Cones",
          quantity: 100,
          description: "Wonton cone, sesame, avocado",
        },
        {
          itemName: "Lobster Rolls (mini)",
          quantity: 100,
          description: "Brown butter, chive, brioche",
        },
        {
          itemName: "Burrata Crostini",
          quantity: 100,
          description: "Stone fruit, prosciutto, arugula",
        },
      ],
      desserts: [
        {
          itemName: "Champagne Truffles",
          quantity: 100,
          description: "Dark chocolate, gold leaf",
        },
      ],
    };
  }
  if (key === "baby_shower") {
    return {
      menuTheme: "italy",
      menuTier: "silver",
      selections: [
        {
          name: "Quiche Trio",
          category: "main",
          description: "Spinach-feta, lorraine, mushroom-gruyère",
        },
        {
          name: "Lemon Herb Roasted Chicken",
          category: "main",
          description: "Crispy skin, pan jus, herbs",
        },
        {
          name: "Strawberry Spinach Salad",
          category: "side",
          description: "Goat cheese, candied pecans, poppy vinaigrette",
        },
      ],
      appetizers: [
        {
          itemName: "Tea Sandwiches",
          quantity: 80,
          description: "Cucumber, smoked salmon, egg salad",
        },
      ],
      desserts: [
        {
          itemName: "Mini Lemon Tarts",
          quantity: 80,
          description: "Brûléed top, candied zest",
        },
      ],
    };
  }
  if (key === "holiday_party") {
    return {
      menuTheme: "italy",
      menuTier: "gold",
      selections: [
        {
          name: "Roasted Beef Tenderloin",
          category: "main",
          description: "Horseradish cream, rosemary jus",
        },
        {
          name: "Pan-Seared Salmon",
          category: "main",
          description: "Brown butter, capers, crispy potato",
        },
        {
          name: "Roasted Brussels Sprouts",
          category: "side",
          description: "Pancetta, balsamic glaze",
        },
      ],
      appetizers: [
        {
          itemName: "Stuffed Mushrooms",
          quantity: 80,
          description: "Goat cheese, herbs, pine nuts",
        },
      ],
      desserts: [
        {
          itemName: "Mini Chocolate Yule Logs",
          quantity: 80,
          description: "Dark chocolate, raspberry coulis",
        },
      ],
    };
  }
  if (key === "food_truck") {
    return {
      menuTheme: "taco_fiesta",
      menuTier: "silver",
      selections: [
        {
          name: "Carne Asada Tacos",
          category: "main",
          description: "Marinated skirt steak, salsa verde, pickled onion",
        },
        {
          name: "Pollo al Pastor Tacos",
          category: "main",
          description: "Pineapple, cilantro, lime",
        },
        {
          name: "Cilantro Lime Rice & Beans",
          category: "side",
          description: "Charred lime, smoky chipotle",
        },
      ],
      appetizers: [
        {
          itemName: "Chips, Salsa & Guacamole",
          quantity: 8,
          description: "Tri-color tortilla, fresh-made daily",
        },
      ],
      desserts: [
        {
          itemName: "Churros",
          quantity: 80,
          description: "Cinnamon sugar, chocolate dipping sauce",
        },
      ],
    };
  }
  return italianClassics; // wedding / engagement / anniversary
}

function buildProposal(key: string, eventDate: Date): Proposal {
  const person = personContextFor(key);
  const menu = menuFor(key);
  const guests = key === "cocktail_party" ? 100 : key === "food_truck" ? 60 : 80;
  const perPersonCents = key === "cocktail_party" ? 14500 : key === "fundraiser" ? 12500 : 9500;
  const subtotalCents = perPersonCents * guests;
  const serviceFeeCents = Math.round(subtotalCents * 0.15);
  const taxCents = Math.round((subtotalCents + serviceFeeCents) * 0.103);
  const totalCents = subtotalCents + serviceFeeCents + taxCents;

  const isRomantic = ["wedding", "engagement", "anniversary"].includes(key);
  const isCorporateLike = ["corporate", "conference", "workshop", "fundraiser"].includes(key);

  return {
    version: 1,
    firstName: person.firstName,
    lastName: person.lastName,
    partnerFirstName: person.partnerFirstName,
    eventType: key,
    eventDate: isoDate(eventDate),
    guestCount: guests,
    venue: {
      name: isCorporateLike ? "The Westin Bellevue" : "Sodo Park",
      street: isCorporateLike ? "600 Bellevue Way NE" : "3200 1st Ave S",
      city: isCorporateLike ? "Bellevue" : "Seattle",
      state: "WA",
      zip: isCorporateLike ? "98004" : "98134",
    },
    hasCeremony: key === "wedding",
    ceremonyStartTime: key === "wedding" ? "16:00" : null,
    ceremonyEndTime: key === "wedding" ? "16:45" : null,
    hasCocktailHour: !isCorporateLike,
    cocktailStartTime: !isCorporateLike ? "17:00" : null,
    cocktailEndTime: !isCorporateLike ? "18:00" : null,
    hasMainMeal: true,
    mainMealStartTime: isCorporateLike ? "12:00" : "18:30",
    mainMealEndTime: isCorporateLike ? "13:30" : "20:30",
    serviceType: isCorporateLike ? "buffet" : "plated",
    serviceStyle: key === "cocktail_party" ? "cocktail_party" : isCorporateLike ? "buffet" : "plated",
    menuTheme: menu.menuTheme,
    menuTier: menu.menuTier,
    menuSelections: menu.selections,
    appetizers: menu.appetizers,
    desserts: menu.desserts,
    beverages: {
      hasNonAlcoholic: true,
      nonAlcoholicSelections: ["sparkling water", "lemonade", "coffee", "tea"],
      hasAlcoholic: !isCorporateLike,
      bartendingType: !isCorporateLike ? "open_bar" : undefined,
      liquorQuality: !isCorporateLike ? "premium" : undefined,
      coffeeTeaService: true,
    },
    dietary: {
      restrictions: ["vegetarian", "gluten_free"],
      allergies: isRomantic ? ["nuts"] : [],
      specialNotes: isRomantic
        ? "Two guests with severe nut allergies — please flag any cross-contact risk."
        : undefined,
    },
    specialRequests: isRomantic
      ? "Please plate Sam's father (vegetarian) at table 3 — same time as the rest of the head table."
      : null,
    lineItems: [
      {
        name: `${menu.menuTheme === "taco_fiesta" ? "Taco bar" : menu.menuTheme === "bbq" ? "BBQ menu" : "Italian menu"} · ${guests} guests`,
        quantity: 1,
        price: subtotalCents,
      },
    ],
    pricing: {
      perPersonCents,
      subtotalCents,
      serviceFeeCents,
      taxCents,
      totalCents,
      depositPercent: 35,
    },
    customerNotes: null,
  };
}

async function ensureDemoClient(): Promise<number> {
  const existing = await db
    .select()
    .from(clients)
    .where(and(eq(clients.email, RECIPIENT), like(clients.notes, `${DEMO_TAG}%`)));
  if (existing.length > 0) {
    console.log(`  reusing existing demo client id=${existing[0].id}`);
    return existing[0].id;
  }
  const [created] = await db
    .insert(clients)
    .values({
      firstName: "Preset",
      lastName: "Demo",
      email: RECIPIENT,
      notes: `${DEMO_TAG} created ${new Date().toISOString()}`,
      type: "prospect",
    })
    .returning();
  console.log(`  created demo client id=${created.id}`);
  return created.id;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendOnePreset(clientId: number, key: string, monthsOffset: number) {
  const preset = getEventPreset(key);
  const eventDate = eventDateMonthsOut(monthsOffset);
  const proposal = buildProposal(key, eventDate);
  const viewToken = randomBytes(24).toString("base64url");
  const now = new Date();

  const [quote] = await db
    .insert(quotes)
    .values({
      clientId,
      eventType: key,
      eventDate,
      guestCount: proposal.guestCount,
      venue: proposal.venue?.name ?? null,
      venueAddress: proposal.venue?.street ?? null,
      venueCity: proposal.venue?.city ?? null,
      venueState: proposal.venue?.state ?? null,
      venueZip: proposal.venue?.zip ?? null,
      proposal: proposal as any,
      subtotal: proposal.pricing.subtotalCents,
      tax: proposal.pricing.taxCents,
      total: proposal.pricing.totalCents,
      status: "sent",
      sentAt: now,
      viewToken,
      notes: `${DEMO_TAG} – ${key}`,
      autoGenerated: false,
    })
    .returning();

  const publicUrl = `${PUBLIC_BASE_URL}/quote/${viewToken}`;

  const tpl = quoteSentEmail({
    customerFirstName: "there",
    eventType: key,
    eventDate: eventDate.toISOString(),
    guestCount: proposal.guestCount,
    publicQuoteUrl: publicUrl,
  });

  // Tag subject so it's obvious in the inbox which preset each email represents.
  const taggedSubject = `[${preset.label}] ${tpl.subject}`;

  const result = await sendEmail({
    to: RECIPIENT,
    subject: taggedSubject,
    html: tpl.html,
    text: tpl.text,
    clientId,
    templateKey: `preset_demo_${key}`,
  });

  return { key, label: preset.label, quoteId: quote.id, publicUrl, ...result };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — load .env and retry");
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set — would skip all sends; aborting");
    process.exit(1);
  }

  console.log(`\nSending preset demo quotes to ${RECIPIENT}`);
  console.log(`Public base URL: ${PUBLIC_BASE_URL}\n`);

  const clientId = await ensureDemoClient();

  const keys = listEventTypeKeys();
  const results: Array<Awaited<ReturnType<typeof sendOnePreset>>> = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    process.stdout.write(`  [${(i + 1).toString().padStart(2)}/${keys.length}] ${key.padEnd(16)} `);
    try {
      const r = await sendOnePreset(clientId, key, i);
      results.push(r);
      const status = r.sent ? "OK  " : r.skipped ? "SKIP" : "FAIL";
      console.log(`${status}  quote#${r.quoteId}  ${r.publicUrl}${r.error ? "  err=" + r.error : ""}`);
    } catch (err: any) {
      console.log(`THROW  ${err?.message || err}`);
      results.push({
        key,
        label: key,
        quoteId: -1,
        publicUrl: "",
        sent: false,
        skipped: false,
        error: err?.message || String(err),
      });
    }
    if (i < keys.length - 1) await sleep(1200); // throttle Resend
  }

  console.log(`\n\n────────────────────────────────────────────────────────────`);
  console.log(`Summary`);
  console.log(`────────────────────────────────────────────────────────────`);
  const sent = results.filter((r) => r.sent).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.sent && !r.skipped).length;
  console.log(`  sent:    ${sent}`);
  console.log(`  skipped: ${skipped}`);
  console.log(`  failed:  ${failed}`);
  console.log(`  total:   ${results.length}`);

  console.log(`\n  Cleanup later:`);
  console.log(`    DELETE FROM quotes  WHERE notes LIKE '${DEMO_TAG}%';`);
  console.log(`    DELETE FROM clients WHERE email = '${RECIPIENT}' AND notes LIKE '${DEMO_TAG}%';`);

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
