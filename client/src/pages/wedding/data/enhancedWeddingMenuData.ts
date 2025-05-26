// enhancedWeddingMenuData.ts - Wedding menu items with comprehensive dietary information

import { DietaryInformation, DietaryFlag, AllergenAlert, DietaryModification, DietPreferenceCategory } from './dietaryInformation';

// Enhanced dietary information for Italian Wedding Menu items
export const italianWeddingMenuDietaryData: Record<string, DietaryInformation> = {
  // Main Courses
  "chicken_saltimbocca_w": {
    item_name: "Chicken Saltimbocca with Prosciutto & Sage",
    origin: "Italy",
    nutritional_info: {
      calories_range_kcal: "320-380 per serving",
      carbs_g_range: "3-5",
      protein_g_range: "35-42",
      fat_g_range: "18-24",
      fiber_g_range: "0-1",
      sodium_mg_range: "680-850"
    },
    primary_ingredients: ["chicken breast", "prosciutto", "sage", "white wine", "butter", "olive oil"],
    dietary_flags: ["HIGH_PROTEIN", "LOW_CARB", "GLUTEN_FREE"],
    allergen_alert: ["CONTAINS_DAIRY"],
    key_preparation_notes: "Pan-seared chicken breast wrapped with prosciutto and fresh sage, finished with white wine sauce",
    modifiable_for_diet: ["DAIRY_FREE_OPTION", "LOW_SODIUM_OPTION"],
    guidance_for_customer: "Excellent high-protein option with traditional Italian flavors. Rich in protein and low in carbs, perfect for keto and low-carb diets. Can be made dairy-free upon request.",
    diet_preference_fit: ["HIGH_PROTEIN", "LOW_CARB", "KETO", "BALANCED"],
    health_benefits: ["High protein for muscle maintenance", "Rich in B vitamins", "Good source of selenium"],
    chef_recommendations: "Pairs beautifully with roasted vegetables or a light salad"
  },

  "beef_braciole_w": {
    item_name: "Slow-Cooked Beef Braciole in Rich Tomato Sauce",
    origin: "Italy (Southern)",
    nutritional_info: {
      calories_range_kcal: "420-480 per serving",
      carbs_g_range: "8-12",
      protein_g_range: "38-45",
      fat_g_range: "24-30",
      fiber_g_range: "2-3",
      sodium_mg_range: "720-900"
    },
    primary_ingredients: ["beef flank steak", "breadcrumbs", "parmesan", "parsley", "garlic", "tomato sauce", "red wine"],
    dietary_flags: ["HIGH_PROTEIN", "HEART_HEALTHY"],
    allergen_alert: ["CONTAINS_GLUTEN", "CONTAINS_DAIRY"],
    key_preparation_notes: "Thin beef rolls stuffed with herb breadcrumb filling, slow-braised in rich tomato sauce",
    modifiable_for_diet: ["GLUTEN_FREE_OPTION", "DAIRY_FREE_OPTION"],
    guidance_for_customer: "Classic comfort food with robust flavors. High in protein and iron. Gluten-free breadcrumbs available upon request.",
    diet_preference_fit: ["HIGH_PROTEIN", "MEDITERRANEAN", "BALANCED"],
    health_benefits: ["Excellent source of iron", "High in protein", "Rich in lycopene from tomatoes"],
    chef_recommendations: "Traditional Sunday dinner favorite, best served with polenta or pasta"
  },

  "vegetarian_lasagna_w": {
    item_name: "Layered Vegetarian Lasagna with Fresh Béchamel",
    origin: "Italy",
    nutritional_info: {
      calories_range_kcal: "380-450 per serving",
      carbs_g_range: "35-42",
      protein_g_range: "18-24",
      fat_g_range: "20-26",
      fiber_g_range: "6-8",
      sodium_mg_range: "650-800"
    },
    primary_ingredients: ["pasta sheets", "ricotta", "mozzarella", "spinach", "zucchini", "mushrooms", "béchamel sauce", "herbs"],
    dietary_flags: ["VEGETARIAN", "HIGH_FIBER"],
    allergen_alert: ["CONTAINS_GLUTEN", "CONTAINS_DAIRY", "CONTAINS_EGGS"],
    key_preparation_notes: "Layers of fresh pasta with seasonal vegetables, three cheeses, and house-made béchamel",
    modifiable_for_diet: ["VEGAN_OPTION", "GLUTEN_FREE_OPTION"],
    guidance_for_customer: "Hearty vegetarian option packed with vegetables and protein from cheese. High in fiber and satisfying. Vegan version available with cashew-based cheese.",
    diet_preference_fit: ["VEGETARIAN", "MEDITERRANEAN", "BALANCED", "CARB_HEAVY"],
    health_benefits: ["High in calcium", "Good source of vitamins A and K", "Plant-based protein"],
    chef_recommendations: "Our most popular vegetarian dish, loved by both vegetarians and meat-eaters"
  },

  "salmon_lemon_dill_w": {
    item_name: "Pan-Seared Salmon with Delicate Lemon-Dill Sauce",
    origin: "Mediterranean-inspired",
    nutritional_info: {
      calories_range_kcal: "340-420 per serving",
      carbs_g_range: "2-4",
      protein_g_range: "32-38",
      fat_g_range: "22-28",
      fiber_g_range: "0-1",
      sodium_mg_range: "420-580"
    },
    primary_ingredients: ["salmon fillet", "lemon", "fresh dill", "white wine", "olive oil", "shallots"],
    dietary_flags: ["HIGH_PROTEIN", "LOW_CARB", "HEART_HEALTHY", "GLUTEN_FREE", "DAIRY_FREE"],
    allergen_alert: ["CONTAINS_FISH"],
    key_preparation_notes: "Fresh salmon fillet pan-seared to perfection with aromatic lemon-dill sauce",
    modifiable_for_diet: ["LOW_SODIUM_OPTION", "SAUCE_ON_SIDE"],
    guidance_for_customer: "Heart-healthy omega-3 rich salmon. Perfect for low-carb, keto, and Mediterranean diets. Naturally gluten and dairy-free.",
    diet_preference_fit: ["HIGH_PROTEIN", "LOW_CARB", "KETO", "MEDITERRANEAN", "HEART_HEALTHY", "WEIGHT_MANAGEMENT"],
    health_benefits: ["Rich in omega-3 fatty acids", "Excellent source of vitamin D", "Anti-inflammatory properties"],
    chef_recommendations: "Sustainably sourced Atlantic salmon, pairs beautifully with roasted asparagus"
  },

  // Pasta Dishes
  "penne_arrabbiata_w": {
    item_name: "Penne Arrabbiata with Spicy Tomato Sauce",
    origin: "Italy (Lazio)",
    nutritional_info: {
      calories_range_kcal: "320-380 per serving",
      carbs_g_range: "55-65",
      protein_g_range: "12-16",
      fat_g_range: "8-12",
      fiber_g_range: "4-6",
      sodium_mg_range: "480-650"
    },
    primary_ingredients: ["penne pasta", "tomatoes", "garlic", "red chili flakes", "olive oil", "parsley"],
    dietary_flags: ["VEGAN", "DAIRY_FREE", "HIGH_FIBER"],
    allergen_alert: ["CONTAINS_GLUTEN"],
    key_preparation_notes: "Al dente penne pasta tossed in spicy tomato sauce with garlic and red chilies",
    modifiable_for_diet: ["GLUTEN_FREE_OPTION", "LOW_SODIUM_OPTION"],
    guidance_for_customer: "Classic spicy Italian pasta that's naturally vegan. High in complex carbs and fiber. Perfect for those who enjoy bold flavors.",
    diet_preference_fit: ["VEGAN", "PLANT_BASED", "CARB_HEAVY", "MEDITERRANEAN"],
    health_benefits: ["Rich in lycopene", "Good source of complex carbohydrates", "Anti-inflammatory spices"],
    chef_recommendations: "Heat level can be adjusted - just let us know your spice preference"
  },

  "fettuccine_alfredo_w": {
    item_name: "Classic Fettuccine Alfredo with Parmigiano-Reggiano",
    origin: "Italy (Rome)",
    nutritional_info: {
      calories_range_kcal: "480-580 per serving",
      carbs_g_range: "48-58",
      protein_g_range: "18-24",
      fat_g_range: "26-34",
      fiber_g_range: "2-3",
      sodium_mg_range: "680-850"
    },
    primary_ingredients: ["fettuccine pasta", "butter", "parmigiano-reggiano", "heavy cream", "black pepper"],
    dietary_flags: ["VEGETARIAN", "HIGH_PROTEIN"],
    allergen_alert: ["CONTAINS_GLUTEN", "CONTAINS_DAIRY"],
    key_preparation_notes: "Fresh fettuccine tossed with authentic butter and cheese emulsion",
    modifiable_for_diet: ["GLUTEN_FREE_OPTION", "DAIRY_FREE_OPTION"],
    guidance_for_customer: "Rich and creamy classic comfort food. High in calcium and protein. Dairy-free version available with cashew cream sauce.",
    diet_preference_fit: ["VEGETARIAN", "CARB_HEAVY", "BALANCED"],
    health_benefits: ["High in calcium", "Good source of protein", "Provides sustained energy"],
    chef_recommendations: "Made fresh to order - the traditional Roman way with just butter and cheese"
  },

  // Salads
  "caprese_salad_w": {
    item_name: "Classic Caprese Salad with Buffalo Mozzarella",
    origin: "Italy (Campania)",
    nutritional_info: {
      calories_range_kcal: "280-340 per serving",
      carbs_g_range: "8-12",
      protein_g_range: "16-20",
      fat_g_range: "22-28",
      fiber_g_range: "2-3",
      sodium_mg_range: "420-580"
    },
    primary_ingredients: ["buffalo mozzarella", "heirloom tomatoes", "fresh basil", "extra virgin olive oil", "balsamic glaze"],
    dietary_flags: ["VEGETARIAN", "GLUTEN_FREE", "LOW_CARB", "KETO_FRIENDLY"],
    allergen_alert: ["CONTAINS_DAIRY"],
    key_preparation_notes: "Fresh buffalo mozzarella with ripe tomatoes, basil, and aged balsamic",
    modifiable_for_diet: ["VEGAN_OPTION", "DAIRY_FREE_OPTION"],
    guidance_for_customer: "Light, fresh, and naturally gluten-free. Perfect for keto and low-carb diets. Vegan version available with cashew mozzarella.",
    diet_preference_fit: ["VEGETARIAN", "LOW_CARB", "KETO", "MEDITERRANEAN", "WEIGHT_MANAGEMENT"],
    health_benefits: ["High in calcium", "Rich in lycopene", "Heart-healthy fats from olive oil"],
    chef_recommendations: "Best when tomatoes are at peak ripeness - we source locally when possible"
  },

  "caesar_salad_w": {
    item_name: "Traditional Caesar Salad with House-Made Croutons",
    origin: "Mexican-Italian fusion",
    nutritional_info: {
      calories_range_kcal: "320-420 per serving",
      carbs_g_range: "12-18",
      protein_g_range: "8-12",
      fat_g_range: "26-34",
      fiber_g_range: "3-4",
      sodium_mg_range: "580-750"
    },
    primary_ingredients: ["romaine lettuce", "parmesan", "croutons", "anchovy", "garlic", "lemon", "olive oil", "egg"],
    dietary_flags: ["VEGETARIAN"],
    allergen_alert: ["CONTAINS_GLUTEN", "CONTAINS_DAIRY", "CONTAINS_EGGS", "CONTAINS_FISH"],
    key_preparation_notes: "Crisp romaine with traditional Caesar dressing and fresh parmesan",
    modifiable_for_diet: ["GLUTEN_FREE_OPTION", "VEGAN_OPTION", "DAIRY_FREE_OPTION"],
    guidance_for_customer: "Classic salad with rich, savory flavors. Can be made gluten-free with alternative croutons and vegan with plant-based dressing.",
    diet_preference_fit: ["VEGETARIAN", "LOW_CARB", "KETO"],
    health_benefits: ["Good source of vitamin K", "Provides healthy fats", "High in folate"],
    chef_recommendations: "Our dressing is made fresh daily with authentic ingredients including anchovies"
  }
};

