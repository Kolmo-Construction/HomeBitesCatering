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
