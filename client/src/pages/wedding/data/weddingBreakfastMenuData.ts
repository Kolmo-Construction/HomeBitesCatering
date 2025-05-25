// src/pages/wedding/data/weddingBreakfastMenuData.ts

export type BreakfastMenuType =
  | "grab_and_go"
  | "continental"
  | "american_breakfast"
  | "full_monty_plated_brunch";

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  upcharge?: number; // Optional upcharge for specific items
}

export interface GrabAndGoItem extends MenuItem {
  price: number; // Price per item is specific to GrabAndGoItem
}

export interface ServiceStyle {
  id: string;
  name: string;
  upcharge: number; // Upcharge for selecting this service style, could be 0
}

export interface MenuCategory {
  items: MenuItem[] | GrabAndGoItem[]; // Array of items in this category
  limit?: number; // Optional limit on how many items can be selected
  description?: string; // Optional description for the category
}

export interface BreakfastMenuTypeDetails {
  name: string;
  description: string;
  basePricePerPerson: number; // Crucial: Ensure this is a number for all menu types
  serviceStyles?: ServiceStyle[]; // Optional service styles for this menu type
  categories: {
    // Grab & Go specific categories
    grab_and_go_bites?: { items: GrabAndGoItem[] };
    grab_and_go_snacks?: { items: GrabAndGoItem[] };
    grab_and_go_beverages?: { items: GrabAndGoItem[] };

    // Continental specific categories
    staples?: MenuCategory; // e.g., pastries, fruit

    // American Breakfast specific categories
    eggs?: MenuCategory;
    meats?: MenuCategory;
    potatoes?: MenuCategory;
    breads?: MenuCategory;

    // Full Monty Plated Brunch specific categories
    sweet_selections?: MenuCategory;
    savory_selections?: MenuCategory;
    sides_selections?: MenuCategory;

    // Shared categories (can be used by multiple menu types if applicable)
    beverages?: MenuCategory; // e.g., coffee, tea, juice for relevant packages
    // Add other shared or specific categories as needed
  };
}

export interface BreakfastMenuData {
  menuTypes: Record<BreakfastMenuType, BreakfastMenuTypeDetails>;
}

