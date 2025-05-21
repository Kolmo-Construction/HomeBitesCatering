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

// Hors d'oeuvres data for matrix selection
export const horsDoeurvesData = {
  categories: [
    {
      id: "tea_sandwiches",
      name: "Tea Sandwiches",
      description: "Offered in lots of 48",
      lotSizes: [36, 48, 96, 144],
      items: [
        { id: "pate_pickled_veg", name: "Pate with pickled veg", price: 1.95 },
        { id: "cream_cheese_shrimp", name: "Cream Cheese and Shrimp", price: 2.50 },
        { id: "blt", name: "BLT - (Bacon Lettuce & Tomato)", price: 1.95 },
        { id: "caprese", name: "Caprese (Mozzarella, Tomato, & Basil)", price: 1.95 },
        { id: "gravlax", name: "Gravlax, Cream Cheese & Cucumber", price: 2.75 },
        { id: "prosciutto_fig", name: "Prosciutto-Fig", price: 2.75 },
        { id: "crab_salad", name: "Crab Salad", price: 3.00 },
        { id: "chicken_cranberry", name: "Chicken Cranberry", price: 2.00 },
        { id: "miso_egg_salad", name: "Miso egg salad", price: 2.25 }
      ]
    },
    {
      id: "shooters",
      name: "Shooters",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 72, 96],
      items: [
        { id: "chicken_satay", name: "Chicken Satay", price: 2.45 },
        { id: "greek_village", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.25 },
        { id: "gazpacho_shrimp", name: "Gazpacho with shrimp", price: 2.75 },
        { id: "cucumber_jalapeno", name: "Chilled Cucumber/Jalapeno with shrimp", price: 2.75 },
        { id: "bloody_mary_lobster", name: "Bloody Mary with lobster (non-alcoholic)", price: 4.75 },
        { id: "roasted_beet", name: "Roasted beet Vichyssoise with green bean", price: 2.45 },
        { id: "chilled_peach", name: "Chilled peach soup with Gravlax", price: 2.75 },
        { id: "avocado_soup", name: "Chilled avocado soup with crab and pico", price: 3.75 }
      ]
    },
    {
      id: "mini_skewers",
      name: "Mini Skewers",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 72, 96],
      items: [
        { id: "korean_bbq", name: "Korean BBQ pork belly", price: 2.75 },
        { id: "tuscan_chicken", name: "Tuscan chicken", price: 2.45 },
        { id: "caprese_skewer", name: "Caprese skewer", price: 2.25 },
        { id: "sesame_beef", name: "Sesame beef with scallion", price: 2.75 },
        { id: "greek_chicken", name: "Greek chicken souvlaki with tzatziki", price: 2.45 },
        { id: "bourbon_bbq", name: "Bourbon BBQ chicken or pork", price: 2.45 },
        { id: "lemongrass_shrimp", name: "Lemongrass shrimp with spicy peanut sauce", price: 3.25 }
      ]
    },
    {
      id: "canapes",
      name: "Canapes",
      description: "Offered in lots of 48",
      lotSizes: [48, 96, 144],
      items: [
        { id: "watermelon_radish", name: "Watermelon radish chips with apple chutney", price: 2.75 },
        { id: "greek_village_canape", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.75 },
        { id: "pear_gorgonzola", name: "Pear with gorgonzola and honey", price: 2.50 },
        { id: "smoked_trout", name: "Smoked trout with chive cream cheese on crostini", price: 2.75 },
        { id: "roasted_squash", name: "Roasted squash with curried chickpeas", price: 2.45 },
        { id: "beef_tenderloin", name: "Beef tenderloin with basil pesto", price: 3.25 },
        { id: "duck_confit", name: "Duck confit with cherry jam on crostini", price: 3.75 }
      ]
    },
    {
      id: "bruschetta",
      name: "Bruschetta",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 72, 96],
      items: [
        { id: "classic_tomato", name: "Classic tomato, basil and garlic", price: 2.25 },
        { id: "white_bean", name: "White bean with rosemary", price: 2.25 },
        { id: "roasted_pepper", name: "Roasted pepper with goat cheese", price: 2.45 },
        { id: "wild_mushroom", name: "Wild mushroom with herbs", price: 2.75 },
        { id: "olive_tapenade", name: "Olive tapenade", price: 2.45 },
        { id: "pesto_ricotta", name: "Pesto ricotta", price: 2.25 }
      ]
    }
  ]
};