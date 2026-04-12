// Data filtering utilities to remove financial information for non-admin users

// Remove financial fields from estimate for non-admin users
export function filterEstimate(estimate: any, userRole: string): any {
  if (userRole === 'admin') {
    return estimate; // Return full data for admins
  }

  // Create a copy without financial data
  const { subtotal, tax, total, items, additionalServices, ...filtered } = estimate;

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

// Filter array of estimates
export function filterEstimates(estimates: any[], userRole: string): any[] {
  return estimates.map(estimate => filterEstimate(estimate, userRole));
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
