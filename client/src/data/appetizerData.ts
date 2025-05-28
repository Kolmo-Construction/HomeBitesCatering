// Appetizer data types and structures
export type AppetizerItem = {
  id: string;
  name: string;
  price: number;
};

export type AppetizerCategory = {
  id: string;
  name: string;
  note?: string;
  description?: string;
  items: AppetizerItem[];
  lotSizes?: number[];
  servingSizes?: number[];
  selectLimit?: number;
  basePrice?: number;
  perPersonPricing?: boolean;
};

// Appetizer data for traditional appetizers
export const appetizerData = {
  categories: [
    {
      id: "tea_sandwiches",
      name: "Tea Sandwiches",
      note: "Offered in lots of 36",
      items: [
        { id: "cucumber", name: "Cucumber & Cream Cheese", price: 1.95 },
        { id: "egg_salad", name: "Egg Salad", price: 1.95 },
        { id: "turkey", name: "Turkey & Cheese", price: 1.95 },
        { id: "ham", name: "Ham & Cheese", price: 1.95 },
        { id: "chicken_salad", name: "Chicken Salad", price: 1.95 }
      ],
      lotSizes: [36, 48, 96, 144]
    },
    {
      id: "shooters",
      name: "Shooters",
      note: "Offered in lots of 24",
      items: [
        { id: "gazpacho", name: "Gazpacho", price: 2.50 },
        { id: "shrimp", name: "Shrimp Cocktail", price: 3.25 },
        { id: "ceviche", name: "Ceviche", price: 3.50 },
        { id: "bloody_mary", name: "Bloody Mary", price: 3.00 }
      ],
      lotSizes: [24, 48, 72, 96]
    },
    {
      id: "canapes",
      name: "Canapes",
      note: "Offered in lots of 24",
      items: [
        { id: "bruschetta", name: "Bruschetta", price: 2.25 },
        { id: "endive", name: "Endive with Blue Cheese & Walnuts", price: 2.50 },
        { id: "smoked_salmon", name: "Smoked Salmon on Crostini", price: 3.00 },
        { id: "prosciutto", name: "Prosciutto-Wrapped Melon", price: 2.75 }
      ],
      lotSizes: [24, 48, 72, 96]
    },
    {
      id: "spreads",
      name: "Spreads Platter",
      note: "Select 3 spreads",
      items: [
        { id: "hummus", name: "Classic Hummus", price: 0 },
        { id: "baba_ganoush", name: "Baba Ganoush", price: 0 },
        { id: "tzatziki", name: "Tzatziki", price: 0 },
        { id: "spinach_dip", name: "Spinach & Artichoke Dip", price: 0 },
        { id: "olive_tapenade", name: "Olive Tapenade", price: 0 },
        { id: "guacamole", name: "Guacamole", price: 0 }
      ],
      servingSizes: [24, 36, 48, 60],
      selectLimit: 3,
      basePrice: 4.50 // per person
    }
  ]
};

// Moved hors d'oeuvres data to separate file: horsDoeurvesInfo.ts