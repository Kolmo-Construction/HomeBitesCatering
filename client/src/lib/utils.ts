import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number, formatStr: string = 'PPP'): string {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

export function formatCurrency(amount: number | string | null | undefined, options: Intl.NumberFormatOptions = {}): string {
  if (amount === null || amount === undefined || amount === '') return '$0.00';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '$0.00';
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  };

  return new Intl.NumberFormat('en-US', defaultOptions).format(numericAmount);
}

export function calculateTax(subtotal: number, taxRate: number | null | undefined): number {
  if (taxRate === null || taxRate === undefined) {
    // Default to 10% if no tax rate is specified
    return Math.round(subtotal * 0.1);
  }
  
  // Convert percentage to decimal (e.g., 8.6% becomes 0.086)
  const taxRateDecimal = taxRate / 100;
  
  // Calculate tax amount and round to nearest integer (if storing in cents)
  return Math.round(subtotal * taxRateDecimal);
}

export function calculateTotal(subtotal: number, tax: number, additionalFees: number = 0): number {
  return subtotal + tax + additionalFees;
}

export async function calculateTaxAsync(
  subtotal: number, 
  address: string | null | undefined, 
  city: string | null | undefined, 
  state: string | null | undefined, 
  zip: string | null | undefined
): Promise<{taxRate: number, taxAmount: number}> {
  // Default tax rate if we can't determine it
  const defaultTaxRate = 10.0; // 10%
  
  // If no address info is provided, return default tax calculation
  if (!address || !city || !state || !zip) {
    return {
      taxRate: defaultTaxRate,
      taxAmount: calculateTax(subtotal, defaultTaxRate)
    };
  }
  
  try {
    // In a real implementation, this would call a tax API
    // For now we're just using local logic
    
    // WA state base rate is 6.5%
    let taxRate = 6.5;
    
    // Add local rates based on zip code (simplified example)
    // In reality, you'd use a tax API or more comprehensive database
    if (zip.startsWith('981')) { // Seattle area
      taxRate += 3.75; // Seattle has additional local tax
    } else if (zip.startsWith('980')) { // Bellevue area
      taxRate += 3.5;
    } else if (zip.startsWith('983')) { // Tacoma area
      taxRate += 3.1;
    } else if (zip.startsWith('99')) { // Spokane area
      taxRate += 2.5;
    } else {
      // General WA locations
      taxRate += 2.0;
    }
    
    return {
      taxRate,
      taxAmount: calculateTax(subtotal, taxRate)
    };
  } catch (error) {
    console.error('Error calculating tax rate:', error);
    return {
      taxRate: defaultTaxRate,
      taxAmount: calculateTax(subtotal, defaultTaxRate)
    };
  }
}