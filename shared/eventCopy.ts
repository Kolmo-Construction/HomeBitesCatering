/**
 * Event-type copy templates.
 *
 * Keeps wedding-specific language ("congratulations on your engagement",
 * couple titles, "on the day you say I do") out of corporate/birthday/other
 * proposals. Pairs with eventThemes.ts (which owns visual styling).
 *
 * Consumed by QuoteProposalView, PublicEventPage, ClientPortal, and
 * server-side pdfGenerator (via a mirror helper).
 */

export interface EventPersonContext {
  firstName?: string | null;
  lastName?: string | null;
  partnerFirstName?: string | null;
  partnerLastName?: string | null;
  company?: string | null;
}

export interface EventCopy {
  /** Whether the event uses a "Name & Partner" couple title. */
  useCoupleTitle: boolean;
  /** Kicker above the hero title, e.g., "A Wedding Proposal". */
  proposalKicker: string;
  /** One-liner under the hero, addressed to the customer. */
  proposalLead: (ctx: EventPersonContext) => string;
  /** Sign-off above the team signature. */
  closingSignoff: string;
  /** Banner when the customer accepts — "We're booked!" variants. */
  acceptedHeadline: string;
  /** Blurb under the accepted headline. */
  acceptedBlurb: string;
  /** Small kicker on celebration page. */
  celebrationKicker: string;
  /** Subtitle on celebration page. */
  celebrationSubtitle: (ctx: EventPersonContext) => string;
  /** Label for the "Coming up next" checklist heading on the event page. */
  comingNextLabel: string;
  /**
   * Build the primary display title for the customer. For weddings/engagements,
   * this is "Name & Partner" when a partner exists. For corporate, this is the
   * company name. Otherwise, first + last name. Never duplicates the same name
   * with an ampersand.
   */
  displayTitle: (ctx: EventPersonContext) => string;
}

function formatSoloName(ctx: EventPersonContext): string {
  const first = (ctx.firstName || "").trim();
  const last = (ctx.lastName || "").trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return "there";
}

function formatCoupleTitle(ctx: EventPersonContext): string {
  const a = (ctx.firstName || "").trim();
  const b = (ctx.partnerFirstName || "").trim();
  // If the two names match (or partner is empty), fall back to solo — never
  // render "Pascal & Pascal".
  if (a && b && a.toLowerCase() !== b.toLowerCase()) return `${a} & ${b}`;
  return formatSoloName(ctx);
}

const romanticCopy: Omit<EventCopy, "proposalKicker" | "celebrationKicker"> = {
  useCoupleTitle: true,
  proposalLead: (ctx) =>
    `Congratulations${formatCoupleTitle(ctx) === "there" ? "" : ", " + formatCoupleTitle(ctx)}. It would be our honor to feed your guests on your big day. Here's what we've put together for you.`,
  closingSignoff: "Looking forward to celebrating with you,",
  acceptedHeadline: "We're officially booked!",
  acceptedBlurb:
    "Thank you for choosing Homebites to be part of your day. We'll be in touch within 24 hours with the contract and deposit instructions.",
  celebrationSubtitle: (ctx) =>
    `A celebration prepared with care for ${formatCoupleTitle(ctx)}.`,
  comingNextLabel: "The flow of your day",
  displayTitle: formatCoupleTitle,
};

const corporateCopy: Omit<EventCopy, "proposalKicker" | "celebrationKicker"> = {
  useCoupleTitle: false,
  proposalLead: (ctx) => {
    const name = ctx.company?.trim() || formatSoloName(ctx);
    return `Thank you for considering Homebites for ${name}'s event. Here's the proposal we've put together.`;
  },
  closingSignoff: "Looking forward to working with you,",
  acceptedHeadline: "You're officially booked.",
  acceptedBlurb:
    "Thank you for choosing Homebites. We'll follow up within 24 hours with the contract and deposit instructions.",
  celebrationSubtitle: (ctx) =>
    `${ctx.company?.trim() || formatSoloName(ctx)} — event details at a glance.`,
  comingNextLabel: "Run of show",
  displayTitle: (ctx) => ctx.company?.trim() || formatSoloName(ctx),
};