// Appetizers dietary data
export const appetizerDietaryData: Record<string, DietaryInformation> = {
  "crispy_falafel": {
    item_name: "Crispy Falafel",
    origin: "Middle East",
    nutritional_info: {
      calories_range_kcal: "150-200 (3-4 pieces)",
      carbs_g_range: "15-20",
      protein_g_range: "5-7",
      fat_g_range: "8-12",
      fiber_g_range: "4-6",
      sodium_mg_range: "280-350"
    },
    primary_ingredients: ["chickpeas", "parsley", "coriander", "onion", "garlic", "spices"],
    dietary_flags: ["VEGAN", "VEGETARIAN", "DAIRY_FREE", "EGG_FREE", "HIGH_FIBER"],
    allergen_alert: ["MAY_CONTAIN_GLUTEN", "MAY_CONTAIN_SESAME"],
    key_preparation_notes: "Deep-fried ground chickpea patties with fresh herbs and spices",
    modifiable_for_diet: ["GLUTEN_FREE_OPTION"],
    guidance_for_customer: "Popular vegan street food. Good source of plant protein and fiber. Confirm gluten status if needed. Typically served with tahini (sesame).",
    diet_preference_fit: ["VEGAN", "PLANT_BASED", "VEGETARIAN", "MEDITERRANEAN", "HIGH_FIBER"],
    health_benefits: ["Plant-based protein", "High in fiber", "Rich in folate and iron"],
    chef_recommendations: "Served with house-made tahini sauce and fresh vegetables"
  },

  "bruschetta_trio": {
    item_name: "Bruschetta Trio with Seasonal Toppings",
    origin: "Italy",
    nutritional_info: {
      calories_range_kcal: "180-250 per serving (3 pieces)",
      carbs_g_range: "22-28",
      protein_g_range: "6-9",
      fat_g_range: "8-12",
      fiber_g_range: "3-4",
      sodium_mg_range: "380-480"
    },
    primary_ingredients: ["artisan bread", "tomatoes", "basil", "garlic", "olive oil", "seasonal vegetables"],
    dietary_flags: ["VEGETARIAN", "DAIRY_FREE"],
    allergen_alert: ["CONTAINS_GLUTEN"],
    key_preparation_notes: "Grilled artisan bread topped with fresh seasonal ingredients",
    modifiable_for_diet: ["VEGAN_OPTION", "GLUTEN_FREE_OPTION"],
    guidance_for_customer: "Light, fresh appetizer with Mediterranean flavors. Naturally dairy-free, can be made vegan and gluten-free upon request.",
    diet_preference_fit: ["VEGETARIAN", "MEDITERRANEAN", "PLANT_BASED"],
    health_benefits: ["Rich in lycopene", "Good source of antioxidants", "Heart-healthy olive oil"],
    chef_recommendations: "Toppings change seasonally for peak freshness and flavor"
  }
};

