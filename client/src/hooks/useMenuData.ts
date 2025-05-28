import { useQuery } from '@tanstack/react-query';

// Types for the enriched menu data from the database
export interface EnrichedMenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  upcharge: number;
  
  // Basic dietary flags
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  
  // Rich dietary information
  dietaryFlags: string[];
  allergenAlerts: string[];
  nutritionalHighlights: {
    calories?: { min: number; max: number; unit: string };
    protein?: { min: number; max: number; unit: string };
    fat?: { min: number; max: number; unit: string };
    carbs?: { min: number; max: number; unit: string };
    fiber?: { min: number; max: number; unit: string };
    sodium?: { min: number; max: number; unit: string };
    sugar?: { min: number; max: number; unit: string };
  };
  preparationNotes: string;
  suitableForDiets: string[];
  customerGuidance: string;
  availableLotSizes: number[];
  image?: string;
}

export interface MenuTheme {
  id: number;
  name: string;
  description?: string;
  theme_key: string;
  packages: MenuPackage[];
  categories: MenuCategory[];
}

export interface MenuPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  minGuestCount?: number;
  customizable: boolean;
}

export interface MenuCategory {
  category_key: string;
  display_title: string;
  description?: string;
  available_item_ids: string[];
  selection_limit: number;
  upcharge_info?: Record<string, number>;
}

// Hook to fetch wedding menu themes
export const useWeddingMenuThemes = () => {
  return useQuery<MenuTheme[]>({
    queryKey: ['/api/questionnaire/wedding-menu-themes'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch menu items by category
export const useMenuItemsByCategory = (category?: string, menuId?: number) => {
  return useQuery<EnrichedMenuItem[]>({
    queryKey: ['/api/questionnaire/menu-items', { category, menuId }],
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch specific menu items by IDs
export const useMenuItemsByIds = (ids: string[]) => {
  return useQuery<EnrichedMenuItem[]>({
    queryKey: ['/api/questionnaire/menu-items-by-ids', ids],
    queryFn: async () => {
      const response = await fetch('/api/questionnaire/menu-items-by-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }
      return response.json();
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to get dietary recommendations
export const useDietaryRecommendations = (
  dietaryPreferences?: string[],
  allergens?: string[],
  category?: string
) => {
  const queryParams = new URLSearchParams();
  
  if (dietaryPreferences?.length) {
    queryParams.append('dietaryPreferences', dietaryPreferences.join(','));
  }
  if (allergens?.length) {
    queryParams.append('allergens', allergens.join(','));
  }
  if (category) {
    queryParams.append('category', category);
  }

  return useQuery<EnrichedMenuItem[]>({
    queryKey: ['/api/questionnaire/dietary-recommendations', { dietaryPreferences, allergens, category }],
    queryFn: async () => {
      const response = await fetch(`/api/questionnaire/dietary-recommendations?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dietary recommendations');
      }
      return response.json();
    },
    enabled: !!(dietaryPreferences?.length || allergens?.length || category),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Utility function to format nutritional information for display
export const formatNutritionalInfo = (highlights: EnrichedMenuItem['nutritionalHighlights']) => {
  const formatted: Record<string, string> = {};
  
  Object.entries(highlights).forEach(([key, value]) => {
    if (value) {
      formatted[key] = `${value.min}-${value.max} ${value.unit}`;
    }
  });
  
  return formatted;
};

// Utility function to check if an item meets dietary requirements
export const checkDietaryCompatibility = (
  item: EnrichedMenuItem,
  userPreferences: string[] = [],
  userAllergens: string[] = []
) => {
  // Check allergens first - if item contains any restricted allergens, it's not compatible
  const hasRestrictedAllergen = item.allergenAlerts.some(allergen =>
    userAllergens.some(userAllergen =>
      allergen.toLowerCase().includes(userAllergen.toLowerCase())
    )
  );
  
  if (hasRestrictedAllergen) {
    return { compatible: false, reason: 'Contains restricted allergens' };
  }
  
  // Check dietary preferences
  const meetsPreferences = userPreferences.some(pref => {
    const prefLower = pref.toLowerCase();
    
    // Check basic flags
    switch (prefLower) {
      case 'vegetarian': return item.isVegetarian;
      case 'vegan': return item.isVegan;
      case 'gluten_free': return item.isGlutenFree;
      case 'dairy_free': return item.isDairyFree;
      case 'nut_free': return item.isNutFree;
    }
    
    // Check suitable diet preferences
    return item.suitableForDiets.some(diet =>
      diet.toLowerCase().includes(prefLower)
    );
  });
  
  if (userPreferences.length > 0 && !meetsPreferences) {
    return { compatible: false, reason: 'Does not match dietary preferences' };
  }
  
  return { compatible: true, reason: null };
};