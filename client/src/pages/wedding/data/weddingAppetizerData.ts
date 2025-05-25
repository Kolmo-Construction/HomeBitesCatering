// src/pages/wedding/data/weddingAppetizerData.ts

// Define types for wedding appetizers (can be shared or specific)
export type WeddingAppetizerItem = {
  id: string;
  name: string;
  price: number; // Price per piece or per serving, clarify in description
  description?: string;
};

export type WeddingAppetizerCategory = {
  id: string;
  name: string;
  note?: string; // E.g., "Minimum order 2 dozen"
  items: WeddingAppetizerItem[];
  lotSizes?: number[]; // E.g., [24, 36, 48] pieces
  // For platter-style items like spreads
  servingSizes?: number[]; // E.g., [25, 50, 75] guests
  selectLimit?: number; // Max number of items to select from this category
  basePrice?: number; // Base price for platter, e.g., per person or fixed
  perPersonPricing?: boolean; // If basePrice is per person
};

export interface WeddingAppetizerData {
  categories: WeddingAppetizerCategory[];
}

// Example Wedding Appetizer Data
// IMPORTANT: Customize this data to match your actual wedding menu
export const weddingAppetizerData: WeddingAppetizerData = {
  categories: [
    {
      id: "elegant_bites",
      name: "Elegant Bites (Priced Per Piece)",
      note: "Minimum order of 2 dozen per item. Perfect for passed hors d'oeuvres.",
      items: [
        { id: "caprese_skewers", name: "Mini Caprese Skewers with Balsamic Glaze", price: 2.75, description: "Cherry tomato, fresh mozzarella, basil." },
        { id: "smoked_salmon_crostini", name: "Smoked Salmon & Dill Cream Cheese Crostini", price: 3.25, description: "Crisp crostini topped with premium smoked salmon." },
        { id: "prosciutto_melon", name: "Prosciutto-Wrapped Melon Bites", price: 3.00, description: "Sweet cantaloupe with savory prosciutto." },
        { id: "fig_brie_bites", name: "Fig & Brie Bites with Toasted Walnuts", price: 3.50, description: "Creamy brie and sweet fig jam on a cracker." },
        { id: "mini_quiches", name: "Assorted Mini Quiches (Lorraine, Spinach)", price: 3.00, description: "Bite-sized savory quiches." },
      ],
      lotSizes: [24, 36, 48, 72, 96] // Example lot sizes
    },
    {
      id: "wedding_shooters",
      name: "Gourmet Shooters (Priced Per Piece)",
      note: "Minimum order of 2 dozen per item. Served in elegant shooter glasses.",
      items: [
        { id: "shrimp_cocktail_shooter", name: "Classic Shrimp Cocktail Shooter", price: 3.75, description: "Chilled shrimp with zesty cocktail sauce." },
        { id: "gazpacho_shooter", name: "Chilled Gazpacho Shooter with Cucumber Garnish", price: 3.25, description: "Refreshing Spanish soup." },
        { id: "ceviche_shooter", name: "White Fish Ceviche Shooter with Avocado", price: 4.00, description: "Citrus-marinated fish." },
      ],
      lotSizes: [24, 36, 48]
    },
    {
      id: "wedding_spreads_dips",
      name: "Artisan Spreads & Dips Platter",
      note: "Select up to 3 options. Served with assorted crackers, pita, and vegetable crudités.",
      basePrice: 8.50, // Example price per person for the platter
      perPersonPricing: true,
      selectLimit: 3,
      items: [ // Items here are options for the platter, their individual 'price' might be 0 if covered by basePrice
        { id: "spinach_artichoke_dip", name: "Creamy Spinach & Artichoke Dip (Warm)", price: 0 },
        { id: "roasted_red_pepper_hummus", name: "Roasted Red Pepper Hummus", price: 0 },
        { id: "gourmet_cheese_ball", name: "Gourmet Cheese Ball with Nuts & Herbs", price: 0 },
        { id: "olive_tapenade", name: "Kalamata Olive Tapenade", price: 0 },
        { id: "whipped_feta_honey", name: "Whipped Feta with Honey & Pistachios", price: 0 },
      ],
      // servingSizes might not be needed if basePrice is per person and guestCount is known
    }
    // Add more wedding-specific categories as needed
  ],
};