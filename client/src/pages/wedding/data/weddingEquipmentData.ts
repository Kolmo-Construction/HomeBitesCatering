// src/pages/wedding/data/weddingEquipmentData.ts

// Import types from weddingFormTypes.ts if they are defined there,
// or define them here if they are specific to equipment and not already in weddingFormTypes.
// For this example, we'll assume these types are suitable and might be similar
// to what you'd have in weddingFormTypes or a shared types file.

export interface WeddingEquipmentItem {
  id: string;
  name: string;
  price: number;
  unit?: string;
  description?: string; // Added for more detail
  imageUrl?: string;
}

export interface WeddingEquipmentCategory {
  id: string; // This ID will be used to match with keys in WeddingInquiryFormData.equipment
  name: string;
  description?: string;
  items: WeddingEquipmentItem[];
}

// Data copied and presented from output/client/src/data/equipmentData.ts
// No modifications made to the offerings themselves as per your request.
// The 'id' of categories like "linens", "servingWare", "furniture"
// will be used to map to the WeddingInquiryFormData.equipment structure.
export const weddingEquipmentCategories: WeddingEquipmentCategory[] = [
  {
    id: "linens", // This ID should match a key in WeddingInquiryFormData.equipment
    name: "Linens",
    items: [
      { id: "table_cloths_standard", name: "Table Cloths - Standard", price: 12.50, unit: "each" },
      { id: "table_cloths_premium", name: "Table Cloths - Premium", price: 18.00, unit: "each" },
      { id: "napkins_cloth", name: "Napkins - Cloth", price: 1.50, unit: "each" },
      { id: "table_runners", name: "Table Runners", price: 6.00, unit: "each" },
      { id: "chair_covers", name: "Chair Covers", price: 4.50, unit: "each" },
      { id: "chair_sashes", name: "Chair Sashes", price: 2.00, unit: "each" }
    ]
  },
  {
    id: "servingWare", // This ID should match a key in WeddingInquiryFormData.equipment
    name: "Serving Ware",
    items: [
      { id: "plates_dinner", name: "Plates - Dinner", price: 1.25, unit: "each" },
      { id: "plates_salad", name: "Plates - Salad/Dessert", price: 1.00, unit: "each" },
      { id: "flatware_sets", name: "Flatware Sets (Fork, Knife, Spoon)", price: 1.50, unit: "set" },
      { id: "water_glasses", name: "Water Glasses", price: 0.75, unit: "each" },
      { id: "wine_glasses", name: "Wine Glasses", price: 0.85, unit: "each" },
      { id: "champagne_flutes", name: "Champagne Flutes", price: 0.85, unit: "each" },
      { id: "coffee_cups_saucers", name: "Coffee Cups & Saucers", price: 1.25, unit: "set" },
      { id: "serving_trays", name: "Serving Trays", price: 8.00, unit: "each" },
      { id: "chafing_dishes", name: "Chafing Dishes with Fuel", price: 15.00, unit: "each" },
      { id: "serving_utensils", name: "Serving Utensils", price: 2.50, unit: "each" }
    ]
  },
  {
    id: "furniture", // This ID should match a key in WeddingInquiryFormData.equipment
    name: "Furniture", // This category will hold tables, chairs, etc.
    items: [
      // Items originally under "furniture" in output/client/src/data/equipmentData.ts
      { id: "tables_round_60", name: "Tables - Round (60\")", price: 10.00, unit: "each" },
      { id: "tables_round_72", name: "Tables - Round (72\")", price: 12.00, unit: "each" },
      { id: "tables_rectangular_6ft", name: "Tables - Rectangular (6ft)", price: 11.00, unit: "each" },
      { id: "tables_rectangular_8ft", name: "Tables - Rectangular (8ft)", price: 13.00, unit: "each" },
      { id: "tables_cocktail", name: "Tables - Cocktail", price: 9.00, unit: "each" },
      { id: "chairs_folding", name: "Chairs - Folding", price: 3.50, unit: "each" },
      { id: "chairs_chiavari", name: "Chairs - Chiavari", price: 8.00, unit: "each" },
      { id: "podium", name: "Podium", price: 45.00, unit: "each" },
      { id: "coat_rack", name: "Coat Rack with Hangers", price: 25.00, unit: "each" }
    ]
  },
  {
    id: "decor", // This ID will need a corresponding key in WeddingInquiryFormData.equipment if you store its items separately
    name: "Decor",
    items: [
      // Items originally under "decor" in output/client/src/data/equipmentData.ts
      { id: "candle_holders", name: "Candle Holders", price: 3.00, unit: "each" },
      { id: "vases", name: "Vases (Various Sizes)", price: 5.00, unit: "each" },
      { id: "table_numbers", name: "Table Numbers/Holders", price: 2.50, unit: "set" },
      { id: "easels", name: "Easels", price: 15.00, unit: "each" },
      { id: "backdrop_stand", name: "Backdrop Stand", price: 75.00, unit: "each" }
    ]
  }
];

// Helper functions (from original file, kept for potential utility)
export const getWeddingEquipmentByCategory = (categoryId: string): WeddingEquipmentItem[] => {
  const category = weddingEquipmentCategories.find(cat => cat.id === categoryId);
  return category ? category.items : [];
};

export const getAllWeddingEquipmentItems = (): WeddingEquipmentItem[] => {
  return weddingEquipmentCategories.flatMap(category => category.items);
};

export const getWeddingEquipmentItemById = (itemId: string): WeddingEquipmentItem | undefined => {
  return getAllWeddingEquipmentItems().find(item => item.id === itemId);
};