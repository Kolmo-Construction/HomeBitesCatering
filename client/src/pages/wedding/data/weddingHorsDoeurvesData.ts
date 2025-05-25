// src/pages/wedding/data/weddingHorsDoeurvesData.ts

export type LotSize = 24 | 36 | 48 | 60 | 72 | 96 | 144;

export interface HorsDoeuvresItem {
  id: string;
  name: string;
  description?: string;
  pricePerPiece: number;
  availableLotSizes: LotSize[];
  notes?: string; // For things like "($X.XX pp)" if needed for display alongside pricePerPiece
}

export interface SpreadItem {
  id: string;
  name: string;
}

export interface HorsDoeuvresCategory {
  id: string;
  name: string;
  description?: string;
  defaultLotOfferingNote?: string;
  items: HorsDoeuvresItem[];
}

export interface SpreadsCategoryData {
  id: "spreads"; // Fixed ID for easy access
  name: string;
  description: string;
  pricePerPerson: number;
  selectionLimit: number;
  items: SpreadItem[];
}

export interface WeddingHorsDoeurvesDataStructure {
  categories: Record<string, HorsDoeuvresCategory>;
  spreadsPackage?: SpreadsCategoryData; // Optional in case it's not always offered
}

export const weddingHorsDoeuvresData: WeddingHorsDoeurvesDataStructure = {
  categories: {
    tea_sandwiches: {
      id: "tea_sandwiches",
      name: "Tea Sandwiches",
      defaultLotOfferingNote: "Offered in lots of 48 (select desired lot for each item)",
      items: [
        { id: "ts_pate_veg", name: "Pate with pickled veg", pricePerPiece: 1.95, availableLotSizes: [36, 48, 96, 144] },
        { id: "ts_creamcheese_shrimp", name: "Cream Cheese and Shrimp", pricePerPiece: 2.50, availableLotSizes: [36, 48, 96, 144] },
        { id: "ts_blt", name: "BLT - (Bacon Lettuce & Tomato)", pricePerPiece: 1.95, availableLotSizes: [36, 48, 96, 144] },
        { id: "ts_caprese", name: "Caprese (Mozzarella, Tomato, & Basil)", pricePerPiece: 1.95, availableLotSizes: [36, 48, 96, 144] },
        { id: "ts_gravlax_cc_cucumber", name: "Gravlax, Cream Cheese & Cucumber", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "ts_prosciutto_fig", name: "Prosciutto-Fig", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "ts_crab_salad", name: "Crab Salad", pricePerPiece: 3.00, availableLotSizes: [36, 48, 96, 144] },
        { id: "ts_chicken_cranberry", name: "Chicken Cranberry", pricePerPiece: 2.00, availableLotSizes: [36, 48, 96, 144] },
        { id: "ts_miso_egg_salad", name: "Miso egg salad", pricePerPiece: 2.25, availableLotSizes: [36, 48, 96, 144] },
      ],
    },
    shooters: {
      id: "shooters",
      name: "Shooters",
      defaultLotOfferingNote: "Offered in lots of 24 (select desired lot for each item)",
      items: [
        { id: "sh_chicken_satay", name: "Chicken Satay", pricePerPiece: 2.45, availableLotSizes: [36, 48, 72, 96] },
        { id: "sh_greek_village", name: "Greek Village - Tomato, feta, cucumber and olive", pricePerPiece: 2.25, availableLotSizes: [36, 48, 72, 96] },
        { id: "sh_gazpacho_shrimp", name: "Gazpacho with shrimp", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] },
        { id: "sh_cucumber_jalapeno_shrimp", name: "Chilled Cucumber/Jalapeno with shrimp", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] },
        { id: "sh_bloody_mary_lobster", name: "Bloody Mary with lobster (non-alchoholic)", pricePerPiece: 4.75, availableLotSizes: [36, 48, 72, 96] },
        { id: "sh_roasted_beet_vichyssoise", name: "Roasted beet Vichyssoise with green bean", pricePerPiece: 2.45, availableLotSizes: [36, 48, 72, 96] },
        { id: "sh_chilled_peach_soup_gravlax", name: "Chilled peach soup with Gravlax", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] },
        { id: "sh_chilled_avocado_soup_crab", name: "Chilled avocado soup with crab and pico", pricePerPiece: 3.75, availableLotSizes: [36, 48, 72, 96] },
      ],
    },
    mini_skewers: {
      id: "mini_skewers",
      name: "Mini Skewers",
      defaultLotOfferingNote: "Offered in lots of 24 (select desired lot for each item)",
      items: [
        { id: "ms_korean_bbq_pork_belly", name: "Korean BBQ pork belly", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] },
        { id: "ms_greek_village_skewers", name: "Greek Village - Tomato, feta, cucumber and olive", pricePerPiece: 2.25, availableLotSizes: [36, 48, 72, 96] }, // Renamed ID for uniqueness
        { id: "ms_chicken_teriyaki", name: "Chicken Teriyaki", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] },
        { id: "ms_grilled_moroccan_flank_steak", name: "Grilled Moroccan style Flank steak", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] },
        { id: "ms_mediterranean_shrimp_skewers", name: "Mediterranean style shrimp", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] }, // Renamed ID for uniqueness
        { id: "ms_caprese_cold", name: "Caprese - Tomato, Basil and Mozzarella - cold", pricePerPiece: 2.25, availableLotSizes: [36, 48, 72, 96] },
        { id: "ms_prosciutto_melon_basil_cold", name: "Prosciutto, Melon and Basil - cold", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] },
        { id: "ms_tofu_hoisin_plum", name: "Tofu with Hoisin plum sauce", pricePerPiece: 2.25, availableLotSizes: [36, 48, 72, 96] },
        { id: "ms_antipasto_bites", name: "Antipasto Bites", pricePerPiece: 2.75, availableLotSizes: [36, 48, 72, 96] },
      ]
    },
    canapes: {
      id: "canapes",
      name: "Canapes",
      defaultLotOfferingNote: "Offered in lots of 48 (select desired lot for each item)",
      items: [
        { id: "can_watermelon_radish_chips_apple_chutney", name: "Watermelon radish chips with apple chutney", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_greek_village_canapes", name: "Greek Village - Tomato, feta, cucumber and olive", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] }, // Renamed ID for uniqueness
        { id: "can_french_onion_tartlets", name: "French onion tartlets with Gruyere and dill", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_pear_camembert_tartlet", name: "Pear and Camembert tartlet", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_mediterranean_shrimp_canapes", name: "Mediterranean style shrimp", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] }, // Renamed ID for uniqueness
        { id: "can_miso_maple_deviled_eggs", name: "Miso maple deviled eggs", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_beet_chips_goat_cheese_asparagus", name: "Beet chips with goat cheese and asparagus tips", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_vegan_bruschetta", name: "Vegan Bruschetta with olive tapenade and mint coulis", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_phyllo_cups_feta_fig_walnut", name: "Phyllo pastry cups with feta mousse, fig jam and walnut powder", pricePerPiece: 2.95, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_focaccia_pizza_bites", name: "Focaccia Pizza Bites with Prosciutto, sundried tomato pesto and fresh mozzarella", pricePerPiece: 2.95, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_italian_arancini_balls", name: "Italian Arancini balls", pricePerPiece: 2.95, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_crostini_goat_cheese_asparagus_tomato", name: "Crostini with goat cheese and asparagus tips and cherry tomato", pricePerPiece: 1.95, availableLotSizes: [36, 48, 96, 144] },
        { id: "can_stuffed_green_lipped_mussels", name: "Stuffed Green-Lipped Mussels", pricePerPiece: 3.50, availableLotSizes: [36, 48, 96, 144] },
      ]
    },
    vol_au_vents: {
      id: "vol_au_vents",
      name: "Vol au vents",
      defaultLotOfferingNote: "Offered in lots of 24 (select desired lot for each item)",
      items: [
        { id: "vav_gravlax_cream_cheese", name: "Gravlax with cream cheese", pricePerPiece: 3.00, availableLotSizes: [36, 48, 60, 96] },
        { id: "vav_spinach_feta_leek", name: "Spinach, feta and leek", pricePerPiece: 3.00, availableLotSizes: [36, 48, 60, 96] },
        { id: "vav_chicken_teriyaki", name: "Chicken Teriyaki", pricePerPiece: 3.00, availableLotSizes: [36, 48, 60, 96] },
        { id: "vav_melted_brie_cranberry", name: "Melted Brie with cranberry relish", pricePerPiece: 3.50, availableLotSizes: [36, 48, 60, 96] },
        { id: "vav_curried_chicken_salad", name: "Curried chicken salad", pricePerPiece: 3.00, availableLotSizes: [36, 48, 60, 96] },
        { id: "vav_tuna_tartare", name: "Tuna tartare", pricePerPiece: 3.75, availableLotSizes: [36, 48, 60, 96] },
        { id: "vav_brie_walnuts_mushrooms", name: "Brie with walnuts and mushrooms", pricePerPiece: 3.25, availableLotSizes: [36, 48, 60, 96] },
        { id: "vav_pulled_pork_prunes_apple", name: "Pulled pork with prunes and apple", pricePerPiece: 3.25, availableLotSizes: [36, 48, 60, 96] },
      ]
    },
    simple_fare: {
      id: "simple_fare",
      name: "Simple Fare",
      defaultLotOfferingNote: "Offered in lots of 48 (select desired lot for each item)",
      items: [
        { id: "sf_loaded_potato_skins", name: "Loaded Potato Skins", pricePerPiece: 1.95, availableLotSizes: [36, 48, 96, 144] },
        { id: "sf_stuffed_mushrooms", name: "Stuffed mushrooms", pricePerPiece: 2.25, availableLotSizes: [36, 48, 96, 144] },
        { id: "sf_chicken_wings", name: "Chicken wings", pricePerPiece: 2.65, availableLotSizes: [36, 48, 96, 144] },
        { id: "sf_deviled_eggs_bacon_chives", name: "Deviled eggs with bacon bits and chives", pricePerPiece: 2.25, availableLotSizes: [36, 48, 96, 144] },
        { id: "sf_meatballs_in_blanket", name: "Meatballs in a blanket", pricePerPiece: 2.50, availableLotSizes: [36, 48, 96, 144] },
        { id: "sf_mac_n_cheese_bites", name: "Mac n’ cheese bites", pricePerPiece: 2.50, availableLotSizes: [36, 48, 96, 144] },
        { id: "sf_lumpia_vegetarian", name: "Lumpia (Filipino Spring Rolls) Vegetarian", pricePerPiece: 2.75, availableLotSizes: [36, 48, 96, 144] },
        { id: "sf_lobster_rolls", name: "Lobster Rolls", pricePerPiece: 6.50, availableLotSizes: [36, 48, 96, 144] },
        { id: "sf_tater_tot_cheeseburger_bites", name: "Tater tot cheeseburger Bites", pricePerPiece: 2.50, availableLotSizes: [36, 48, 96, 144] },
      ]
    },
    charcuterie_boards: {
      id: "charcuterie_boards",
      name: "Charcuterie Boards & Grazing",
      defaultLotOfferingNote: "Priced per person (pp), select desired lot size for guest count.",
      items: [
        { id: "cb_cheese_fruit_grazing", name: "Cheese and fruit Grazing Board", pricePerPiece: 8.00, availableLotSizes: [24, 36, 48, 96, 144], notes: "$8.00 pp" },
        { id: "cb_meat_cheese_fruit_grazing", name: "Meat, cheese and fruit grazing Board", pricePerPiece: 9.00, availableLotSizes: [24, 36, 48, 96, 144], notes: "$9.00 pp" },
        { id: "cb_mexican_grazing", name: "Mexican Grazing Board", pricePerPiece: 10.00, availableLotSizes: [24, 36, 48, 96, 144], notes: "$10.00 pp" },
        { id: "cb_mediterranean_grazing", name: "Mediterranean grazing board", pricePerPiece: 11.00, availableLotSizes: [24, 36, 48, 96, 144], notes: "$11.00 pp" },
        { id: "cb_premium_grazing", name: "Premium Grazing Board", pricePerPiece: 15.00, availableLotSizes: [24, 36, 48, 96, 144], notes: "$15.00 pp" },
        { id: "cb_chips_salsa_bar", name: "Chips and salsa bar", description: "Includes an array of corn and flour tortillas, salsas and queso.", pricePerPiece: 5.50, availableLotSizes: [24, 36, 48, 96, 144], notes: "$5.50 pp" },
        { id: "cb_charcuterie_cones", name: "Charcuterie Cones", pricePerPiece: 4.75, availableLotSizes: [24, 36, 48, 96, 144], notes: "$4.75 pp" },
      ]
    },
  },
  spreadsPackage: {
    id: "spreads",
    name: "Spreads Package",
    description: "Served with Pita bread, and crudité. Select 3 spreads from the list below.",
    pricePerPerson: 6.50,
    selectionLimit: 3,
    items: [
      { id: "sp_tzatziki", name: "Tzatziki" },
      { id: "sp_hummus", name: "Hummus" },
      { id: "sp_beet_hummus", name: "Beet Hummus" },
      { id: "sp_baba_ghannoush", name: "Baba Ghannoush" },
      { id: "sp_spicy_feta", name: "Spicy Feta (Htipiti)" },
      { id: "sp_taramasalata", name: "Taramasalata" },
      { id: "sp_muhammara", name: "Muhammara" },
      { id: "sp_lebanese_garlic_dip", name: "Lebanese Garlic Dip (Toum)" },
    ],
  },
};