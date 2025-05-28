// dietaryInformation.ts - Comprehensive dietary and nutritional data structure

export type DietaryFlag = 
  | "VEGAN" 
  | "VEGETARIAN" 
  | "DAIRY_FREE" 
  | "EGG_FREE" 
  | "GLUTEN_FREE" 
  | "NUT_FREE" 
  | "SOY_FREE" 
  | "SHELLFISH_FREE" 
  | "FISH_FREE" 
  | "SESAME_FREE" 
  | "LOW_SODIUM" 
  | "KETO_FRIENDLY" 
  | "PALEO" 
  | "LOW_CARB" 
  | "HIGH_PROTEIN" 
  | "LOW_FAT" 
  | "HIGH_FIBER" 
  | "DIABETIC_FRIENDLY" 
  | "HEART_HEALTHY";

export type AllergenAlert = 
  | "CONTAINS_NUTS" 
  | "CONTAINS_GLUTEN" 
  | "CONTAINS_DAIRY" 
  | "CONTAINS_EGGS" 
  | "CONTAINS_SOY" 
  | "CONTAINS_SHELLFISH" 
  | "CONTAINS_FISH" 
  | "CONTAINS_SESAME" 
  | "MAY_CONTAIN_GLUTEN" 
  | "MAY_CONTAIN_NUTS" 
  | "MAY_CONTAIN_DAIRY" 
  | "MAY_CONTAIN_SESAME";

export type DietaryModification = 
  | "GLUTEN_FREE_OPTION" 
  | "DAIRY_FREE_OPTION" 
  | "VEGAN_OPTION" 
  | "LOW_SODIUM_OPTION" 
  | "SAUCE_ON_SIDE" 
  | "GRILLED_INSTEAD_OF_FRIED" 
  | "NO_ADDED_SUGAR" 
  | "PORTION_CONTROL_AVAILABLE";

export type DietPreferenceCategory = 
  | "BALANCED" 
  | "HIGH_PROTEIN" 
  | "CARB_HEAVY" 
  | "LOW_FAT" 
  | "LOW_SUGAR" 
  | "MEDITERRANEAN" 
  | "PLANT_BASED" 
  | "KETO" 
  | "WEIGHT_MANAGEMENT" 
  | "ATHLETIC_PERFORMANCE"
  | "VEGETARIAN"
  | "VEGAN" 
  | "LOW_CARB"
  | "HIGH_FIBER"
  | "HEART_HEALTHY";

export interface NutritionalInfo {
  calories_range_kcal: string;
  carbs_g_range: string;
  protein_g_range: string;
  fat_g_range: string;
  fiber_g_range: string;
  sodium_mg_range?: string;
  sugar_g_range?: string;
  saturated_fat_g_range?: string;
}

export interface DietaryInformation {
  item_name: string;
  origin?: string;
  nutritional_info: NutritionalInfo;
  primary_ingredients: string[];
  dietary_flags: DietaryFlag[];
  allergen_alert: AllergenAlert[];
  key_preparation_notes: string;
  modifiable_for_diet: DietaryModification[];
  guidance_for_customer: string;
  diet_preference_fit: DietPreferenceCategory[];
  health_benefits?: string[];
  chef_recommendations?: string;
}

// Enhanced MenuItem type that includes dietary information
export interface EnhancedMenuItem {
  id: string;
  name: string;
  upcharge?: number;
  description?: string;
  dietary_info: DietaryInformation;
}