// Helper function to get dietary info for a menu item
export const getDietaryInfoForItem = (itemId: string): DietaryInformation | null => {
  return italianWeddingMenuDietaryData[itemId] || appetizerDietaryData[itemId] || null;
};

// Function to filter menu items by dietary preferences
export const filterItemsByDietaryPreference = (
  itemIds: string[],
  dietPreference: DietPreferenceCategory
): string[] => {
  return itemIds.filter(id => {
    const dietaryInfo = getDietaryInfoForItem(id);
    return dietaryInfo?.diet_preference_fit.includes(dietPreference);
  });
};

// Function to get nutritional summary for selected items
export const getNutritionalSummary = (itemIds: string[]) => {
  const items = itemIds.map(id => getDietaryInfoForItem(id)).filter(Boolean) as DietaryInformation[];
  
  return {
    totalItems: items.length,
    dietaryFlags: Array.from(new Set(items.flatMap(item => item.dietary_flags))),
    allergens: Array.from(new Set(items.flatMap(item => item.allergen_alert))),
    commonDietFits: items.reduce((acc, item) => {
      item.diet_preference_fit.forEach(diet => {
        acc[diet] = (acc[diet] || 0) + 1;
      });
      return acc;
    }, {} as Record<DietPreferenceCategory, number>)
  };
};