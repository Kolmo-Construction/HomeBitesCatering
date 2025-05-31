// Generated menu data exports
export interface MenuItem {
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
  allergenAlerts: string[];
  nutritionalHighlights: {
    calories?: { min: number; max: number; unit: string };
    protein?: { min: number; max: number; unit: string };
    carbs?: { min: number; max: number; unit: string };
    fat?: { min: number; max: number; unit: string };
    fiber?: { min: number; max: number; unit: string };
  };
  preparationNotes: string;
  suitableForDiets: string[];
  customerGuidance: string;
  image?: string;
}

export interface MenuTheme {
  id: number;
  name: string;
  description: string;
  allItems: MenuItem[];
  itemsByCategory?: any;
  totalItemCount?: number;
}

// Import the generated JSON files
import * as allMenuItemsData from './allMenuItems.json';
import * as menusByThemeData from './menusByTheme.json';

export const allMenuItems: MenuItem[] = allMenuItemsData as MenuItem[];
export const menusByTheme: Record<string, MenuTheme> = menusByThemeData as Record<string, MenuTheme>;