// Diet preference profiles to help guide customer choices
export const dietPreferenceProfiles: Record<DietPreferenceCategory, {
  name: string;
  description: string;
  priority_nutrients: string[];
  avoid_flags: DietaryFlag[];
  prefer_flags: DietaryFlag[];
}> = {
  BALANCED: {
    name: "Balanced Diet",
    description: "Well-rounded nutrition with moderate portions of all food groups",
    priority_nutrients: ["protein", "fiber", "healthy fats"],
    avoid_flags: [],
    prefer_flags: ["HIGH_FIBER", "HEART_HEALTHY"]
  },
  HIGH_PROTEIN: {
    name: "High Protein",
    description: "Emphasis on protein-rich foods for muscle building and satiety",
    priority_nutrients: ["protein"],
    avoid_flags: [],
    prefer_flags: ["HIGH_PROTEIN", "LOW_CARB"]
  },
  CARB_HEAVY: {
    name: "Carb-Heavy",
    description: "Higher carbohydrate intake for energy and satisfaction",
    priority_nutrients: ["carbohydrates", "fiber"],
    avoid_flags: ["LOW_CARB", "KETO_FRIENDLY"],
    prefer_flags: ["HIGH_FIBER"]
  },
  LOW_FAT: {
    name: "Low Fat",
    description: "Reduced fat content for heart health and weight management",
    priority_nutrients: ["protein", "fiber"],
    avoid_flags: [],
    prefer_flags: ["LOW_FAT", "HEART_HEALTHY"]
  },
  LOW_SUGAR: {
    name: "Low Sugar",
    description: "Minimal added sugars for blood sugar control",
    priority_nutrients: ["protein", "fiber"],
    avoid_flags: [],
    prefer_flags: ["DIABETIC_FRIENDLY", "LOW_CARB"]
  },
  MEDITERRANEAN: {
    name: "Mediterranean",
    description: "Heart-healthy diet rich in olive oil, fish, and vegetables",
    priority_nutrients: ["healthy fats", "omega-3", "fiber"],
    avoid_flags: [],
    prefer_flags: ["HEART_HEALTHY", "HIGH_FIBER"]
  },
  PLANT_BASED: {
    name: "Plant-Based",
    description: "Primarily plant-derived foods with minimal or no animal products",
    priority_nutrients: ["protein", "fiber", "vitamins"],
    avoid_flags: [],
    prefer_flags: ["VEGAN", "VEGETARIAN", "HIGH_FIBER"]
  },
  KETO: {
    name: "Ketogenic",
    description: "Very low carb, high fat diet for ketosis",
    priority_nutrients: ["healthy fats", "protein"],
    avoid_flags: [],
    prefer_flags: ["KETO_FRIENDLY", "LOW_CARB", "HIGH_PROTEIN"]
  },
  WEIGHT_MANAGEMENT: {
    name: "Weight Management",
    description: "Controlled portions with nutrient-dense, lower-calorie options",
    priority_nutrients: ["protein", "fiber"],
    avoid_flags: [],
    prefer_flags: ["LOW_FAT", "HIGH_FIBER", "HIGH_PROTEIN"]
  },
  ATHLETIC_PERFORMANCE: {
    name: "Athletic Performance",
    description: "Optimized nutrition for active individuals and athletes",
    priority_nutrients: ["protein", "complex carbs", "electrolytes"],
    avoid_flags: [],
    prefer_flags: ["HIGH_PROTEIN", "HIGH_FIBER"]
  },
  VEGETARIAN: {
    name: "Vegetarian",
    description: "Plant-based diet that may include dairy and eggs",
    priority_nutrients: ["protein", "iron", "B12"],
    avoid_flags: [],
    prefer_flags: ["VEGETARIAN", "HIGH_FIBER"]
  },
  VEGAN: {
    name: "Vegan",
    description: "Completely plant-based diet with no animal products",
    priority_nutrients: ["protein", "iron", "B12", "calcium"],
    avoid_flags: [],
    prefer_flags: ["VEGAN", "HIGH_FIBER"]
  },
  LOW_CARB: {
    name: "Low Carb",
    description: "Reduced carbohydrate intake for various health goals",
    priority_nutrients: ["protein", "healthy fats"],
    avoid_flags: [],
    prefer_flags: ["LOW_CARB", "HIGH_PROTEIN"]
  },
  HIGH_FIBER: {
    name: "High Fiber",
    description: "Emphasis on fiber-rich foods for digestive health",
    priority_nutrients: ["fiber", "vitamins"],
    avoid_flags: [],
    prefer_flags: ["HIGH_FIBER", "VEGETARIAN"]
  },
  HEART_HEALTHY: {
    name: "Heart Healthy",
    description: "Foods that support cardiovascular health",
    priority_nutrients: ["omega-3", "fiber", "antioxidants"],
    avoid_flags: [],
    prefer_flags: ["HEART_HEALTHY", "LOW_SODIUM"]
  }
};

// Helper functions for dietary analysis
export const getDietaryScore = (
  menuItem: DietaryInformation, 
  preferenceCategory: DietPreferenceCategory
): number => {
  const profile = dietPreferenceProfiles[preferenceCategory];
  let score = 0;
  
  // Add points for preferred flags
  profile.prefer_flags.forEach(flag => {
    if (menuItem.dietary_flags.includes(flag)) {
      score += 3;
    }
  });
  
  // Subtract points for avoid flags
  profile.avoid_flags.forEach(flag => {
    if (menuItem.dietary_flags.includes(flag)) {
      score -= 2;
    }
  });
  
  // Add points if item fits the diet preference
  if (menuItem.diet_preference_fit.includes(preferenceCategory)) {
    score += 5;
  }
  
  return Math.max(0, score);
};

export const getRecommendationsForDiet = (
  menuItems: DietaryInformation[],
  preferenceCategory: DietPreferenceCategory,
  maxRecommendations: number = 5
): DietaryInformation[] => {
  return menuItems
    .map(item => ({
      item,
      score: getDietaryScore(item, preferenceCategory)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRecommendations)
    .map(result => result.item);
};