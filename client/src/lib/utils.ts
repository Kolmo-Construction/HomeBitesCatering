import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  // Format date as MMM DD, YYYY
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTime(date: Date): string {
  // Format time as h:mm AM/PM
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`;
}

export function generateRandomColor(seed: string): string {
  // Simple hash function for deterministic color
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // List of pleasant colors
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-pink-500",
    "bg-yellow-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500"
  ];
  
  // Use the hash to select a color
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

// Washington State Department of Revenue API for tax rates
interface WaTaxRateResponse {
  rate?: number;
  code?: number;
  loccode?: string;
  localrate?: number;
}

/**
 * Fetches the tax rate from the Washington Department of Revenue based on address
 * 
 * @param address Street address
 * @param city City name
 * @param zip ZIP code
 * @returns Promise with the tax rate as a decimal (e.g., 0.085 for 8.5%)
 */
export async function fetchWaTaxRate(address: string, city: string, zip: string): Promise<number> {
  try {
    // Encode parameters properly
    const encodedAddr = encodeURIComponent(address);
    const encodedCity = encodeURIComponent(city);
    const encodedZip = encodeURIComponent(zip);
    
    // Build the API URL
    const apiUrl = `https://webgis.dor.wa.gov/webapi/AddressRates.aspx?output=text&addr=${encodedAddr}&city=${encodedCity}&zip=${encodedZip}`;
    
    // Make the request
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('WA tax API response error:', response.status);
      return 0.095; // Default 9.5% tax rate if API fails
    }
    
    // Parse the text response
    const text = await response.text();
    console.log('WA Tax API response:', text);
    
    // Extract the rate using regex
    const rateMatch = text.match(/Rate=([\d.]+)/);
    if (rateMatch && rateMatch[1]) {
      const rate = parseFloat(rateMatch[1]);
      return rate; // This will be like 0.085 for 8.5%
    }
    
    return 0.095; // Default 9.5% tax rate if parsing fails
  } catch (error) {
    console.error('Error fetching WA tax rate:', error);
    return 0.095; // Default 9.5% tax rate on error
  }
}

export function calculateTax(amount: number, zipCode?: string | null, address?: string, city?: string): number {
  // Default tax rate is 9.5%
  let taxRate = 0.095;
  
  // If zipCode is provided, use the existing rate logic
  if (zipCode) {
    // Example implementation - you can expand this with a more comprehensive zip code tax rate database
    const firstDigit = zipCode.charAt(0);
    
    // Just as an example of how you might vary tax rates by region
    if (firstDigit === '9') taxRate = 0.095;  // 9.5% (Washington area)
    else if (firstDigit === '8') taxRate = 0.07;  // 7% (Colorado, etc.)
    else if (firstDigit === '7') taxRate = 0.0625; // 6.25% (Texas, etc.)
    else if (firstDigit === '1') taxRate = 0.0625; // 6.25% (Massachusetts, etc.)
    else if (firstDigit === '2') taxRate = 0.06;   // 6% (DC area)
    else taxRate = 0.08;  // 8% default for other regions
  }
  
  return amount * taxRate;
}

// This function can be used to calculate tax asynchronously with the WA API
export async function calculateTaxAsync(amount: number, address?: string, city?: string, zip?: string): Promise<number> {
  if (!address || !city || !zip) {
    return amount * 0.095; // Use default 9.5% if any address component is missing
  }
  
  try {
    const taxRate = await fetchWaTaxRate(address, city, zip);
    return amount * taxRate;
  } catch (error) {
    console.error('Error calculating tax:', error);
    return amount * 0.095; // Default 9.5% on error
  }
}

export function calculateTotal(subtotal: number, tax: number): number {
  return subtotal + tax;
}
