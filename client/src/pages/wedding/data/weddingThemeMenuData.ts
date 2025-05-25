// wedding/data/weddingThemeMenuData.ts

// Type Definitions
export type MenuItem = {
  id: string;
  name: string;
  upcharge?: number;
  description?: string;
};

export type MenuCategory = {
  title: string;
  description: string;
  items: MenuItem[];
};

export type MenuPackage = {
  id: string;
  name: string;
  price: number;
  description: string;
  minGuestCount?: number;
  limits?: {
    proteins?: number;
    mains?: number;
    sides?: number;
    salads?: number;
    salsas?: number;
    sauces?: number;
    condiments?: number;
    pasta?: number;
  };
};

export type WeddingThemeMenu = {
  title: string;
  description: string;
  customizable?: boolean;
  packages: MenuPackage[];
  categories: {
    [key: string]: MenuCategory;
  };
};

export const weddingThemeMenuData: { [key: string]: WeddingThemeMenu } = {
  taste_of_italy_wedding: {
    title: "A Taste of Italy - Wedding Celebration",
    description: "Elegant Italian cuisine, exquisitely prepared for your wedding reception.",
    packages: [
      {
        id: "italy_wedding_bronze", // Renamed and repriced
        name: "Bronze Celebration Package",
        price: 32.00, // Adjusted price for the new tiering
        description: "An elegant introduction: Select 2 Mains, 3 Sides, 1 Pasta, and 1 Salad. Includes artisanal bread service.",
        minGuestCount: 50,
        limits: { mains: 2, sides: 3, pasta: 1, salads: 1 },
      },
      {
        id: "italy_wedding_silver", // This is now based on the original "Silver" limits
        name: "Silver Celebration Package",
        price: 38.00, // Intermediate price
        description: "A delightful selection: Select 3 Mains, 3 Sides, 2 Pastas, and 2 Salads. Includes artisanal bread service and a choice of infused olive oils.",
        minGuestCount: 50,
        limits: { mains: 3, sides: 3, pasta: 2, salads: 2 },
      },
      {
        id: "italy_wedding_gold",
        name: "Gold Celebration Package",
        price: 46.00, // Kept original price, now clearly the third tier
        description: "A luxurious experience: Select 3 Mains, 4 Sides, 2 Pastas, and 2 Salads. Includes premium bread service and a complimentary signature appetizer selection.",
        minGuestCount: 50,
        limits: { mains: 3, sides: 4, pasta: 2, salads: 2 },
      },
      {
        id: "italy_wedding_diamond", // New top tier
        name: "Diamond Celebration Package",
        price: 58.00,
        description: "The ultimate Italian feast: Select 4 Mains, 5 Sides, 2 Premium Pastas, and 3 Salads. Includes deluxe bread service, complimentary signature appetizers, and dedicated table-side olive oil tasting.",
        minGuestCount: 50,
        limits: { mains: 4, sides: 5, pasta: 2, salads: 3 }, // Pasta limit kept at 2 for balance
      },
    ],
    categories: { // Categories remain the same, packages draw from these
      mains: {
        title: "Exquisite Italian Mains",
        description: "Choose your centerpiece main courses.",
        items: [
          { id: "chicken_saltimbocca_w", name: "Chicken Saltimbocca with Prosciutto & Sage", upcharge: 0 },
          { id: "beef_braciole_w", name: "Slow-Cooked Beef Braciole in Rich Tomato Sauce", upcharge: 5.00 },
          { id: "vegetarian_lasagna_w", name: "Layered Vegetarian Lasagna with Fresh Béchamel", upcharge: 0 },
          { id: "salmon_lemon_dill_w", name: "Pan-Seared Salmon with a Delicate Lemon-Dill Sauce", upcharge: 7.00 },
        ],
      },
      sides: {
        title: "Refined Italian Sides",
        description: "Select your accompanying side dishes.",
        items: [
          { id: "rosemary_potatoes_w", name: "Roasted Rosemary & Garlic Potatoes", upcharge: 0 },
          { id: "grilled_asparagus_parmesan_w", name: "Grilled Asparagus spears with Shaved Parmesan", upcharge: 0 },
          { id: "risotto_milanese_w", name: "Creamy Saffron Risotto Milanese", upcharge: 3.00 },
          { id: "garlic_broccolini_w", name: "Sautéed Garlic Broccolini with a hint of chili", upcharge: 0 },
        ],
      },
      pasta: {
        title: "Artisanal Italian Pasta",
        description: "Indulge in our freshly prepared pasta selections.",
        items: [
          { id: "penne_alla_vodka_w", name: "Penne alla Vodka with a Creamy Tomato Sauce", upcharge: 0 },
          { id: "fettuccine_alfredo_truffle_w", name: "Fettuccine Alfredo enhanced with Black Truffle Oil", upcharge: 4.00 },
          { id: "lobster_ravioli_w", name: "Lobster Ravioli in a Delicate Saffron Cream Sauce", upcharge: 8.00 },
        ],
      },
      salads: {
        title: "Fresh Italian Salads",
        description: "Choose from our vibrant and fresh salad creations.",
        items: [
          { id: "caesar_w", name: "Classic Caesar Salad with Homemade Croutons & Parmesan Crisps", upcharge: 0 },
          { id: "caprese_w", name: "Vine-Ripened Tomato & Fresh Mozzarella Caprese with Balsamic Glaze", upcharge: 0 },
          { id: "arugula_pear_gorgonzola_w", name: "Arugula Salad with Sliced Pear, Gorgonzola, and Candied Walnuts", upcharge: 2.00 },
        ],
      },
    },
  },

  vegan_wedding_feast: {
    title: "Elegant Vegan Wedding Feast",
    description: "Exquisite plant-based culinary selections, thoughtfully crafted for your special day.",
    packages: [
      {
        id: "pearl_vegan_wedding",
        name: "Pearl Vegan Delight",
        price: 32.00,
        description: "Delight your guests with 2 Mains, 2 Sides, and 1 Salad from our vegan collection.",
        limits: { mains: 2, sides: 2, salads: 1 }
      },
      {
        id: "sapphire_vegan_wedding",
        name: "Sapphire Vegan Collection",
        price: 40.00,
        description: "An expanded offering of 3 Mains, 3 Sides, and 2 Salads, showcasing diverse flavors.",
        limits: { mains: 3, sides: 3, salads: 2 }
      },
      {
        id: "emerald_vegan_wedding",
        name: "Emerald Vegan Experience",
        price: 48.00,
        description: "A luxurious spread featuring 4 Mains, 4 Sides, and 2 Salads for a truly memorable meal.",
        limits: { mains: 4, sides: 4, salads: 2 }
      },
      {
        id: "diamond_vegan_wedding",
        name: "Diamond Vegan Extravaganza",
        price: 58.00,
        description: "The ultimate plant-based celebration: 5 Mains, 5 Sides, and 3 Salads.",
        limits: { mains: 5, sides: 5, salads: 3 }
      }
    ],
    categories: {
      mains: {
        title: "Signature Vegan Mains",
        description: "Select your sophisticated vegan main courses.",
        items: [
          { id: "vw_cabbage_rolls", name: "Cabbage Rolls with rice, dried figs, pine nuts, and aromatic herbs" },
          { id: "vw_eggplant_imam", name: "Eggplant Imam Baildi, sumptuously topped with stewed tomato and peppers" },
          { id: "vw_indian_stuffed_peppers", name: "Indian Style Stuffed Peppers with fragrant curried chickpeas" },
          { id: "vw_eggplant_napolean", name: "Eggplant Napolean layered with roasted red peppers" },
          { id: "vw_artichoke_polita", name: "Artichoke Ala Polita with a vibrant lemon tahini sauce" },
          { id: "vw_stuffed_portabella", name: "Stuffed Portabella Mushrooms with hearty stewed lentils" },
          { id: "vw_wild_rice_squash", name: "Wild Rice Stuffed Acorn Squash, a harvest delight" },
          { id: "vw_tofu_vindaloo", name: "Spicy Tofu Vindaloo, full of bold flavors" },
          { id: "vw_greek_stuffed_peppers", name: "Greek Style Stuffed Peppers with aromatic jasmine rice" },
          { id: "vw_vegan_moussaka", name: "Vegan Moussaka with stewed lentils and creamy cauliflower béchamel" },
          { id: "vw_stuffed_poblano", name: "Stuffed Poblano Peppers with savory rice and beans" }
        ]
      },
      sides: {
        title: "Gourmet Vegan Sides",
        description: "Choose your flavorful plant-based side dishes.",
        items: [
          { id: "vw_lemon_potatoes", name: "Roasted Lemon Potatoes with oregano" },
          { id: "vw_green_beans_almondine", name: "Haricots Verts Almondine" },
          { id: "vw_fasolakia", name: "Fasolakia (Greek green beans stewed with tomatoes)" },
          { id: "vw_gigante_beans", name: "Gigante Beans baked in a rich tomato dill sauce" },
          { id: "vw_vegan_dolmades", name: "Dolmades with bulgur, currants, and dried figs" },
          { id: "vw_cannellini_caponata", name: "Cannellini Beans with a sweet & sour caponata" },
          { id: "vw_roasted_brussel_sprouts", name: "Roasted Brussel Sprouts with balsamic glaze" },
          { id: "vw_moroccan_cauliflower", name: "Moroccan-Style Roasted Cauliflower with exotic spices" },
          { id: "vw_tuscan_carrots", name: "Tuscan Glazed Carrots with herbs" },
          { id: "vw_moroccan_wild_rice", name: "Moroccan Wild Rice Pilaf with dried fruits and nuts" },
          { id: "vw_cilantro_lime_rice", name: "Cilantro-Lime Rice, fresh and zesty" },
          { id: "vw_greek_rice_pilaf", name: "Greek Rice Pilaf with fresh herbs" },
          { id: "vw_southwest_spring_rolls", name: "Southwest Style Spring Rolls with a zesty dip" },
          { id: "vw_crispy_falafel", name: "Crispy Falafel with tahini drizzle" }
        ]
      },
      salads: {
        title: "Vibrant Vegan Salads",
        description: "Select from our refreshing and wholesome vegan salads.",
        items: [
          { id: "vw_panzanella", name: "Tuscan Panzanella Bread Salad" },
          { id: "vw_sicilian_fennel", name: "Sicilian Fennel & Orange Salad" },
          { id: "vw_bowtie_pasta", name: "Mediterranean Bowtie Pasta Salad" },
          { id: "vw_tuscan_orzo", name: "Tuscan Orzo Pesto Salad with sun-dried tomatoes" },
          { id: "vw_garden_salad", name: "Fresh Garden Salad with a choice of vegan dressings" },
          { id: "vw_greek_village", name: "Greek Village Salad (Horiatiki) with vegan feta alternative" },
          { id: "vw_asian_slaw", name: "Crunchy Asian Slaw with Mandarin Oranges and sesame ginger dressing" },
          { id: "vw_cucumber_mint", name: "Refreshing Cucumber Mint & Dill Salad" },
          { id: "vw_kale_quinoa", name: "Kale and Quinoa Salad with lemon-tahini dressing" },
          { id: "vw_southwest_bean", name: "Southwest Black Bean & Corn Salad with lime vinaigrette" }
        ]
      }
    }
  },

  taco_fiesta_wedding: {
    title: "Taco Fiesta Celebration",
    description: "A vibrant and festive Mexican-inspired menu, perfect for a lively wedding celebration.",
    packages: [
      {
        id: "tfw_bronze",
        name: "Bronze Package",
        price: 28.00,
        description: "A delightful taco bar experience: 3 Proteins, 2 Sides, 3 Salsas, 4 Condiments.",
        minGuestCount: 50,
        limits: { proteins: 3, sides: 2, salsas: 3, condiments: 4 }
      },
      {
        id: "tfw_silver",
        name: "Silver Package",
        price: 34.00,
        description: "An enhanced celebration: 4 Proteins, 3 Sides, 4 Salsas, 6 Condiments.",
        limits: { proteins: 4, sides: 3, salsas: 4, condiments: 6 }
      },
      {
        id: "tfw_gold",
        name: "Gold Package",
        price: 40.00,
        description: "The grand taco experience: 4 Proteins, 4 Sides, 4 Salsas, 6 Condiments.",
        limits: { proteins: 4, sides: 4, salsas: 4, condiments: 6 }
      },
      {
        id: "tfw_diamond",
        name: "Diamond Package",
        price: 46.00,
        description: "The ultimate taco indulgence: 5 Proteins, 5 Sides, 5 Salsas, 8 Condiments.",
        limits: { proteins: 5, sides: 5, salsas: 5, condiments: 8 }
      }
    ],
    categories: {
      proteins: {
        title: "Gourmet Proteins",
        description: "Choose your succulent protein options.",
        items: [
          { id: "tfw_barbacoa", name: "Barbacoa", upcharge: 0 },
          { id: "tfw_flank_steak_fajitas", name: "Flank steak Fajitas", upcharge: 2.00 },
          { id: "tfw_ground_beef", name: "Ground Beef", upcharge: 0 },
          { id: "tfw_pork_carnitas", name: "Pork Carnitas", upcharge: 0 },
          { id: "tfw_pork_belly", name: "Pork Belly", upcharge: 0 },
          { id: "tfw_chorizo", name: "Chorizo", upcharge: 0 },
          { id: "tfw_beef_birria", name: "Beef Birria", upcharge: 0 },
          { id: "tfw_mexican_chicken", name: "Mexican Chicken", upcharge: 0 },
          { id: "tfw_cod", name: "Cod", upcharge: 0 },
          { id: "tfw_shrimp", name: "Shrimp", upcharge: 0 },
          { id: "tfw_tofu", name: "Tofu", upcharge: 0 },
          { id: "tfw_roasted_vegetables", name: "Roasted Vegetables", upcharge: 0 },
          { id: "tfw_escabeche", name: "Escabeche - House-made picked vegetable medley", upcharge: 0 }
        ]
      },
      sides: {
        title: "Flavorful Sides",
        description: "Select your delectable side dishes.",
        items: [
          { id: "tfw_refried_beans", name: "Refried Beans", upcharge: 0 },
          { id: "tfw_elotes", name: "Mexican Street corn (Elotes)", upcharge: 0 },
          { id: "tfw_queso_dip", name: "Queso Dip", upcharge: 0 },
          { id: "tfw_chorizo_queso_dip", name: "Chorizo Queso Dip", upcharge: 0 },
          { id: "tfw_stuffed_poblano", name: "Stuffed Poblano peppers", upcharge: 0 },
          { id: "tfw_mexican_rice", name: "Mexican Rice", upcharge: 0 },
          { id: "tfw_cilantro_lime_rice", name: "Cilantro Lime Rice", upcharge: 0 },
          { id: "tfw_rice_and_beans", name: "Rice and Beans", upcharge: 0 },
          { id: "tfw_jalapeno_cornbread", name: "Jalapeno cornbread", upcharge: 0 },
          { id: "tfw_grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 },
          { id: "tfw_mexican_slaw", name: "Mexican Slaw with Mango", upcharge: 0 },
          { id: "tfw_veg_empanadas", name: "Vegetarian Empanadas", upcharge: 0 }
        ]
      },
      salsas: {
        title: "Artisanal Salsas",
        description: "Choose from our freshly made salsas.",
        items: [
          { id: "tfw_pico_de_gallo", name: "Classic Pico de Gallo", upcharge: 0 },
          { id: "tfw_fresh_mango_salsa", name: "Fresh Mango Salsa", upcharge: 0 },
          { id: "tfw_pineapple_habanero", name: "Pineapple Habanero Salsa", upcharge: 0 },
          { id: "tfw_cucumber_apple", name: "Cucumber & Apple Salsa", upcharge: 0 },
          { id: "tfw_jicama_papaya", name: "Jicama and Papaya Salsa", upcharge: 0 },
          { id: "tfw_salsa_roja", name: "Salsa Roja (red sauce)", upcharge: 0 },
          { id: "tfw_salsa_verde", name: "Salsa Verde (green sauce)", upcharge: 0 },
          { id: "tfw_creamy_salsa_verde", name: "Creamy Salsa Verde (green sauce)", upcharge: 0 },
          { id: "tfw_salsa_macha", name: "Salsa Macha (contains peanuts and sesame seeds)", upcharge: 0 }
        ]
      },
      condiments: {
        title: "Fresh Condiments & Toppings",
        description: "Complete your tacos with these essential toppings.",
        items: [
          { id: "tfw_shredded_cheese", name: "Shredded cheese", upcharge: 0 },
          { id: "tfw_vegan_cheese", name: "Shredded vegan cheese", upcharge: 0 },
          { id: "tfw_diced_onions", name: "Diced Onions", upcharge: 0 },
          { id: "tfw_lime_wedges", name: "Lime wedges", upcharge: 0 },
          { id: "tfw_jalapenos", name: "Jalapeños", upcharge: 0 },
          { id: "tfw_sour_cream", name: "Sour Cream", upcharge: 0 },
          { id: "tfw_diced_bell_peppers", name: "Diced bell peppers", upcharge: 0 },
          { id: "tfw_guacamole", name: "Guacamole", upcharge: 0 },
          { id: "tfw_fire_roasted_peppers", name: "Fire roasted bell peppers", upcharge: 0 },
          { id: "tfw_sliced_radish", name: "Sliced radish", upcharge: 0 },
          { id: "tfw_cilantro", name: "Cilantro", upcharge: 0 },
          { id: "tfw_pickled_cabbage", name: "Pickled cabbage", upcharge: 0 },
          { id: "tfw_escabeche_condiment", name: "Escabeche - House-made picked vegetable medley", upcharge: 0 }
        ]
      }
    }
  },

  american_bbq_wedding: {
    title: "American BBQ",
    description: "A classic American BBQ feast, perfect for a relaxed and joyful wedding reception.",
    packages: [
      {
        id: "abw_bronze",
        name: "Bronze Package",
        price: 32.00,
        description: "Pick 3 Proteins, Pick 2 Sides, Pick 2 Salads, Pick 3 Condiments, Pick 2 Sauces.",
        minGuestCount: 50,
        limits: { proteins: 3, sides: 2, salads: 2, condiments: 3, sauces: 2 }
      },
      {
        id: "abw_silver",
        name: "Silver Package",
        price: 38.00,
        description: "Pick 4 Proteins, Pick 3 Sides, Pick 2 Salads, Pick 3 Condiments, Pick 2 Sauces.",
        limits: { proteins: 4, sides: 3, salads: 2, condiments: 3, sauces: 2 }
      },
      {
        id: "abw_gold",
        name: "Gold Package",
        price: 46.00,
        description: "Pick 4 Proteins, Pick 4 Sides, Pick 3 Salads, Pick 4 Condiments, Pick 3 Sauces.",
        limits: { proteins: 4, sides: 4, salads: 3, condiments: 4, sauces: 3 }
      },
      {
        id: "abw_diamond",
        name: "Diamond Package",
        price: 54.00,
        description: "Pick 5 Proteins, Pick 5 Sides, Pick 3 Salads, Pick 5 Condiments, Pick 4 Sauces.",
        limits: { proteins: 5, sides: 5, salads: 3, condiments: 5, sauces: 4 }
      }
    ],
    categories: {
      proteins: {
        title: "Protein Options",
        description: "Choose your hearty BBQ proteins.",
        items: [
          { id: "abw_prime_rib", name: "Prime Rib - Boneless -Carving station", upcharge: 4.00 },
          { id: "abw_smoked_brisket", name: "Smoked Brisket", upcharge: 2.00 },
          { id: "abw_beef_ribs", name: "Beef Ribs", upcharge: 3.00 },
          { id: "abw_guinness_short_ribs", name: "Guinness Braised Boneless Short Ribs", upcharge: 2.00 },
          { id: "abw_bacon_filet_mignon", name: "Bacon Wrapped Fillet Mignon", upcharge: 4.00 },
          { id: "abw_flank_steak_chimichurri", name: "Flank Steak with Chimichurri", upcharge: 0 },
          { id: "abw_sausage_medley", name: "Sausage Medley", upcharge: 0 },
          { id: "abw_hamburger_bar", name: "Hamburger Bar", upcharge: 1.50 },
          { id: "abw_lamb_chops", name: "Lamb Chops", upcharge: 3.00 },
          { id: "abw_smoked_leg_lamb", name: "Smoked Leg of Lamb (Family Style only)", upcharge: 0 },
          { id: "abw_pulled_pork", name: "Pulled Pork", upcharge: 0 },
          { id: "abw_smoked_pork_belly", name: "Smoked pork Belly", upcharge: 0 },
          { id: "abw_baby_back_ribs", name: "Baby Back Ribs", upcharge: 0 },
          { id: "abw_pork_chop", name: "Bone-in, thick-cut, Grilled Pork Chop with Korean BBQ glaze", upcharge: 0 },
          { id: "abw_bbq_guinness_chicken", name: "BBQ Guinness Chicken", upcharge: 1.00 },
          { id: "abw_carolina_bbq_chicken", name: "Carolina BBQ Chicken", upcharge: 0 },
          { id: "abw_rotisserie_chicken", name: "Rotisserie Chicken", upcharge: 0 },
          { id: "abw_bbq_prawns", name: "BBQ Prawns", upcharge: 1.00 },
          { id: "abw_black_tiger_prawns", name: "BBQ Black Tiger Prawns", upcharge: 2.00 },
          { id: "abw_salmon_steak", name: "Salmon steak", upcharge: 0 },
          { id: "abw_tofu", name: "Tofu", upcharge: 0 },
          { id: "abw_vegetable_kebabs", name: "Vegetable kebabs", upcharge: 0 },
          { id: "abw_cauliflower_steaks", name: "Grilled Cauliflower Steaks", upcharge: 0 }
        ]
      },
      sides: {
        title: "Side Options",
        description: "Select your favorite side dishes.",
        items: [
          { id: "abw_ham_hock_beans", name: "Ham hock baked Beans", upcharge: 0 },
          { id: "abw_avocado_deviled_eggs", name: "Avocado deviled Eggs", upcharge: 0 },
          { id: "abw_mac_cheese", name: "Mac n' Cheese", upcharge: 0 },
          { id: "abw_stuffed_poblano", name: "Stuffed Poblano peppers", upcharge: 0 },
          { id: "abw_baked_potato_bar", name: "Baked Potato Bar", upcharge: 1.50 },
          { id: "abw_garlic_mashed", name: "Garlic Mashed Potatoes", upcharge: 0 },
          { id: "abw_mini_smashed", name: "Mini Smashed Potatoes", upcharge: 0 },
          { id: "abw_twice_baked_potatoes", name: "Twice Baked Potatoes", upcharge: 0.50 },
          { id: "abw_corn_on_cob", name: "Corn on the Cob", upcharge: 0 },
          { id: "abw_creamed_corn", name: "Creamed Corn", upcharge: 0 },
          { id: "abw_jalapeno_poppers", name: "Jalapeño Poppers", upcharge: 0 },
          { id: "abw_roasted_brussels", name: "Roasted Brussels Sprouts", upcharge: 0 },
          { id: "abw_corn_bread", name: "Corn Bread", upcharge: 0 },
          { id: "abw_jalapeno_cornbread", name: "Jalapeno cornbread", upcharge: 0 },
          { id: "abw_grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 },
          { id: "abw_grilled_asparagus", name: "Grilled Asparagus", upcharge: 0 }
        ]
      },
      salads: {
        title: "Salad Options",
        description: "Choose from our selection of refreshing salads.",
        items: [
          { id: "abw_caesar", name: "Caesar", upcharge: 0 },
          { id: "abw_coleslaw", name: "Coleslaw", upcharge: 0 },
          { id: "abw_garden_salad", name: "Garden Salad", upcharge: 0 },
          { id: "abw_pasta_salad", name: "Pasta Salad", upcharge: 0 },
          { id: "abw_bacon_jalapeno_corn", name: "Bacon Jalapeño Corn Salad", upcharge: 0 },
          { id: "abw_wedge_salad", name: "Wedge Salad", upcharge: 0 },
          { id: "abw_german_cucumber", name: "German cucumber salad", upcharge: 0 },
          { id: "abw_crunchy_asian_slaw", name: "Crunchy Asian Slaw", upcharge: 0 },
          { id: "abw_tossed_cobb", name: "Tossed Cobb Salad", upcharge: 0 },
          { id: "abw_classic_potato", name: "Classic Potato Salad", upcharge: 0 },
          { id: "abw_german_potato", name: "German Potato Salad", upcharge: 0 },
          { id: "abw_macaroni_salad", name: "Macaroni Salad", upcharge: 0 },
          { id: "abw_hawaiian_macaroni", name: "Hawaiian Macaroni Salad", upcharge: 0 },
          { id: "abw_fruit_salad", name: "Fruit Salad", upcharge: 0 }
        ]
      },
      sauces: {
        title: "Sauce Options",
        description: "Select from our house-made BBQ sauces.",
        items: [
          { id: "abw_kansas_city_bbq", name: "Kansas City BBQ Sauce", upcharge: 0 },
          { id: "abw_south_carolina_gold", name: "South Carolina Gold BBQ Sauce", upcharge: 0 },
          { id: "abw_north_carolina_vinegar", name: "North Carolina Vinegar based BBQ Sauce", upcharge: 0 },
          { id: "abw_alabama_white", name: "Alabama White BBQ Sauce", upcharge: 0 },
          { id: "abw_texas_bbq", name: "Texas BBQ Sauce", upcharge: 0 },
          { id: "abw_very_berry_bbq", name: "Very Berry BBQ Sauce", upcharge: 0 },
          { id: "abw_smoky_bourbon_bbq", name: "Smoky bourbon BBQ Sauce", upcharge: 0 }
        ]
      },
      condiments: {
        title: "Condiment Options",
        description: "All the fixings for your BBQ feast.",
        items: [
          { id: "abw_ketchup", name: "Ketchup", upcharge: 0 },
          { id: "abw_stone_ground_mustard", name: "Stone Ground Mustard", upcharge: 0 },
          { id: "abw_dijon_mustard", name: "Dijon Mustard", upcharge: 0 },
          { id: "abw_yellow_mustard", name: "Yellow Mustard", upcharge: 0 },
          { id: "abw_mayonnaise", name: "Mayonnaise", upcharge: 0 },
          { id: "abw_sweet_pickle_chips", name: "Sweet pickle Chips", upcharge: 0 },
          { id: "abw_dill_pickle_chips", name: "Dill pickle Chips", upcharge: 0 },
          { id: "abw_sliced_radish", name: "Sliced radish", upcharge: 0 },
          { id: "abw_sweet_relish", name: "Sweet Relish", upcharge: 0 },
          { id: "abw_cranberry_relish", name: "Cranberry Relish", upcharge: 0 },
          { id: "abw_kimchi", name: "Kimchi", upcharge: 0 },
          { id: "abw_mixed_pickled_veg", name: "Mixed Pickled Vegetables - Giardiniera", upcharge: 0 }
        ]
      }
    }
  },

  taste_of_greece_wedding: {
    title: "A taste of Greece",
    description: "Authentic Mediterranean flavors from Greece, perfect for a memorable wedding celebration.",
    packages: [
      {
        id: "tgw_bronze",
        name: "Bronze Package",
        price: 32.00,
        description: "Pick 3 Mains, Pick 3 Sides, Pick 2 Salads, Includes pita bread",
        minGuestCount: 50,
        limits: { mains: 3, sides: 3, salads: 2 }
      },
      {
        id: "tgw_silver",
        name: "Silver Package",
        price: 38.00,
        description: "Pick 4 Mains, Pick 3 Sides, Pick 2 Salads, Includes pita bread",
        limits: { mains: 4, sides: 3, salads: 2 }
      },
      {
        id: "tgw_gold",
        name: "Gold Package",
        price: 46.00,
        description: "Pick 4 Mains, Pick 4 Sides, Pick 2 Salads, Includes spreads selection and pita bread",
        limits: { mains: 4, sides: 4, salads: 2 }
      },
      {
        id: "tgw_diamond",
        name: "Diamond Package",
        price: 59.00,
        description: "Pick 5 Mains, Pick 4 Sides, Pick 3 Salads, Includes spreads selection, meze platter, and pita bread",
        limits: { mains: 5, sides: 4, salads: 3 }
      }
    ],
    categories: {
      mains: {
        title: "Main Options",
        description: "Choose your centerpiece Greek dishes.",
        items: [
          { id: "tgw_papoutsakia", name: "Papoutsakia - Classic moussaka in individual hollowed eggplant shells with seasoned ground beef and topped with creamy bechamel", upcharge: 0 },
          { id: "tgw_soutzoukakia", name: "Soutzoukakia - Plump oblong-shaped meatballs are packed with loads of aromatics and fresh herbs, smothered in a cinnamon wine-enhanced tomato sauce", upcharge: 0 },
          { id: "tgw_kokinisto", name: "Kokinisto - Boneless short rib slowly cooked in cinnamon-scented tomato sauce", upcharge: 0 },
          { id: "tgw_kleftiko", name: "Kleftiko - (Family style only) Boldly seasoned lamb roast that cooks with new potatoes, celery, and carrots, low and slow for 6 hours, in a parchment paper pouch", upcharge: 5.00 },
          { id: "tgw_pastitsio", name: "Pastitsio - Classic baked pasta dish with cinnamon-scented ground meat and creamy béchamel sauce", upcharge: 0 },
          { id: "tgw_kotopoulo_lemonato", name: "Kotopoulo lemonato - Aromatic and lemony baked chicken with fresh herbs", upcharge: 0 },
          { id: "tgw_paidakia", name: "Paidakia - These Greek lamb chops are marinated in a mix of olive oil, lemon juice, garlic and oregano and grilled to perfection", upcharge: 4.00 },
          { id: "tgw_kotsi_arni", name: "Kotsi Arni - Slowly roasted lamb shank with tomato, herbs and robust spices such as cinnamon and clove", upcharge: 0 },
          { id: "tgw_bifteki_gemisto", name: "Bifteki Gemisto - Aromatic oven-baked minced beef 'burgers', stuffed with cheese and topped with tomato relish", upcharge: 0 },
          { id: "tgw_psari_plaki", name: "Psari Plaki - Oven-baked fish fillet topped with fresh tomato slices, onion, and fresh herbs", upcharge: 0 },
          { id: "tgw_solomou", name: "Brizola Solomou - Grilled salmon steaks with fresh herbs, lemon, and evoo", upcharge: 0 },
          { id: "tgw_bakaliaros", name: "Bakaliaros Plaki - Oven-baked Cod fish fillet topped with fresh tomato slices, onion, and fresh herbs", upcharge: 0 },
          { id: "tgw_aginares", name: "Aginares Ala Polita - Vegan option - Artichoke hearts braised with potatoes and carrots and finished with a creamy egg-lemon sauce and fresh dill", upcharge: 0 },
          { id: "tgw_gemista", name: "Gemista - Vegan Oven-baked stuffed tomatoes and peppers with rice, and fresh herbs", upcharge: 0 }
        ]
      },
      sides: {
        title: "Side Options",
        description: "Select your flavorful Greek side dishes.",
        items: [
          { id: "tgw_lemon_potatoes", name: "Lemon Potatoes - Roasted russet potatoes cooked with oregano garlic, evoo and fresh lemon juice", upcharge: 0 },
          { id: "tgw_spanakopita", name: "Spanakopita - House made phyllo dough pouches stuffed with spinach, greens, herbs, and feta cheese", upcharge: 0 },
          { id: "tgw_kritharaki", name: "Kritharaki - Orzo pasta baked in the oven. A pasta side dish choice with any main", upcharge: 0 },
          { id: "tgw_fasolakia", name: "Fasolakia - Green beans simmered with tomato and fresh herbs", upcharge: 0 },
          { id: "tgw_gigandes_plaki", name: "Gigandes Plaki - Oven baked lima beans in a herbaceous tomato sauce", upcharge: 0 },
          { id: "tgw_tyrokroketes", name: "Tyrokroketes - A blend of three Greek cheeses rolled into delightful tangy balls and coated with sesame seeds", upcharge: 0 },
          { id: "tgw_octapodi", name: "Octapodi - Spanish octopus slowly braised and served simply with lemon juice, EVOO, and fresh oregano", upcharge: 7.00 },
          { id: "tgw_dolmades", name: "Dolmades - Grape leaves stuffed with rice and fresh herbs", upcharge: 0 },
          { id: "tgw_saganaki", name: "Saganaki Cheese - Cheese is deep fried to make a crispy outside, with a melty gooey inside. Flambeed tableside! (Family style only)", upcharge: 2.00 },
          { id: "tgw_greek_rice_pilaf", name: "Greek Rice Pilaf - Long grain rice, with mixed diced vegetables, scented with lemon zest and fresh herbs", upcharge: 0 },
          { id: "tgw_baked_vegetables", name: "Baked Vegetables - Briam - Thinly sliced vegetable medley, seasoned and baked till lightly charred", upcharge: 0 }
        ]
      },
      salads: {
        title: "Salad Options",
        description: "Choose from our vibrant and refreshing Greek salads.",
        items: [
          { id: "tgw_horiatiki", name: "Salata Horiatiki - A mix of tomatoes, cucumber, onion, green pepper, feta, and olives, dressed with oil and vinegar", upcharge: 0 },
          { id: "tgw_lahanosalata", name: "Lahanosalata (Greek Coleslaw) - Green and red shredded cabbage, grated carrots, olive oil and lemon juice", upcharge: 0 },
          { id: "tgw_maroulosalata", name: "Maroulosalata (Greek Romaine Salad) - Shredded romaine lettuce, scallions, mixed herbs, olive oil, lemon juice", upcharge: 0 },
          { id: "tgw_patatosalata", name: "Patatosalata - Warm potato salad with sliced red onions, Kalamata olives, parsley and extra virgin olive oil", upcharge: 0 },
          { id: "tgw_dakos", name: "Dakos Bread Salad - Fresh tomatoes, barley rusks, feta, capers, onion, oregano, and basil", upcharge: 0 },
          { id: "tgw_garden_salad", name: "Garden Salad - Mixed greens, cherry tomatoes, cucumber, red onion and mushrooms with choice of dressing", upcharge: 0 },
          { id: "tgw_tabouli", name: "Tabouli - Chopped parsley, cous-cous, tomato, cucumber, mint, red onion and lemon-tahini dressing", upcharge: 0 }
        ]
      },
      spreads: {
        title: "Greek Spreads Options",
        description: "Included in Gold and Diamond tiers",
        items: [
          { id: "tgw_tzatziki", name: "Tzatziki - Yogurt, garlic, cucumber, herbs", upcharge: 0 },
          { id: "tgw_hummus", name: "Hummus - Chickpea, tahini, lemon", upcharge: 0 },
          { id: "tgw_melitzanosalata", name: "Melitzanosalata - Eggplant, garlic, tahini, cilantro", upcharge: 0 },
          { id: "tgw_spicy_feta", name: "Spicy Feta - Feta cheese puree with spicy peppers", upcharge: 0 },
          { id: "tgw_taramasalata", name: "Taramasalata - Cod roe, potato, extra virgin olive oil", upcharge: 0 },
          { id: "tgw_beet_hummus", name: "Beet Hummus - Roasted beets, chickpea, garlic, tahini, evoo", upcharge: 0 }
        ]
      }
    }
  },

  kebab_party_wedding: {
    title: "Kebab Party",
    description: "A delightful array of skewered delights, featuring global flavors grilled to perfection for your wedding.",
    packages: [
      {
        id: "kpw_bronze",
        name: "Bronze Package",
        price: 35.00,
        description: "Pick 3 Proteins, Pick 3 Sides, Pick 2 Salads",
        minGuestCount: 50,
        limits: { proteins: 3, sides: 3, salads: 2 }
      },
      {
        id: "kpw_silver",
        name: "Silver Package",
        price: 39.00,
        description: "Pick 4 Proteins, Pick 3 Sides, Pick 2 Salads",
        limits: { proteins: 4, sides: 3, salads: 2 }
      },
      {
        id: "kpw_gold",
        name: "Gold Package",
        price: 49.00,
        description: "Pick 4 Proteins, Pick 4 Sides, Pick 3 Salads, Includes spreads",
        limits: { proteins: 4, sides: 4, salads: 3 }
      },
      {
        id: "kpw_diamond",
        name: "Diamond Package",
        price: 63.00,
        description: "Pick 5 Proteins, Pick 5 Sides, Pick 3 Salads, Includes spreads, Includes meze grazing board",
        limits: { proteins: 5, sides: 5, salads: 3 }
      }
    ],
    categories: {
      proteins: {
        title: "Protein Options",
        description: "Select your kebab proteins.",
        items: [
          { id: "kpw_pork_tenderloin", name: "Pork Tenderloin", upcharge: 0 },
          { id: "kpw_chicken", name: "Chicken", upcharge: 0 },
          { id: "kpw_beef_tenderloin", name: "Beef Tenderloin", upcharge: 0 },
          { id: "kpw_beef_flank", name: "Beef Flank", upcharge: 0 },
          { id: "kpw_lamb", name: "Lamb", upcharge: 1.50 },
          { id: "kpw_swordfish", name: "Swordfish", upcharge: 0 },
          { id: "kpw_shrimp", name: "Shrimp", upcharge: 0 },
          { id: "kpw_bacon_wrapped_asparagus", name: "Bacon wrapped Asparagus", upcharge: 0 },
          { id: "kpw_tofu", name: "Tofu", upcharge: 0 },
          { id: "kpw_mushrooms", name: "Mushrooms", upcharge: 0 },
          { id: "kpw_tomato_gnocchi", name: "Tomato & Gnocchi- with pesto", upcharge: 0 },
          { id: "kpw_mixed_vegetables", name: "Mixed Vegetables", upcharge: 0 }
        ]
      },
      sides: {
        title: "Side Options",
        description: "Choose your delicious side dishes.",
        items: [
          { id: "kpw_falafel", name: "Falafel", upcharge: 0 },
          { id: "kpw_spanakopita", name: "Spanakopita", upcharge: 0 },
          { id: "kpw_dolmades", name: "Dolmades", upcharge: 0 },
          { id: "kpw_yellow_rice_pilaf", name: "Yellow Rice Pilaf", upcharge: 0 },
          { id: "kpw_wild_rice_mushroom", name: "Wild Rice and Mushroom Pilaf", upcharge: 0 },
          { id: "kpw_patatas_bravas", name: "Patatas Bravas", upcharge: 0 },
          { id: "kpw_potato_croquettes", name: "Potato Croquettes", upcharge: 0 },
          { id: "kpw_roasted_beets", name: "Roasted beets", upcharge: 0 },
          { id: "kpw_roasted_brussel_sprouts", name: "Roasted Brussel Sprouts", upcharge: 0 },
          { id: "kpw_moroccan_cauliflower", name: "Moroccan-style roasted Cauliflower", upcharge: 0 },
          { id: "kpw_roasted_carrots", name: "Roasted carrots", upcharge: 0 },
          { id: "kpw_grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 }
        ]
      },
      salads: {
        title: "Salad Options",
        description: "Choose from our vibrant and refreshing salads.",
        items: [
          { id: "kpw_tabouli", name: "Tabouli", upcharge: 0 },
          { id: "kpw_fattoush", name: "Fattoush", upcharge: 0 },
          { id: "kpw_cous_cous", name: "Cous-cous", upcharge: 0 },
          { id: "kpw_lebanese_potato", name: "Lebanese Potato Salad", upcharge: 0 },
          { id: "kpw_greek_village", name: "Greek Village Salad", upcharge: 0 },
          { id: "kpw_tomato_cucumber", name: "Tomato - Cucumber salad", upcharge: 0 },
          { id: "kpw_caprese_pasta", name: "Caprese pasta salad", upcharge: 0 },
          { id: "kpw_caesar", name: "Caesar", upcharge: 0 },
          { id: "kpw_garden_salad", name: "Garden Salad", upcharge: 0 }
        ]
      },
      spreads: {
        title: "Spreads Options",
        description: "Served with pita bread, crudité and breadsticks - included in Gold and Diamond tiers - Pick 3",
        items: [
          { id: "kpw_tzatziki", name: "Tzatziki", upcharge: 0 },
          { id: "kpw_hummus", name: "Hummus", upcharge: 0 },
          { id: "kpw_baba_ghanoush", name: "Baba Ghanoush", upcharge: 0 },
          { id: "kpw_spicy_feta", name: "Spicy Feta", upcharge: 0 },
          { id: "kpw_taramasalata", name: "Taramasalata", upcharge: 0 },
          { id: "kpw_muhammara", name: "Muhammara", upcharge: 0 },
          { id: "kpw_lebanese_garlic", name: "Lebanese garlic dip", upcharge: 0 }
        ]
      }
    }
  },

  custom_wedding_menu: {
    title: "Bespoke Wedding Menu Creation",
    description: "Design your dream wedding menu by selecting signature dishes from our diverse culinary collections. Our event specialist will help finalize pricing based on your unique selections.",
    customizable: true,
    packages: [
      {
        id: "bespoke_wedding_creation",
        name: "Bespoke Creation Package",
        price: 0,
        description: "A fully customized culinary experience. Select items from any of our wedding themes. Final price determined by choices. A minimum spend or coordination fee may apply.",
        minGuestCount: 30,
        limits: { mains: 3, sides: 4, salads: 2, proteins: 3, pasta: 2, sauces: 3, condiments: 4 }
      }
    ],
    categories: {
      // --- Items from: A Taste of Italy - Wedding Celebration ---
      custom_italy_mains: {
        title: "Italian Mains (Bespoke Selection)",
        description: "Choose from our exquisite Italian main courses.",
        items: [
          { id: "chicken_saltimbocca_w", name: "Chicken Saltimbocca with Prosciutto & Sage", upcharge: 0 },
          { id: "beef_braciole_w", name: "Slow-Cooked Beef Braciole in Rich Tomato Sauce", upcharge: 5.00 },
          { id: "vegetarian_lasagna_w", name: "Layered Vegetarian Lasagna with Fresh Béchamel", upcharge: 0 },
          { id: "salmon_lemon_dill_w", name: "Pan-Seared Salmon with a Delicate Lemon-Dill Sauce", upcharge: 7.00 },
        ]
      },
      custom_italy_sides: {
        title: "Italian Sides (Bespoke Selection)",
        description: "Choose from our refined Italian side dishes.",
        items: [
          { id: "rosemary_potatoes_w", name: "Roasted Rosemary & Garlic Potatoes", upcharge: 0 },
          { id: "grilled_asparagus_parmesan_w", name: "Grilled Asparagus spears with Shaved Parmesan", upcharge: 0 },
          { id: "risotto_milanese_w", name: "Creamy Saffron Risotto Milanese", upcharge: 3.00 },
          { id: "garlic_broccolini_w", name: "Sautéed Garlic Broccolini with a hint of chili", upcharge: 0 },
        ]
      },
      custom_italy_pasta: {
        title: "Italian Pasta (Bespoke Selection)",
        description: "Indulge in our freshly prepared pasta selections.",
        items: [
          { id: "penne_alla_vodka_w", name: "Penne alla Vodka with a Creamy Tomato Sauce", upcharge: 0 },
          { id: "fettuccine_alfredo_truffle_w", name: "Fettuccine Alfredo enhanced with Black Truffle Oil", upcharge: 4.00 },
          { id: "lobster_ravioli_w", name: "Lobster Ravioli in a Delicate Saffron Cream Sauce", upcharge: 8.00 },
        ]
      },
      custom_italy_salads: {
        title: "Italian Salads (Bespoke Selection)",
        description: "Choose from our vibrant and fresh salad creations.",
        items: [
          { id: "caesar_w", name: "Classic Caesar Salad with Homemade Croutons & Parmesan Crisps", upcharge: 0 },
          { id: "caprese_w", name: "Vine-Ripened Tomato & Fresh Mozzarella Caprese with Balsamic Glaze", upcharge: 0 },
          { id: "arugula_pear_gorgonzola_w", name: "Arugula Salad with Sliced Pear, Gorgonzola, and Candied Walnuts", upcharge: 2.00 },
        ]
      },
      // --- Items from: Elegant Vegan Wedding Feast ---
      custom_vegan_mains: {
        title: "Vegan Mains (Bespoke Selection)",
        description: "Select from our sophisticated vegan main courses.",
        items: [
          { id: "vw_cabbage_rolls", name: "Cabbage Rolls with rice, dried figs, pine nuts, and aromatic herbs" },
          { id: "vw_eggplant_imam", name: "Eggplant Imam Baildi, sumptuously topped with stewed tomato and peppers" },
          { id: "vw_indian_stuffed_peppers", name: "Indian Style Stuffed Peppers with fragrant curried chickpeas" },
          { id: "vw_eggplant_napolean", name: "Eggplant Napolean layered with roasted red peppers" },
          { id: "vw_artichoke_polita", name: "Artichoke Ala Polita with a vibrant lemon tahini sauce" },
          { id: "vw_stuffed_portabella", name: "Stuffed Portabella Mushrooms with hearty stewed lentils" },
          { id: "vw_wild_rice_squash", name: "Wild Rice Stuffed Acorn Squash, a harvest delight" },
          { id: "vw_tofu_vindaloo", name: "Spicy Tofu Vindaloo, full of bold flavors" },
          { id: "vw_greek_stuffed_peppers", name: "Greek Style Stuffed Peppers with aromatic jasmine rice" },
          { id: "vw_vegan_moussaka", name: "Vegan Moussaka with stewed lentils and creamy cauliflower béchamel" },
          { id: "vw_stuffed_poblano", name: "Stuffed Poblano Peppers with savory rice and beans" }
        ]
      },
      custom_vegan_sides: {
        title: "Vegan Sides (Bespoke Selection)",
        description: "Choose your flavorful plant-based side dishes.",
        items: [
          { id: "vw_lemon_potatoes", name: "Roasted Lemon Potatoes with oregano" },
          { id: "vw_green_beans_almondine", name: "Haricots Verts Almondine" },
          { id: "vw_fasolakia", name: "Fasolakia (Greek green beans stewed with tomatoes)" },
          { id: "vw_gigante_beans", name: "Gigante Beans baked in a rich tomato dill sauce" },
          { id: "vw_vegan_dolmades", name: "Dolmades with bulgur, currants, and dried figs" },
          { id: "vw_cannellini_caponata", name: "Cannellini Beans with a sweet & sour caponata" },
          { id: "vw_roasted_brussel_sprouts", name: "Roasted Brussel Sprouts with balsamic glaze" },
          { id: "vw_moroccan_cauliflower", name: "Moroccan-Style Roasted Cauliflower with exotic spices" },
          { id: "vw_tuscan_carrots", name: "Tuscan Glazed Carrots with herbs" },
          { id: "vw_moroccan_wild_rice", name: "Moroccan Wild Rice Pilaf with dried fruits and nuts" },
          { id: "vw_cilantro_lime_rice", name: "Cilantro-Lime Rice, fresh and zesty" },
          { id: "vw_greek_rice_pilaf", name: "Greek Rice Pilaf with fresh herbs" },
          { id: "vw_southwest_spring_rolls", name: "Southwest Style Spring Rolls with a zesty dip" },
          { id: "vw_crispy_falafel", name: "Crispy Falafel with tahini drizzle" }
        ]
      },
      custom_vegan_salads: {
        title: "Vegan Salads (Bespoke Selection)",
        description: "Select from our refreshing and wholesome vegan salads.",
        items: [
          { id: "vw_panzanella", name: "Tuscan Panzanella Bread Salad" },
          { id: "vw_sicilian_fennel", name: "Sicilian Fennel & Orange Salad" },
          { id: "vw_bowtie_pasta", name: "Mediterranean Bowtie Pasta Salad" },
          { id: "vw_tuscan_orzo", name: "Tuscan Orzo Pesto Salad with sun-dried tomatoes" },
          { id: "vw_garden_salad", name: "Fresh Garden Salad with a choice of vegan dressings" },
          { id: "vw_greek_village", name: "Greek Village Salad (Horiatiki) with vegan feta alternative" },
          { id: "vw_asian_slaw", name: "Crunchy Asian Slaw with Mandarin Oranges and sesame ginger dressing" },
          { id: "vw_cucumber_mint", name: "Refreshing Cucumber Mint & Dill Salad" },
          { id: "vw_kale_quinoa", name: "Kale and Quinoa Salad with lemon-tahini dressing" },
          { id: "vw_southwest_bean", name: "Southwest Black Bean & Corn Salad with lime vinaigrette" }
        ]
      },
      // --- Items from: Taco Fiesta Celebration ---
      custom_taco_proteins: {
        title: "Taco Proteins (Bespoke Selection)",
        description: "Choose your succulent protein options.",
        items: [
          { id: "tfw_barbacoa", name: "Slow-Cooked Barbacoa Beef", upcharge: 0 },
          { id: "tfw_flank_steak_fajitas", name: "Sizzling Flank Steak Fajitas", upcharge: 2.00 },
          { id: "tfw_ground_beef", name: "Seasoned Ground Beef Picadillo", upcharge: 0 },
          { id: "tfw_pork_carnitas", name: "Crispy Pork Carnitas", upcharge: 0 },
          { id: "tfw_chorizo", name: "Spicy Chorizo Crumbles", upcharge: 0 },
          { id: "tfw_beef_birria", name: "Rich Beef Birria with Consommé", upcharge: 1.00 },
          { id: "tfw_chicken_tinga", name: "Chipotle Chicken Tinga", upcharge: 0 },
          { id: "tfw_grilled_fish", name: "Grilled Mahi-Mahi with lime", upcharge: 1.50 },
          { id: "tfw_sauteed_shrimp", name: "Garlic-Lime Sautéed Shrimp", upcharge: 2.00 },
          { id: "tfw_spiced_tofu", name: "Adobo Spiced Tofu Crumbles (Vegan)", upcharge: 0 },
          { id: "tfw_roasted_fajita_veg", name: "Colorful Roasted Fajita Vegetables (Vegan)", upcharge: 0 }
        ]
      },
      custom_taco_sides: {
        title: "Taco Sides (Bespoke Selection)",
        description: "Select your delectable side dishes.",
        items: [
          { id: "tfw_refried_beans", name: "Creamy Refried Pinto Beans with cotija", upcharge: 0 },
          { id: "tfw_elotes", name: "Mexican Street Corn (Elotes) off the cob", upcharge: 0 },
          { id: "tfw_queso_dip", name: "Warm Queso Dip with roasted peppers", upcharge: 0 },
          { id: "tfw_chorizo_queso_dip", name: "Chorizo y Queso Fundido", upcharge: 1.00 },
          { id: "tfw_stuffed_poblano", name: "Cheese-Stuffed Poblano Peppers with salsa roja", upcharge: 0 },
          { id: "tfw_mexican_rice", name: "Traditional Mexican Red Rice", upcharge: 0 },
          { id: "tfw_cilantro_lime_rice", name: "Cilantro Lime Rice with toasted pepitas", upcharge: 0 },
          { id: "tfw_black_beans_rice", name: "Cuban-Style Black Beans and Rice", upcharge: 0 },
          { id: "tfw_jalapeno_cornbread", name: "Sweet & Spicy Jalapeño Cornbread Muffins", upcharge: 0 },
          { id: "tfw_grilled_veg_medley", name: "Grilled Vegetable Medley with balsamic glaze", upcharge: 0 },
          { id: "tfw_mango_jicama_slaw", name: "Mango, Jicama & Cabbage Slaw with lime dressing", upcharge: 0 },
          { id: "tfw_veg_empanadas", name: "Mini Vegetarian Empanadas with chimichurri", upcharge: 0 }
        ]
      },
      custom_taco_salsas: {
        title: "Taco Salsas (Bespoke Selection)",
        description: "Choose from our freshly made salsas.",
        items: [
          { id: "tfw_pico_de_gallo", name: "Classic Pico de Gallo (Fresh & Chunky)", upcharge: 0 },
          { id: "tfw_mango_hab_salsa", name: "Sweet & Spicy Mango-Habanero Salsa", upcharge: 0 },
          { id: "tfw_roasted_corn_salsa", name: "Roasted Corn & Black Bean Salsa", upcharge: 0 },
          { id: "tfw_salsa_roja", name: "Smoky Salsa Roja (Roasted Tomato & Chile)", upcharge: 0 },
          { id: "tfw_salsa_verde", name: "Tangy Salsa Verde (Tomatillo & Cilantro)", upcharge: 0 },
          { id: "tfw_avocado_crema", name: "Cool Avocado Crema", upcharge: 0 },
          { id: "tfw_chipotle_salsa", name: "Creamy Chipotle Salsa", upcharge: 0 }
        ]
      },
      custom_taco_condiments: {
        title: "Taco Condiments (Bespoke Selection)",
        description: "Complete your tacos with these essential toppings.",
        items: [
          { id: "tfw_shredded_cheese_blend", name: "Mexican Shredded Cheese Blend", upcharge: 0 },
          { id: "tfw_vegan_cheese", name: "Shredded Vegan Cheddar Alternative", upcharge: 0 },
          { id: "tfw_diced_onions_cilantro", name: "Diced White Onions & Fresh Cilantro Mix", upcharge: 0 },
          { id: "tfw_lime_wedges", name: "Fresh Lime Wedges", upcharge: 0 },
          { id: "tfw_pickled_jalapenos", name: "Pickled Jalapeño Slices", upcharge: 0 },
          { id: "tfw_sour_cream", name: "Cool Sour Cream (or Vegan Alternative)", upcharge: 0 },
          { id: "tfw_fresh_guacamole", name: "Signature Fresh Guacamole", upcharge: 1.00 },
          { id: "tfw_roasted_peppers_onions", name: "Fire-Roasted Bell Peppers & Onions", upcharge: 0 },
          { id: "tfw_sliced_radish", name: "Crisp Sliced Radishes", upcharge: 0 },
          { id: "tfw_cotija_cheese", name: "Crumbled Cotija Cheese", upcharge: 0 },
          { id: "tfw_pickled_red_onions", name: "Tangy Pickled Red Onions", upcharge: 0 },
          { id: "tfw_lettuce_shredded", name: "Shredded Crisp Lettuce", upcharge: 0 }
        ]
      },
      // --- Items from: All-American BBQ Reception ---
      custom_bbq_mains: {
        title: "BBQ Mains (Bespoke Selection)",
        description: "Choose your heartiest BBQ main courses.",
        items: [
          { id: "abw_smoked_brisket", name: "12-Hour Smoked Texas Brisket", upcharge: 3.00 },
          { id: "abw_beef_ribs", name: "Slow-Smoked Beef Ribs", upcharge: 4.00 },
          { id: "abw_flank_steak_chimichurri", name: "Grilled Flank Steak with Zesty Chimichurri", upcharge: 0 },
          { id: "abw_sausage_medley", name: "Artisanal Sausage Medley (e.g., Andouille, Bratwurst)", upcharge: 0 },
          { id: "abw_gourmet_burger_bar", name: "Gourmet Slider Bar (Beef, Chicken, Veggie)", upcharge: 2.50 },
          { id: "abw_herb_lamb_chops", name: "Grilled Herb Lamb Chops", upcharge: 4.00 },
          { id: "abw_pulled_pork", name: "Carolina-Style Pulled Pork", upcharge: 0 },
          { id: "abw_smoked_pork_belly_bites", name: "Smoked Pork Belly Burnt Ends", upcharge: 1.00 },
          { id: "abw_st_louis_ribs", name: "St. Louis Style Baby Back Ribs", upcharge: 0 },
          { id: "abw_bbq_glazed_chicken", name: "Signature BBQ Glazed Chicken Quarters", upcharge: 0 },
          { id: "abw_rotisserie_herb_chicken", name: "Herb Rotisserie Chicken", upcharge: 0 },
          { id: "abw_grilled_prawn_skewers", name: "Jumbo BBQ Prawn Skewers", upcharge: 2.00 },
          { id: "abw_cedar_plank_salmon", name: "Cedar Plank Roasted Salmon with dill", upcharge: 1.50 },
          { id: "abw_bbq_tofu_skewers", name: "Smoky BBQ Tofu Skewers (Vegan)", upcharge: 0 },
          { id: "abw_vegetable_kebabs", name: "Colorful Grilled Vegetable Kebabs (Vegan)", upcharge: 0 },
          { id: "abw_cauliflower_steaks", name: "Grilled Cauliflower Steaks with BBQ rub (Vegan)", upcharge: 0 }
        ]
      },
      custom_bbq_sides: {
        title: "BBQ Sides (Bespoke Selection)",
        description: "Select your favorite down-home side dishes.",
        items: [
          { id: "abw_pit_baked_beans", name: "Smoky Pit Baked Beans with bacon bits", upcharge: 0 },
          { id: "abw_creamy_mac_cheese", name: "Creamy Three-Cheese Mac n' Cheese Bake", upcharge: 0 },
          { id: "abw_loaded_baked_potato_bar", name: "Loaded Baked Potato Bar with all the fixings", upcharge: 1.50 },
          { id: "abw_garlic_herb_mashed", name: "Garlic Herb Mashed Potatoes", upcharge: 0 },
          { id: "abw_crispy_smashed_potatoes", name: "Crispy Mini Smashed Potatoes with rosemary", upcharge: 0 },
          { id: "abw_cheddar_chive_potatoes", name: "Twice Baked Potatoes with Cheddar & Chives", upcharge: 0.75 },
          { id: "abw_grilled_corn_on_cob", name: "Sweet Grilled Corn on the Cob with flavored butters", upcharge: 0 },
          { id: "abw_southern_creamed_corn", name: "Southern Style Creamed Corn", upcharge: 0 },
          { id: "abw_bacon_jalapeno_poppers", name: "Bacon-Wrapped Jalapeño Poppers", upcharge: 0.50 },
          { id: "abw_maple_balsamic_brussels", name: "Roasted Brussels Sprouts with Maple-Balsamic Glaze", upcharge: 0 },
          { id: "abw_buttermilk_cornbread", name: "Classic Buttermilk Cornbread Muffins", upcharge: 0 },
          { id: "abw_cheddar_jalapeno_cornbread", name: "Cheddar Jalapeño Cornbread", upcharge: 0 },
          { id: "abw_grilled_seasonal_veg", name: "Medley of Grilled Seasonal Vegetables", upcharge: 0 },
          { id: "abw_grilled_asparagus_lemon", name: "Grilled Asparagus with Lemon Zest", upcharge: 0 }
        ]
      },
      custom_bbq_salads: {
        title: "BBQ Salads (Bespoke Selection)",
        description: "Choose from our selection of refreshing salads.",
        items: [
          { id: "abw_classic_caesar", name: "Classic Caesar Salad with garlic croutons", upcharge: 0 },
          { id: "abw_creamy_coleslaw", name: "Creamy Country Coleslaw", upcharge: 0 },
          { id: "abw_garden_ranch", name: "Homestyle Garden Salad with buttermilk ranch", upcharge: 0 },
          { id: "abw_summer_pasta_salad", name: "Summer Pasta Salad with fresh vegetables", upcharge: 0 },
          { id: "abw_loaded_corn_salad", name: "Bacon & Jalapeño Loaded Corn Salad", upcharge: 0 },
          { id: "abw_iceberg_wedge_bluecheese", name: "Classic Iceberg Wedge Salad with blue cheese & bacon", upcharge: 0 },
          { id: "abw_cucumber_dill_salad", name: "Refreshing Cucumber Dill Salad", upcharge: 0 },
          { id: "abw_asian_crunch_slaw", name: "Crunchy Asian Slaw with sesame vinaigrette", upcharge: 0 },
          { id: "abw_cobb_salad", name: "Hearty Cobb Salad with traditional toppings", upcharge: 0 },
          { id: "abw_red_potato_salad", name: "Creamy Red Bliss Potato Salad", upcharge: 0 },
          { id: "abw_loaded_macaroni_salad", name: "Loaded Macaroni Salad with cheddar and bacon", upcharge: 0 },
          { id: "abw_seasonal_fruit_platter", name: "Seasonal Fresh Fruit Platter with honey-lime drizzle", upcharge: 0 }
        ]
      },
      custom_bbq_sauces: {
        title: "BBQ Sauces (Bespoke Selection)",
        description: "Select from our house-made BBQ sauces.",
        items: [
          { id: "abw_kansas_city_sweet_smoky", name: "Kansas City Sweet & Smoky BBQ Sauce", upcharge: 0 },
          { id: "abw_carolina_mustard_tang", name: "Carolina Gold Mustard Tang BBQ Sauce", upcharge: 0 },
          { id: "abw_eastern_nc_vinegar", name: "Eastern North Carolina Vinegar Pepper BBQ Sauce", upcharge: 0 },
          { id: "abw_alabama_creamy_white", name: "Alabama Creamy White BBQ Sauce", upcharge: 0 },
          { id: "abw_texas_bold_peppery", name: "Texas Bold & Peppery BBQ Sauce", upcharge: 0 },
          { id: "abw_raspberry_chipotle_bbq", name: "Raspberry Chipotle BBQ Sauce", upcharge: 0 }
        ]
      },
      custom_bbq_condiments: {
        title: "BBQ Condiments (Bespoke Selection)",
        description: "All the fixings for your BBQ feast.",
        items: [
          { id: "abw_ketchup", name: "Classic Tomato Ketchup", upcharge: 0 },
          { id: "abw_stone_ground_mustard", name: "Artisanal Stone Ground Mustard", upcharge: 0 },
          { id: "abw_dijon_mustard", name: "Smooth Dijon Mustard", upcharge: 0 },
          { id: "abw_yellow_mustard", name: "Classic Yellow Mustard", upcharge: 0 },
          { id: "abw_mayonnaise", name: "Creamy Mayonnaise", upcharge: 0 },
          { id: "abw_sweet_pickle_relish", name: "Sweet Pickle Relish", upcharge: 0 },
          { id: "abw_dill_pickle_chips", name: "Crisp Dill Pickle Chips", upcharge: 0 },
          { id: "abw_sliced_red_onions", name: "Thinly Sliced Red Onions", upcharge: 0 }
        ]
      },
      // --- Items from: Grecian Wedding Feast ---
      custom_greece_mains: {
        title: "Greek Mains (Bespoke Selection)",
        description: "Choose your centerpiece Hellenic dishes.",
        items: [
          { id: "tgw_papoutsakia", name: "Papoutsakia (Stuffed Eggplant with savory filling)", upcharge: 0 },
          { id: "tgw_soutzoukakia", name: "Soutzoukakia (Greek meatballs in rich tomato sauce)", upcharge: 0 },
          { id: "tgw_kokinisto", name: "Kokinisto (Slow-cooked beef or lamb in tomato wine sauce)", upcharge: 0 },
          { id: "tgw_kleftiko", name: "Lamb Kleftiko (Slow-roasted lamb with herbs, family style presentation)", upcharge: 5.00 },
          { id: "tgw_pastitsio", name: "Pastitsio (Baked pasta dish with ground meat and béchamel)", upcharge: 0 },
          { id: "tgw_kotopoulo_lemonato", name: "Kotopoulo Lemonato (Roasted lemon herb chicken)", upcharge: 0 },
          { id: "tgw_paidakia", name: "Paidakia (Grilled lamb chops with oregano & lemon)", upcharge: 4.00 },
          { id: "tgw_kotsi_arni", name: "Kotsi Arni (Braised lamb shanks)", upcharge: 2.00 },
          { id: "tgw_moussaka", name: "Classic Moussaka with layers of eggplant, meat, and béchamel", upcharge: 1.00}
        ]
      },
      custom_greece_sides: {
        title: "Greek Sides (Bespoke Selection)",
        description: "Select your flavorful Hellenic accompaniments.",
        items: [
          { id: "tgw_lemon_potatoes", name: "Greek Lemon Potatoes roasted to perfection", upcharge: 0 },
          { id: "tgw_spanakopita_triangles", name: "Spanakopita Triangles (Spinach & feta pastries)", upcharge: 0 },
          { id: "tgw_kritharaki_yiouvetsi", name: "Kritharaki Yiouvetsi (Orzo with tomato sauce)", upcharge: 0 },
          { id: "tgw_fasolakia_ladera", name: "Fasolakia Ladera (Green beans stewed in olive oil & tomato)", upcharge: 0 },
          { id: "tgw_gigandes_plaki", name: "Gigandes Plaki (Baked giant beans in tomato-dill sauce)", upcharge: 0 },
          { id: "tgw_tyrokroketes", name: "Tyrokroketes (Crispy cheese croquettes)", upcharge: 0 },
          { id: "tgw_grilled_halloumi_octopus", name: "Grilled Halloumi & Marinated Octopus Skewers", upcharge: 7.00 },
          { id: "tgw_dolmades_yalantzi", name: "Dolmades Yalantzi (Stuffed grape leaves with rice & herbs)", upcharge: 0.50}
        ]
      },
      custom_greece_salads: {
        title: "Greek Salads (Bespoke Selection)",
        description: "Choose from our vibrant and refreshing salad creations.",
        items: [
          { id: "tgw_horiatiki", name: "Horiatiki Salata (Classic Greek Village Salad)", upcharge: 0 },
          { id: "tgw_lahanosalata", name: "Lahanosalata (Finely shredded cabbage salad with lemon-oil dressing)", upcharge: 0 },
          { id: "tgw_maroulosalata", name: "Maroulosalata (Crisp romaine lettuce salad with dill & spring onions)", upcharge: 0 },
          { id: "tgw_patatosalata", name: "Patatosalata (Greek potato salad with herbs & olive oil)", upcharge: 0 },
          { id: "tgw_dakos", name: "Dakos Salad (Cretan barley rusks with tomato, feta, olives & capers)", upcharge: 0 },
          { id: "tgw_beetroot_salad", name: "Beetroot & Yogurt Salad with Walnuts (Patzarosalata)", upcharge: 0}
        ]
      },
      // --- Items from: Worldly Kebab Soirée ---
      custom_kebab_proteins: {
        title: "Kebab Proteins (Bespoke Selection)",
        description: "Select your succulent skewered protein options.",
        items: [
          { id: "kpw_pork_tenderloin_apricot", name: "Pork Tenderloin & Apricot Kebabs with rosemary glaze", upcharge: 0 },
          { id: "kpw_chicken_lemon_herb", name: "Lemon-Herb Marinated Chicken Kebabs", upcharge: 0 },
          { id: "kpw_beef_tenderloin_pepper", name: "Beef Tenderloin & Bell Pepper Kebabs", upcharge: 1.00 },
          { id: "kpw_lamb_kofta", name: "Spiced Lamb Kofta Kebabs", upcharge: 0.50 },
          { id: "kpw_swordfish_mediterranean", name: "Mediterranean Swordfish Kebabs with olives & capers", upcharge: 1.50 },
          { id: "kpw_garlic_shrimp_skewers", name: "Garlic & Herb Shrimp Skewers", upcharge: 0 },
          { id: "kpw_halloumi_vegetable", name: "Grilled Halloumi & Vegetable Kebabs (Vegetarian)", upcharge: 0},
          { id: "kpw_tofu_satay_skewers", name: "Tofu Satay Skewers with peanut sauce (Vegan)", upcharge: 0}
        ]
      },
      custom_kebab_sides: {
        title: "Kebab Sides (Bespoke Selection)",
        description: "Choose your delicious side dishes.",
        items: [
          { id: "kpw_crispy_falafel", name: "Crispy Falafel Bites", upcharge: 0 },
          { id: "kpw_mini_spanakopita", name: "Mini Spanakopita (Spinach & Feta Puffs)", upcharge: 0 },
          { id: "kpw_stuffed_grape_leaves", name: "Stuffed Grape Leaves (Dolmades)", upcharge: 0 },
          { id: "kpw_saffron_rice_pilaf", name: "Saffron & Almond Rice Pilaf", upcharge: 0 },
          { id: "kpw_wild_rice_cranberry", name: "Wild Rice Pilaf with Cranberries & Pecans", upcharge: 0 },
          { id: "kpw_patatas_bravas_aioli", name: "Patatas Bravas with Smoked Paprika Aioli", upcharge: 0 },
          { id: "kpw_couscous_apricot_almond", name: "Couscous Salad with Apricots, Almonds & Mint", upcharge: 0.50},
          { id: "kpw_roasted_root_vegetables", name: "Medley of Roasted Root Vegetables with herbs", upcharge: 0}
        ]
      },
      custom_kebab_sauces: {
        title: "Kebab Sauces (Bespoke Selection)",
        description: "Select from our house-made sauces to complement your kebabs.",
        items: [
          { id: "kpw_classic_tzatziki", name: "Classic Greek Tzatziki (Cucumber Yogurt Dip)", upcharge: 0 },
          { id: "kpw_smoky_baba_ganoush", name: "Smoky Baba Ganoush (Roasted Eggplant Dip)", upcharge: 0 },
          { id: "kpw_creamy_hummus_tahini", name: "Creamy Hummus with Tahini & Lemon", upcharge: 0 },
          { id: "kpw_muhammara_walnut_pepper", name: "Muhammara (Roasted Red Pepper & Walnut Dip)", upcharge: 0 },
          { id: "kpw_chimichurri_fresh_herb", name: "Argentinian Chimichurri (Fresh Herb & Garlic Sauce)", upcharge: 0 },
          { id: "kpw_romesco_almond_pepper", name: "Spanish Romesco Sauce (Almond & Roasted Pepper)", upcharge: 0 },
          { id: "kpw_cilantro_lime_yogurt", name: "Cilantro-Lime Yogurt Sauce", upcharge: 0},
          { id: "kpw_harissa_aioli_spicy", name: "Spicy Harissa Aioli", upcharge: 0}
        ]
      }
    }
  }
};