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