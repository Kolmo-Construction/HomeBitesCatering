// Data filtering utilities to remove financial information for non-admin users

// Remove financial fields from quote for non-admin users
export function filterQuote(quote: any, userRole: string): any {
  if (userRole === 'admin') {
    return quote; // Return full data for admins
  }

  // Create a copy without financial data
  const { subtotal, tax, total, items, additionalServices, ...filtered } = quote;

  return {
    ...filtered,
    // Optionally include items/services but without pricing
    items: items ? stripPricingFromItems(items) : null,
    additionalServices: additionalServices ? stripPricingFromServices(additionalServices) : null,
  };
}

// Remove pricing from menu item for non-admin users
export function filterMenuItem(item: any, userRole: string): any {
  if (userRole === 'admin') {
    return item;
  }

  const { price, upcharge, ...filtered } = item;
  return filtered;
}

// Filter array of quotes
export function filterQuotes(quotes: any[], userRole: string): any[] {
  return quotes.map(quote => filterQuote(quote, userRole));
}

// Filter array of menu items
export function filterMenuItems(items: any[], userRole: string): any[] {
  return items.map(item => filterMenuItem(item, userRole));
}

// Helper to strip pricing from items JSON
function stripPricingFromItems(items: any): any {
  if (!items) return items;
  if (Array.isArray(items)) {
    return items.map(item => {
      const { price, total, subtotal, ...rest } = item;
      return rest;
    });
  }
  const { price, total, subtotal, ...rest } = items;
  return rest;
}

// Helper to strip pricing from services JSON
function stripPricingFromServices(services: any): any {
  if (!services) return services;
  if (Array.isArray(services)) {
    return services.map(service => {
      const { price, cost, total, ...rest } = service;
      return rest;
    });
  }
  const { price, cost, total, ...rest } = services;
  return rest;
}