const celebratoryCopy: Omit<EventCopy, "proposalKicker" | "celebrationKicker"> = {
  useCoupleTitle: false,
  proposalLead: (ctx) =>
    `Thanks for thinking of us, ${formatSoloName(ctx)}. Here's the proposal we've put together for your celebration.`,
  closingSignoff: "Can't wait to cook for you,",
  acceptedHeadline: "You're officially booked!",
  acceptedBlurb:
    "Thanks for choosing Homebites. We'll follow up within 24 hours with the contract and deposit instructions.",
  celebrationSubtitle: (ctx) =>
    `A celebration prepared with care for ${formatSoloName(ctx)}.`,
  comingNextLabel: "The flow of your day",
  displayTitle: formatSoloName,
};

const professionalCopy: Omit<EventCopy, "proposalKicker" | "celebrationKicker"> = {
  useCoupleTitle: false,
  proposalLead: (ctx) => {
    const name = ctx.company?.trim() || formatSoloName(ctx);
    return `Thank you for considering Homebites for ${name}. Here's the proposal we've put together.`;
  },
  closingSignoff: "Looking forward to working with you,",
  acceptedHeadline: "You're officially booked.",
  acceptedBlurb:
    "Thanks for choosing Homebites. We'll follow up within 24 hours with the contract and deposit instructions.",
  celebrationSubtitle: (ctx) =>
    `${ctx.company?.trim() || formatSoloName(ctx)} — event details at a glance.`,
  comingNextLabel: "Run of show",
  displayTitle: (ctx) => ctx.company?.trim() || formatSoloName(ctx),
};

const copyByType: Record<string, EventCopy> = {
  wedding: {
    ...romanticCopy,
    proposalKicker: "A Wedding Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
  engagement: {
    ...romanticCopy,
    proposalKicker: "An Engagement Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
  anniversary: {
    ...romanticCopy,
    proposalKicker: "An Anniversary Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
  corporate: {
    ...corporateCopy,
    proposalKicker: "A Corporate Event Proposal",
    celebrationKicker: "Your event, handled",
  },
  conference: {
    ...professionalCopy,
    proposalKicker: "A Conference Catering Proposal",
    celebrationKicker: "Your event, handled",
  },
  workshop: {
    ...professionalCopy,
    proposalKicker: "A Workshop Catering Proposal",
    celebrationKicker: "Your event, handled",
  },
  fundraiser: {
    ...professionalCopy,
    proposalKicker: "A Fundraiser Catering Proposal",
    celebrationKicker: "Your event, handled",
  },
  graduation: {
    ...celebratoryCopy,
    proposalKicker: "A Graduation Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
  birthday: {
    ...celebratoryCopy,
    proposalKicker: "A Birthday Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
  baby_shower: {
    ...celebratoryCopy,
    proposalKicker: "A Baby Shower Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
  holiday_party: {
    ...celebratoryCopy,
    proposalKicker: "A Holiday Party Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
  reunion: {
    ...celebratoryCopy,
    proposalKicker: "A Reunion Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
  food_truck: {
    ...celebratoryCopy,
    proposalKicker: "A Food Truck Proposal",
    celebrationKicker: "Your event, handled",
  },
  celebration: {
    ...celebratoryCopy,
    proposalKicker: "An Event Proposal",
    celebrationKicker: "A celebration prepared with care",
  },
};

const defaultCopy: EventCopy = {
  ...celebratoryCopy,
  proposalKicker: "An Event Proposal",
  celebrationKicker: "Your event, handled",
};

/**
 * Return the copy pack for a given event type. Unknown types fall back to the
 * neutral "event" copy — never wedding by default.
 */
export function getEventCopy(eventType: string | null | undefined): EventCopy {
  if (!eventType) return defaultCopy;
  const normalized = eventType.toLowerCase().replace(/[\s-]+/g, "_");
  return copyByType[normalized] || defaultCopy;
}