// Wedding-specific breakfast menu data
export const weddingBreakfastMenuData: BreakfastMenuData = {
  menuTypes: {
    grab_and_go: {
      name: "Grab & Go Breakfast",
      description: "Quick and convenient individually packaged items. Prices are per item selected.",
      basePricePerPerson: 0, // Base price is 0 as costs are per item.
      categories: {
        grab_and_go_bites: {
          items: [
            { id: "gg_yogurt_parfait", name: "Yogurt Parfait with Granola & Berries", price: 5.50, description: "Creamy yogurt, crunchy granola, fresh berries." },
            { id: "gg_fruit_cup_large", name: "Large Fresh Fruit Cup", price: 6.00, description: "Assortment of seasonal cut fruits." },
            { id: "gg_overnight_oats", name: "Overnight Oats (Chia & Almond Milk)", price: 5.75, description: "Healthy and delicious." },
            // Add more bite items
          ],
        },
        grab_and_go_snacks: {
          items: [
            { id: "gg_artisan_granola_bar", name: "Artisan Granola Bar", price: 3.50, description: "House-made with nuts and dried fruits." },
            { id: "gg_muffin_assorted", name: "Assorted Muffins (Blueberry, Banana Nut)", price: 3.00, description: "Freshly baked." },
            // Add more snack items
          ],
        },
        grab_and_go_beverages: {
          items: [
            { id: "gg_oj_fresh", name: "Freshly Squeezed Orange Juice (12oz)", price: 4.00 },
            { id: "gg_apple_juice", name: "Apple Juice (bottled, 10oz)", price: 3.00 },
            { id: "gg_bottled_water", name: "Bottled Spring Water", price: 2.00 },
            // Add more beverage items
          ],
        },
      },
    },
    continental: {
      name: "Continental Breakfast",
      description: "A light and classic assortment of breakfast staples. Select your preferred items.",
      basePricePerPerson: 22.50, // Ensure this is a valid number
      serviceStyles: [
        { id: "buffet_self_serve", name: "Self-Serve Buffet", upcharge: 0 },
        { id: "attended_buffet", name: "Attended Buffet Station", upcharge: 5.00 },
      ],
      categories: {
        staples: {
          items: [
            { id: "cont_assorted_pastries", name: "Assorted Mini Pastries (Croissants, Danishes)" },
            { id: "cont_bagels_cream_cheese", name: "Mini Bagels with Cream Cheese & Jams" },
            { id: "cont_seasonal_fruit_platter", name: "Seasonal Sliced Fruit Platter" },
            { id: "cont_hard_boiled_eggs", name: "Hard Boiled Eggs" },
            // Add more staple items
          ],
          limit: 3, // Example: client selects 3 from the list
          description: "Choose any 3 staple items.",
        },
        beverages: {
          items: [
            { id: "coffee_station", name: "Premium Coffee Station (Regular, Decaf, Accoutrements)" },
            { id: "tea_assortment_hot", name: "Assorted Hot Teas with Lemon & Honey" },
            { id: "oj_pitchers", name: "Orange Juice (Pitchers)" },
            // Add more beverage items
          ],
          limit: 2, // Example: client selects 2
          description: "Includes 2 beverage options.",
        },
      },
    },
    american_breakfast: {
      name: "American Breakfast Buffet",
      description: "A hearty, traditional American breakfast buffet experience.",
      basePricePerPerson: 32.75, // Ensure this is a valid number
      serviceStyles: [
        { id: "buffet_self_serve", name: "Self-Serve Buffet", upcharge: 0 },
        { id: "family_style_table", name: "Family Style at Table", upcharge: 7.00 },
      ],
      categories: {
        eggs: {
          items: [
            { id: "scrambled_eggs_classic", name: "Fluffy Scrambled Eggs" },
            { id: "scrambled_eggs_cheddar", name: "Scrambled Eggs with Cheddar", upcharge: 1.50 },
            { id: "mini_quiches_lorraine", name: "Mini Quiches Lorraine", upcharge: 2.50 },
          ],
          description: "Select one egg preparation.",
        },
        meats: {
          items: [
            { id: "crispy_bacon_applewood", name: "Applewood Smoked Bacon" },
            { id: "sausage_links_pork", name: "Pork Sausage Links" },
            { id: "turkey_sausage_patties", name: "Turkey Sausage Patties" },
            { id: "candied_bacon_spicy", name: "Spicy Candied Bacon", upcharge: 2.00 },
          ],
          limit: 2,
          description: "Choose any 2 meat selections.",
        },
        potatoes: {
          items: [
            { id: "home_fries_peppers_onions", name: "Breakfast Potatoes with Peppers & Onions" },
            { id: "hashbrown_casserole_cheesy", name: "Cheesy Hashbrown Casserole", upcharge: 1.75 },
          ],
          description: "Select one potato option."
        },
        breads: {
          items: [
            { id: "toast_assorted_butter_jam", name: "Assorted Toast with Butter & Jam" },
            { id: "mini_biscuits_gravy", name: "Mini Biscuits with Sausage Gravy", upcharge: 2.25 },
          ],
          description: "Select one bread option."
        },
        beverages: {
          items: [
            { id: "coffee_station", name: "Premium Coffee Station" },
            { id: "oj_pitchers", name: "Orange Juice (Pitchers)" },
            { id: "cranberry_juice", name: "Cranberry Juice" },
          ],
          limit: 2,
          description: "Includes 2 beverage options."
        },
      },
    },
    full_monty_plated_brunch: {
      name: "The Full Monty Plated Brunch",
      description: "An elegant multi-course plated brunch, perfect for sophisticated daytime weddings.",
      basePricePerPerson: 55.00, // Ensure this is a valid number
      serviceStyles: [
        { id: "plated_synchronized", name: "Synchronized Plated Service", upcharge: 0 },
      ],
      categories: {
        sweet_selections: {
          items: [
            { id: "fm_french_toast_brioche", name: "Brioche French Toast with Berry Compote & Maple Syrup" },
            { id: "fm_lemon_ricotta_pancakes", name: "Lemon Ricotta Pancakes with Blueberry Syrup", upcharge: 3.00 },
          ],
          limit: 1,
          description: "Choose one sweet main.",
        },
        savory_selections: {
          items: [
            { id: "fm_eggs_benedict_classic", name: "Classic Eggs Benedict with Hollandaise" },
            { id: "fm_smoked_salmon_frittata", name: "Smoked Salmon & Dill Frittata", upcharge: 4.00 },
            { id: "fm_short_rib_hash_poached_egg", name: "Braised Short Rib Hash with Poached Egg", upcharge: 6.00 },
          ],
          limit: 1,
          description: "Choose one savory main.",
        },
        sides_selections: {
          items: [
            { id: "fm_gourmet_fruit_platter", name: "Gourmet Fruit Platter with Local Honey" },
            { id: "fm_asparagus_prosciutto", name: "Grilled Asparagus with Prosciutto" },
            { id: "fm_artisan_cheese_board_mini", name: "Mini Artisan Cheese & Charcuterie Board" , upcharge: 5.00},
          ],
          limit: 2,
          description: "Choose two sides to accompany the mains.",
        },
        beverages: {
          items: [
            { id: "coffee_premium_table_service", name: "Premium Coffee Table Service" },
            { id: "mimosa_champagne_service", name: "Mimosa & Champagne Service (client provides alcohol, we serve)", upcharge: 8.00 },
            { id: "fresh_juice_bar", name: "Fresh Juice Bar (Orange, Grapefruit, Cranberry)", upcharge: 6.00},
          ],
          limit: 1, // Can be adjusted based on package
          description: "Select primary beverage service."
        },
      },
    },
  },
};