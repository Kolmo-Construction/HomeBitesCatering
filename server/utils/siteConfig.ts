// Public-facing Homebites brand/contact config, sourced from env vars so it can be
// changed without a deploy. Defaults are scraped from https://www.homebites.net so
// the app works out of the box.

export interface SiteConfig {
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

// Server-side email config. NEVER sent to the client — only used internally by
// the email helper to decide whether to send, and what from/reply-to addresses
// to use. Public base URL is used when composing absolute links in outbound emails
// (e.g. from the scheduled reminder cron where there's no request context).
export interface EmailConfig {
  resendApiKey: string | null;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  adminNotificationEmail: string;
  publicBaseUrl: string;
  cronSecret: string | null;
}

// Server-side SMS config. NEVER sent to the client. Mirrors EmailConfig pattern:
// if any of accountSid/authToken/fromNumber are missing, sends are skipped.
export interface SmsConfig {
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioFromNumber: string | null;
  ownerSmsNumber: string | null;
  publicBaseUrl: string;
}

export function getSmsConfig(): SmsConfig {
  return {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || null,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || null,
    twilioFromNumber: process.env.TWILIO_PHONE_NUMBER || null,
    ownerSmsNumber: process.env.OWNER_SMS_NUMBER || null,
    publicBaseUrl: process.env.HOMEBITES_PUBLIC_BASE_URL || "https://homebitescatering-production.up.railway.app",
  };
}

// Cal.com booking config. Used by the "I need more info" flow + tasting flow.
// If embedUrl is unset, the client-side code falls back to a mailto/phone link.
export interface CalComConfig {
  consultationEmbedUrl: string | null;
  tastingEmbedUrl: string | null;
  webhookSecret: string | null;
}

export function getCalComConfig(): CalComConfig {
  return {
    consultationEmbedUrl: process.env.CAL_COM_EMBED_URL || null,
    tastingEmbedUrl: process.env.CAL_COM_TASTING_URL || null,
    webhookSecret: process.env.CAL_COM_WEBHOOK_SECRET || null,
  };
}

// Square payments config. Used by paymentService + Square webhook.
// Sandbox vs Production is driven by SQUARE_ENVIRONMENT.
export interface SquareConfig {
  accessToken: string | null;
  applicationId: string | null;
  locationId: string | null;
  webhookSignatureKey: string | null;
  environment: "sandbox" | "production";
  // The public URL Square posts webhooks to (exact string matters — it's part
  // of the signature payload). Falls back to publicBaseUrl + /api/webhooks/square.
  webhookNotificationUrl: string;
  // Tasting pricing. Flat default per the funnel spec ($125 for 2-3 guests).
  tastingFlatPriceCents: number;
  // Cal.com event-type slug that identifies a tasting booking (so the webhook
  // knows to create a tasting row vs. a consultation).
  tastingEventSlug: string;
}

// P2-1: BoldSign e-signature config.
export interface BoldSignConfig {
  apiKey: string | null;
  webhookSecret: string | null;
  // API base. BoldSign offers regional hosts; default US.
  apiBase: string;
  // Reply-to email for BoldSign notifications. Falls back to chef/site email.
  senderEmail: string;
  senderName: string;
}

export function getBoldSignConfig(): BoldSignConfig {
  return {
    apiKey: process.env.BOLDSIGN_API_KEY || null,
    webhookSecret: process.env.BOLDSIGN_WEBHOOK_SECRET || null,
    apiBase: process.env.BOLDSIGN_API_BASE || "https://api.boldsign.com",
    senderEmail:
      process.env.BOLDSIGN_SENDER_EMAIL ||
      process.env.HOMEBITES_FROM_EMAIL ||
      "Hello@eathomebites.com",
    senderName: process.env.BOLDSIGN_SENDER_NAME || process.env.HOMEBITES_FROM_NAME || "Home Bites Catering",
  };
}

// P2-2: Deposit percentage config (default 35% per the funnel spec)
export function getDepositPercent(): number {
  const n = Number(process.env.DEPOSIT_PERCENT);
  if (Number.isFinite(n) && n >= 1 && n <= 100) return n;
  return 35;
}

export function getSquareConfig(): SquareConfig {
  const publicBaseUrl =
    process.env.HOMEBITES_PUBLIC_BASE_URL || "https://homebitescatering-production.up.railway.app";
  return {
    accessToken: process.env.SQUARE_ACCESS_TOKEN || null,
    applicationId: process.env.SQUARE_APPLICATION_ID || null,
    locationId: process.env.SQUARE_LOCATION_ID || null,
    webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || null,
    environment:
      (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase() === "production"
        ? "production"
        : "sandbox",
    webhookNotificationUrl:
      process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ||
      `${publicBaseUrl.replace(/\/$/, "")}/api/webhooks/square`,
    tastingFlatPriceCents: Number(process.env.TASTING_PRICE_CENTS) || 12500,
    tastingEventSlug: process.env.CAL_TASTING_EVENT_SLUG || "tasting",
  };
}

export function getEmailConfig(): EmailConfig {
  return {
    resendApiKey: process.env.RESEND_API_KEY || null,
    fromEmail: process.env.HOMEBITES_FROM_EMAIL || "Hello@eathomebites.com",
    fromName: process.env.HOMEBITES_FROM_NAME || "Homebites Catering",
    replyToEmail:
      process.env.HOMEBITES_REPLY_TO_EMAIL ||
      process.env.HOMEBITES_FROM_EMAIL ||
      "Hello@eathomebites.com",
    adminNotificationEmail:
      process.env.HOMEBITES_ADMIN_NOTIFICATION_EMAIL ||
      process.env.HOMEBITES_CHEF_EMAIL ||
      process.env.HOMEBITES_EMAIL ||
      "Hello@eathomebites.com",
    publicBaseUrl: process.env.HOMEBITES_PUBLIC_BASE_URL || "https://homebitescatering-production.up.railway.app",
    cronSecret: process.env.CRON_SECRET || null,
  };
}

export function getSiteConfig(): SiteConfig {
  return {
    businessName: process.env.HOMEBITES_BUSINESS_NAME || "Homebites Catering",
    tagline:
      process.env.HOMEBITES_TAGLINE ||
      "Bring your event to life with custom menus & exceptional service.",
    address: process.env.HOMEBITES_ADDRESS || "1005 Terrace St, Seattle, WA 98104",
    phone: process.env.HOMEBITES_PHONE || "206.779.1347",
    email: process.env.HOMEBITES_EMAIL || "Hello@eathomebites.com",
    website: process.env.HOMEBITES_WEBSITE || "https://www.homebites.net",
    chef: {
      firstName: process.env.HOMEBITES_CHEF_FIRST_NAME || "Mike",
      lastName: process.env.HOMEBITES_CHEF_LAST_NAME || "",
      role: process.env.HOMEBITES_CHEF_ROLE || "Chef & Owner",
      bio:
        process.env.HOMEBITES_CHEF_BIO ||
        "I'll be personally preparing your event with my team. If anything comes up before the day, reach out to me directly — I'd rather hear from you than hope everything's okay.",
      photoUrl: process.env.HOMEBITES_CHEF_PHOTO_URL || null,
      phone: process.env.HOMEBITES_CHEF_PHONE || process.env.HOMEBITES_PHONE || "206.779.1347",
      email: process.env.HOMEBITES_CHEF_EMAIL || process.env.HOMEBITES_EMAIL || "Hello@eathomebites.com",
    },
    social: {
      instagram: process.env.HOMEBITES_INSTAGRAM || "https://www.instagram.com/eathomebites/",
      facebook: process.env.HOMEBITES_FACEBOOK || "https://www.facebook.com/HomeBitesCatering/",
      twitter: process.env.HOMEBITES_TWITTER || "https://twitter.com/eathomebites",
    },
  };
}

// P0-4: Post-event review & referral config.
// GOOGLE_REVIEW_URL points to the "leave a review" link from Google Business Profile.
// REFERRAL_CREDIT is the dollar amount promised to customers who refer a booked event.
export interface ReviewConfig {
  googleReviewUrl: string | null;
  referralCreditDollars: number;
}

export function getReviewConfig(): ReviewConfig {
  return {
    googleReviewUrl: process.env.GOOGLE_REVIEW_URL || null,
    referralCreditDollars: Number(process.env.REFERRAL_CREDIT_DOLLARS) || 100,
  };
}
