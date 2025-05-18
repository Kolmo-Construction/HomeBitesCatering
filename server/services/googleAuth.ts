// server/services/googleAuth.ts
import { google, Auth } from 'googleapis';

// A simple in-memory or DB store for tokens (for a single-user backend service)
// In a real multi-tenant app, you'd store these per user/account securely.
interface TokenStore {
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
  targetEmail?: string;
}

// For a server-side app syncing one mailbox, tokens can be stored more simply.
// For a production app, consider a secure database table for these.
export let tokenStore: TokenStore = {
    targetEmail: process.env.SYNC_TARGET_EMAIL_ADDRESS
};

// Load tokens from a persistent store if available (e.g., a config file, DB, or env vars)
// For simplicity, we'll try to load from env vars, but ideally, refresh token is stored securely after first auth.
if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
    tokenStore.accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    tokenStore.refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    tokenStore.expiryDate = process.env.GOOGLE_TOKEN_EXPIRY_DATE ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY_DATE, 10) : undefined;
}

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Function to set credentials for the oauth2Client
// This should be called only when explicitly starting email-related services
export function setOAuthCredentials() {
  if (tokenStore.accessToken && tokenStore.refreshToken) {
    oauth2Client.setCredentials({
      access_token: tokenStore.accessToken,
      refresh_token: tokenStore.refreshToken,
      expiry_date: tokenStore.expiryDate,
    });
    console.log("GoogleAuth: OAuth credentials initialized from stored tokens");
    return true;
  }
  console.warn("GoogleAuth: Cannot initialize OAuth - no tokens available");
  return false;
}

// Handle token refresh
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    // store the refresh_token in your secure persistent database
    console.log('New refresh token received:', tokens.refresh_token);
    tokenStore.refreshToken = tokens.refresh_token;
    // Update your persistent store (e.g., .env file or a DB)
    // For .env, this would be a manual update or a script.
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
  }
  if (tokens.access_token) {
    console.log('New access token received:', tokens.access_token);
    tokenStore.accessToken = tokens.access_token;
    tokenStore.expiryDate = tokens.expiry_date || undefined;
    // Update your persistent store
    process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
    process.env.GOOGLE_TOKEN_EXPIRY_DATE = tokens.expiry_date?.toString();
  }
  // Here you would typically save these tokens to a persistent store (DB, file)
  // For now, we are updating the in-memory tokenStore and assuming env vars might be manually updated for refresh token.
});

/**
 * Set tokens from an OAuth code (callback)
 * @param code The authorization code from the OAuth callback
 * @returns Promise that resolves to true if tokens were successfully set
 */
export async function setTokensFromCode(code: string): Promise<boolean> {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    if (tokens.access_token) {
      tokenStore.accessToken = tokens.access_token;
      process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
    }
    
    if (tokens.refresh_token) {
      tokenStore.refreshToken = tokens.refresh_token;
      process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
    }
    
    if (tokens.expiry_date) {
      tokenStore.expiryDate = tokens.expiry_date;
      process.env.GOOGLE_TOKEN_EXPIRY_DATE = tokens.expiry_date.toString();
    }
    
    console.log("GoogleAuth: Tokens successfully set from authorization code");
    return true;
  } catch (error) {
    console.error("GoogleAuth: Error setting tokens from code:", error);
    return false;
  }
}