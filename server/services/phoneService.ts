/**
 * Phone Service - Utilities for phone number normalization and validation
 */

/**
 * Normalize a phone number to E.164 format for consistent matching
 * E.164 format: +[country code][subscriber number]
 * Example: +14155552671
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it's a 10-digit US number, add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it's an 11-digit number starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Otherwise, assume it already has country code and add +
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Format a phone number for display
 * Converts +14155552671 to (415) 555-2671
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizePhoneNumber(phone);
  
  // US/Canada number format
  if (normalized.startsWith('+1') && normalized.length === 12) {
    const digits = normalized.slice(2); // Remove +1
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // For other formats, just return the normalized version
  return normalized;
}

/**
 * Validate if a phone number looks reasonable
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhoneNumber(phone);
  
  // Must start with + and have at least 8 digits (minimum international number)
  // and no more than 15 digits (E.164 max)
  return /^\+\d{8,15}$/.test(normalized);
}
