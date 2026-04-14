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

export function getEmailConfig(): EmailConfig {
  return {
    resendApiKey: process.env.RESEND_API_KEY || null,
    fromEmail: process.env.HOMEBITES_FROM_EMAIL || "events@eathomebites.com",
    fromName: process.env.HOMEBITES_FROM_NAME || "Homebites Catering",
    replyToEmail:
      process.env.HOMEBITES_REPLY_TO_EMAIL ||
      process.env.HOMEBITES_FROM_EMAIL ||
      "events@eathomebites.com",
    adminNotificationEmail:
      process.env.HOMEBITES_ADMIN_NOTIFICATION_EMAIL ||
      process.env.HOMEBITES_CHEF_EMAIL ||
      process.env.HOMEBITES_EMAIL ||
      "events@eathomebites.com",
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
    email: process.env.HOMEBITES_EMAIL || "events@eathomebites.com",
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
      email: process.env.HOMEBITES_CHEF_EMAIL || process.env.HOMEBITES_EMAIL || "events@eathomebites.com",
    },
    social: {
      instagram: process.env.HOMEBITES_INSTAGRAM || "https://www.instagram.com/eathomebites/",
      facebook: process.env.HOMEBITES_FACEBOOK || "https://www.facebook.com/HomeBitesCatering/",
      twitter: process.env.HOMEBITES_TWITTER || "https://twitter.com/eathomebites",
    },
  };
}
