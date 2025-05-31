import { useState, useEffect, useMemo } from 'react';

interface MenuItem {
  id: string;
  name: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  dietaryFlags: string[];
  allergenAlerts: string[];
  nutritionalHighlights: {
    calories?: { min: number; max: number; unit: string };
    protein?: { min: number; max: number; unit: string };
    fat?: { min: number; max: number; unit: string };
    carbs?: { min: number; max: number; unit: string };
    fiber?: { min: number; max: number; unit: string };
  };
}

interface MenuData {
  allItems: MenuItem[];
  itemsByCategory: Record<string, {
    title: string;
    description: string;
    selectionLimit: number | null;
    items: MenuItem[];
  }>;
}

export const useDietaryTracking = (
  selectedItemIds: Record<string, string[]>,
  menuData: MenuData | null
) => {
  const [selectedMenuItems, setSelectedMenuItems] = useState<MenuItem[]>([]);

  // Create a lookup map for all items
  const itemsLookup = useMemo(() => {
    if (!menuData?.allItems) return {};
    
    const lookup: Record<string, MenuItem> = {};
    menuData.allItems.forEach(item => {
      lookup[item.id] = item;
    });
    return lookup;
  }, [menuData]);

  // Update selected items when selection changes
  useEffect(() => {
    const items: MenuItem[] = [];
    
    Object.values(selectedItemIds).forEach(itemIds => {
      itemIds.forEach(itemId => {
        const item = itemsLookup[itemId];
        if (item) {
          items.push(item);
        }
      });
    });
    
    setSelectedMenuItems(items);
  }, [selectedItemIds, itemsLookup]);

  // Calculate dietary summary statistics
  const dietaryStats = useMemo(() => {
    const totalItems = selectedMenuItems.length;
    
    if (totalItems === 0) {
      return {
        totalItems: 0,
        vegetarianPercentage: 0,
        veganPercentage: 0,
        glutenFreePercentage: 0,
        dairyFreePercentage: 0,
        nutFreePercentage: 0,
        hasAllergenAlerts: false,
        uniqueAllergens: [],
        dietaryFlags: []
      };
    }

    const vegetarianCount = selectedMenuItems.filter(item => item.isVegetarian).length;
    const veganCount = selectedMenuItems.filter(item => item.isVegan).length;
    const glutenFreeCount = selectedMenuItems.filter(item => item.isGlutenFree).length;
    const dairyFreeCount = selectedMenuItems.filter(item => item.isDairyFree).length;
    const nutFreeCount = selectedMenuItems.filter(item => item.isNutFree).length;

    const allAllergens = selectedMenuItems.flatMap(item => item.allergenAlerts || []);
    const uniqueAllergens = [...new Set(allAllergens)];
    
    const allFlags = selectedMenuItems.flatMap(item => item.dietaryFlags || []);
    const uniqueFlags = [...new Set(allFlags)];

    return {
      totalItems,
      vegetarianPercentage: Math.round((vegetarianCount / totalItems) * 100),
      veganPercentage: Math.round((veganCount / totalItems) * 100),
      glutenFreePercentage: Math.round((glutenFreeCount / totalItems) * 100),
      dairyFreePercentage: Math.round((dairyFreeCount / totalItems) * 100),
      nutFreePercentage: Math.round((nutFreeCount / totalItems) * 100),
      hasAllergenAlerts: uniqueAllergens.length > 0,
      uniqueAllergens,
      dietaryFlags: uniqueFlags
    };
  }, [selectedMenuItems]);

  // Calculate nutritional totals
  const nutritionalTotals = useMemo(() => {
    return selectedMenuItems.reduce((acc, item) => {
      const nutrition = item.nutritionalHighlights || {};
      
      if (nutrition.calories) {
        acc.calories.min += nutrition.calories.min;
        acc.calories.max += nutrition.calories.max;
      }
      if (nutrition.protein) {
        acc.protein.min += nutrition.protein.min;
        acc.protein.max += nutrition.protein.max;
      }
      if (nutrition.fat) {
        acc.fat.min += nutrition.fat.min;
        acc.fat.max += nutrition.fat.max;
      }
      if (nutrition.carbs) {
        acc.carbs.min += nutrition.carbs.min;
        acc.carbs.max += nutrition.carbs.max;
      }
      if (nutrition.fiber) {
        acc.fiber.min += nutrition.fiber.min;
        acc.fiber.max += nutrition.fiber.max;
      }
      
      return acc;
    }, {
      calories: { min: 0, max: 0 },
      protein: { min: 0, max: 0 },
      fat: { min: 0, max: 0 },
      carbs: { min: 0, max: 0 },
      fiber: { min: 0, max: 0 }
    });
  }, [selectedMenuItems]);

  return {
    selectedMenuItems,
    dietaryStats,
    nutritionalTotals,
    hasSelections: selectedMenuItems.length > 0
  };
};