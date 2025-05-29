// Import the generated menu data from build-time generation
import menusByTheme from '@/data/generated/menusByTheme.json';
import allMenuItems from '@/data/generated/allMenuItems.json';

export interface DatabaseMenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  upcharge: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  dietaryFlags: string[];
  allergens: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface DatabaseMenuTheme {
  id: number;
  name: string;
  description: string;
  allItems: DatabaseMenuItem[];
  itemsByCategory: {
    [categoryKey: string]: {
      title: string;
      description: string;
      selectionLimit: number | null;
      items: DatabaseMenuItem[];
    };
  };
  totalItemCount: number;
}

// Export the loaded menu data
export const generatedMenusByTheme = menusByTheme as Record<string, DatabaseMenuTheme>;
export const generatedAllMenuItems = allMenuItems as DatabaseMenuItem[];

// Helper function to get a specific theme's data
export function getMenuThemeData(themeKey: string): DatabaseMenuTheme | null {
  return generatedMenusByTheme[themeKey] || null;
}

// Helper function to get Taco Fiesta menu data
export function getTacoFiestaMenuData(): DatabaseMenuTheme | null {
  return getMenuThemeData('theme_21');
}

// Helper function to get American BBQ menu data
export function getAmericanBBQMenuData(): DatabaseMenuTheme | null {
  return getMenuThemeData('custom_american_bbq');
}

// Helper function to organize items by type for the Taco Fiesta menu
export function getTacoFiestaItemsByType(): {
  mains: DatabaseMenuItem[];
  sides: DatabaseMenuItem[];
  salsas: DatabaseMenuItem[];
  condiments: DatabaseMenuItem[];
} {
  const tacoData = getTacoFiestaMenuData();
  if (!tacoData) {
    return { mains: [], sides: [], salsas: [], condiments: [] };
  }

  const categorizeItem = (item: DatabaseMenuItem) => {
    const category = item.category.toLowerCase();
    
    if (category.includes('salsa') || category.includes('condiment')) {
      if (category.includes('salsa')) return 'salsas';
      return 'condiments';
    }
    
    if (category.includes('side') || category.includes('vegetable') || 
        category.includes('grain') || item.name.toLowerCase().includes('rice') ||
        item.name.toLowerCase().includes('beans')) {
      return 'sides';
    }
    
    return 'mains';
  };

  const organized = {
    mains: [] as DatabaseMenuItem[],
    sides: [] as DatabaseMenuItem[],
    salsas: [] as DatabaseMenuItem[],
    condiments: [] as DatabaseMenuItem[]
  };

  tacoData.allItems.forEach(item => {
    const type = categorizeItem(item);
    organized[type].push(item);
  });

  return organized;
}