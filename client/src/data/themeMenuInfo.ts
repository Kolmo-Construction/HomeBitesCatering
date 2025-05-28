// Import necessary types
export type MenuItem = {
  id: string;
  name: string;
  upcharge?: number;
};

export type MenuCategory = {
  title: string;
  description: string;
  limits?: {
    [packageId: string]: number;
  };
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
  };
};

export type ThemeMenu = {
  title: string;
  description: string;
  customizable?: boolean;
  packages: MenuPackage[];
  categories: {
    [key: string]: MenuCategory;
  };
};

// Main theme menu data structure
export const themeMenuData = {
  vegan_feast: {
    title: "Vegan Menu",
    description: "Plant-based culinary selections for conscious catering",
    packages: [
      {
        id: "bronze_vegan",
        name: "Bronze Vegan Delight",
        price: 30.00,
        description: "Pick 2 Mains, Pick 2 Sides, Pick 1 Salad",
        limits: {
          mains: 2,
          sides: 2,
          salads: 1
        }
      },
      {
        id: "silver_vegan",
        name: "Silver Vegan Collection",
        price: 38.00,
        description: "Pick 3 Mains, Pick 3 Sides, Pick 2 Salads",
        limits: {
          mains: 3,
          sides: 3,
          salads: 2
        }
      },
      {
        id: "gold_vegan",
        name: "Gold Vegan Experience",
        price: 45.00,
        description: "Pick 4 Mains, Pick 4 Sides, Pick 2 Salads",
        limits: {
          mains: 4,
          sides: 4,
          salads: 2
        }
      },
      {
        id: "diamond_vegan",
        name: "Diamond Vegan Extravaganza",
        price: 55.00,
        description: "Pick 5 Mains, Pick 5 Sides, Pick 3 Salads",
        limits: {
          mains: 5,
          sides: 5,
          salads: 3
        }
      }
    ],
    categories: {
      mains: {
        title: "Plant-Based Mains",
        description: "Select your vegan main dishes",
        limits: {
          "bronze_vegan": 2,
          "silver_vegan": 3,
          "gold_vegan": 4,
          "diamond_vegan": 5
        },
        items: [
          { id: "cabbage_rolls", name: "Cabbage rolls with rice, dried figs, pine nuts and herbs", upcharge: 0 },
          { id: "eggplant_imam", name: "Eggplant Imam Baildi- Topped with stewed tomato and peppers", upcharge: 0 },
          { id: "indian_stuffed_peppers", name: "Indian style stuffed Peppers with curried chickpeas", upcharge: 0 },
          { id: "eggplant_napolean", name: "Eggplant Napolean with roasted red peppers", upcharge: 0 },
          { id: "artichoke_polita", name: "Artichoke Ala Polita with lemon tahini sauce", upcharge: 0 },
          { id: "stuffed_portabella", name: "Stuffed Portabella Mushroom with stewed lentils", upcharge: 0 },
          { id: "wild_rice_squash", name: "Wild Rice Stuffed Acorn Squash", upcharge: 0 },
          { id: "tofu_vindaloo", name: "Tofu Vindaloo", upcharge: 0 },
          { id: "greek_stuffed_peppers", name: "Greek style stuffed Peppers with jasmine rice", upcharge: 0 },
          { id: "vegan_moussaka", name: "Vegan Moussaka with stewed lentils and cauliflower", upcharge: 0 },
          { id: "stuffed_poblano", name: "Stuffed Poblano peppers with rice and beans", upcharge: 0 }
        ]
      },
      sides: {
        title: "Plant-Based Sides",
        description: "Select your vegan side dishes",
        limits: {
          "bronze_vegan": 2,
          "silver_vegan": 3,
          "gold_vegan": 4,
          "diamond_vegan": 5
        },
        items: [
          { id: "lemon_potatoes", name: "Lemon Potatoes", upcharge: 0 },
          { id: "green_beans_almondine", name: "Green Beans Almondine", upcharge: 0 },
          { id: "fasolakia", name: "Fasolakia", upcharge: 0 },
          { id: "gigante_beans", name: "Gigante Beans", upcharge: 0 },
          { id: "vegan_dolmades", name: "Dolmades with bulgur and dried figs", upcharge: 0 },
          { id: "cannellini_caponata", name: "Cannellini Beans with caponata", upcharge: 0 },
          { id: "roasted_brussel_sprouts", name: "Roasted Brussel Sprouts with balsamic", upcharge: 0 },
          { id: "moroccan_cauliflower", name: "Moroccan-style roasted Cauliflower", upcharge: 0 },
          { id: "tuscan_carrots", name: "Tuscan carrots", upcharge: 0 },
          { id: "moroccan_wild_rice", name: "Moroccan wild rice", upcharge: 0 },
          { id: "cilantro_lime_rice", name: "Cilantro-Lime rice", upcharge: 0 },
          { id: "greek_rice_pilaf", name: "Greek rice pilaf", upcharge: 0 },
          { id: "southwest_spring_rolls", name: "Southwest style Spring Rolls", upcharge: 0 },
          { id: "crispy_falafel", name: "Crispy Falafel", upcharge: 0 }
        ]
      },
      salads: {
        title: "Plant-Based Salads",
        description: "Select your vegan salads",
        limits: {
          "bronze_vegan": 1,
          "silver_vegan": 2,
          "gold_vegan": 2,
          "diamond_vegan": 3
        },
        items: [
          { id: "panzanella", name: "Panzanella Bread Salad", upcharge: 0 },
          { id: "sicilian_fennel", name: "Sicilian Fennel Salad", upcharge: 0 },
          { id: "bowtie_pasta", name: "Bowtie Pasta Salad", upcharge: 0 },
          { id: "tuscan_orzo", name: "Tuscan Orzo Pesto Salad", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad", upcharge: 0 },
          { id: "greek_village", name: "Greek Village Salad", upcharge: 0 },
          { id: "asian_slaw", name: "Asian Slaw with Mandarin Oranges", upcharge: 0 },
          { id: "cucumber_mint", name: "Cucumber Mint Salad", upcharge: 0 },
          { id: "kale_quinoa", name: "Kale and Quinoa Salad", upcharge: 0 },
          { id: "southwest_bean", name: "Southwest Bean Salad", upcharge: 0 }
        ]
      }
    }
  },
  taste_of_italy: {
    title: "A Taste of Italy",
    description: "Traditional Italian cuisine with rich flavors",
    packages: [
      {
        id: "bronze",
        name: "Bronze Package",
        price: 32.00,
        description: "Pick 2 Mains, Pick 3 Sides, Pick 1 Pasta, Pick 1 Salad",
        limits: {
          mains: 2,
          sides: 3,
          pasta: 1,
          salads: 1
        }
      },
      {
        id: "silver",
        name: "Silver Package",
        price: 38.00,
        description: "Pick 3 Mains, Pick 3 Sides, Pick 2 Pasta, Pick 2 Salads",
        limits: {
          mains: 3,
          sides: 3,
          pasta: 2,
          salads: 2
        }
      },
      {
        id: "gold",
        name: "Gold Package",
        price: 45.00,
        description: "Pick 3 Mains, Pick 4 Sides, Pick 2 Pasta, Pick 2 Salads",
        limits: {
          mains: 3,
          sides: 4,
          pasta: 2,
          salads: 2
        }
      }
    ],
    categories: {
      mains: {
        title: "Italian Mains",
        description: "Select your main dishes",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 3
        },
        items: [
          { id: "chicken_saltimbocca", name: "Chicken Saltimbocca", upcharge: 0 },
          { id: "chicken_florentine", name: "Chicken Florentine", upcharge: 0 },
          { id: "chicken_piccata", name: "Chicken Piccata", upcharge: 0 },
          { id: "chicken_cacciatore", name: "Chicken Cacciatore", upcharge: 0 },
          { id: "chicken_parmesan_white", name: "Chicken Parmesan White", upcharge: 0 },
          { id: "chicken_parmesan_red", name: "Chicken Parmesan Red", upcharge: 0 },
          { id: "beef_pizzaiola", name: "Beef Pizzaiola", upcharge: 0 },
          { id: "beef_braciole", name: "Beef Braciole", upcharge: 0 },
          { id: "lasagna", name: "Lasagna", upcharge: 0 },
          { id: "italian_meatballs", name: "Italian Meatballs", upcharge: 0 },
          { id: "vegetarian_lasagna", name: "Vegetarian Lasagna", upcharge: 0 }
        ]
      },
      sides: {
        title: "Italian Sides",
        description: "Select your side dishes",
        limits: {
          "bronze": 3,
          "silver": 3,
          "gold": 4
        },
        items: [
          { id: "garlic_broccoli", name: "Garlic Broccoli", upcharge: 0 },
          { id: "garlic_green_beans", name: "Garlic Green Beans", upcharge: 0 },
          { id: "italian_vegetables", name: "Italian Vegetables", upcharge: 0 },
          { id: "grilled_asparagus", name: "Grilled Asparagus", upcharge: 0 },
          { id: "eggplant_caponata", name: "Eggplant Caponata", upcharge: 0 },
          { id: "risotto", name: "Risotto", upcharge: 0 },
          { id: "garlic_bread", name: "Garlic Bread", upcharge: 0 },
          { id: "rosemary_potatoes", name: "Rosemary Potatoes", upcharge: 0 }
        ]
      },
      pasta: {
        title: "Italian Pasta",
        description: "Select your pasta dishes",
        limits: {
          "bronze": 1,
          "silver": 2,
          "gold": 2
        },
        items: [
          { id: "spaghetti_bolognese", name: "Spaghetti Bolognese", upcharge: 0 },
          { id: "fettuccine_alfredo", name: "Fettuccine Alfredo", upcharge: 0 },
          { id: "penne_alla_vodka", name: "Penne alla Vodka", upcharge: 0 },
          { id: "linguine_vongole", name: "Linguine Vongole", upcharge: 0 },
          { id: "ravioli", name: "Ravioli", upcharge: 0 },
          { id: "spaghetti_carbonara", name: "Spaghetti Carbonara", upcharge: 0 },
          { id: "gnocchi", name: "Gnocchi", upcharge: 0 }
        ]
      },
      salads: {
        title: "Italian Salads",
        description: "Select your salads",
        limits: {
          "bronze": 1,
          "silver": 2,
          "gold": 2
        },
        items: [
          { id: "caesar", name: "Caesar Salad", upcharge: 0 },
          { id: "caprese", name: "Caprese Salad", upcharge: 0 },
          { id: "italian_cobb", name: "Tossed Italian Cobb Salad", upcharge: 0 },
          { id: "antipasto", name: "Antipasto Salad", upcharge: 0 },
          { id: "panzanella", name: "Panzanella Salad", upcharge: 0 }
        ]
      }
    }
  },
  custom_menu: {
    title: "Custom Menu - Flexible Selection",
    description: "Build your own menu by selecting items from different cuisine styles",
    customizable: true,
    packages: [
      {
        id: "custom",
        name: "Custom Package",
        price: 35.00,
        description: "Flexible pricing based on selections",
        minGuestCount: 0,
        limits: {
          mains: 3,
          sides: 3,
          salads: 2,
          proteins: 3
        }
      }
    ],
    categories: {
      // Taco Fiesta - Custom
      taco_proteins: {
        title: "Taco Fiesta - Proteins",
        description: "Select protein options from our Mexican offerings",
        limits: {},
        items: [
          { id: "barbacoa", name: "Barbacoa", upcharge: 0 },
          { id: "flank_steak_fajitas", name: "Flank steak Fajitas", upcharge: 2.00 },
          { id: "ground_beef", name: "Ground Beef", upcharge: 0 },
          { id: "pork_carnitas", name: "Pork Carnitas", upcharge: 0 },
          { id: "chorizo", name: "Chorizo", upcharge: 0 },
          { id: "beef_birria", name: "Beef Birria", upcharge: 0 },
          { id: "mexican_chicken", name: "Mexican Chicken", upcharge: 0 },
          { id: "cod", name: "Cod", upcharge: 0 },
          { id: "shrimp", name: "Shrimp", upcharge: 0 },
          { id: "tofu", name: "Tofu", upcharge: 0 },
          { id: "roasted_vegetables", name: "Roasted Vegetables", upcharge: 0 }
        ]
      },
      taco_sides: {
        title: "Taco Fiesta - Sides",
        description: "Select side dishes from our Mexican offerings",
        limits: {},
        items: [
          { id: "refried_beans", name: "Refried Beans", upcharge: 0 },
          { id: "mexican_street_corn", name: "Mexican Street corn (Elotes)", upcharge: 0 },
          { id: "queso_dip", name: "Queso Dip", upcharge: 0 },
          { id: "chorizo_queso_dip", name: "Chorizo Queso Dip", upcharge: 0 },
          { id: "stuffed_poblano_peppers", name: "Stuffed Poblano peppers", upcharge: 0 },
          { id: "mexican_rice", name: "Mexican Rice", upcharge: 0 },
          { id: "cilantro_lime_rice", name: "Cilantro Lime Rice", upcharge: 0 },
          { id: "rice_and_beans", name: "Rice and Beans", upcharge: 0 },
          { id: "jalapeno_cornbread", name: "Jalapeno cornbread", upcharge: 0 },
          { id: "grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 },
          { id: "mexican_slaw_mango", name: "Mexican Slaw with Mango", upcharge: 0 },
          { id: "vegetarian_empanadas", name: "Vegetarian Empanadas", upcharge: 0 }
        ]
      },
      taco_salsas: {
        title: "Taco Fiesta - Salsas",
        description: "Select salsas from our Mexican offerings",
        limits: {},
        items: [
          { id: "pico_de_gallo", name: "Classic Pico de Gallo", upcharge: 0 },
          { id: "mango_salsa", name: "Fresh Mango Salsa", upcharge: 0 },
          { id: "pineapple_habanero", name: "Pineapple Habanero Salsa", upcharge: 0 },
          { id: "cucumber_apple", name: "Cucumber & Apple Salsa", upcharge: 0 },
          { id: "salsa_roja", name: "Salsa Roja (red sauce)", upcharge: 0 },
          { id: "salsa_verde", name: "Salsa Verde (green sauce)", upcharge: 0 },
          { id: "creamy_salsa_verde", name: "Creamy Salsa Verde (green sauce)", upcharge: 0 }
        ]
      },
      taco_condiments: {
        title: "Taco Fiesta - Condiments",
        description: "Select condiments from our Mexican offerings",
        limits: {},
        items: [
          { id: "shredded_cheese", name: "Shredded cheese", upcharge: 0 },
          { id: "shredded_vegan_cheese", name: "Shredded vegan cheese", upcharge: 0 },
          { id: "diced_onions", name: "Diced Onions", upcharge: 0 },
          { id: "lime_wedges", name: "Lime wedges", upcharge: 0 },
          { id: "jalapenos", name: "Jalapeños", upcharge: 0 },
          { id: "sour_cream", name: "Sour Cream", upcharge: 0 },
          { id: "diced_bell_peppers", name: "Diced bell peppers", upcharge: 0 },
          { id: "guacamole", name: "Guacamole", upcharge: 0 },
          { id: "fire_roasted_bell_peppers", name: "Fire roasted bell peppers", upcharge: 0 },
          { id: "sliced_radish", name: "Sliced radish", upcharge: 0 },
          { id: "cilantro", name: "Cilantro", upcharge: 0 },
          { id: "pickled_cabbage", name: "Pickled cabbage", upcharge: 0 }
        ]
      },

      // American BBQ - Custom
      bbq_mains: {
        title: "American BBQ - Mains",
        description: "Select main dishes from our American BBQ offerings",
        limits: {},
        items: [
          { id: "smoked_brisket", name: "Smoked Brisket", upcharge: 3.00 },
          { id: "beef_ribs", name: "Beef Ribs", upcharge: 4.00 },
          { id: "flank_steak_chimichurri", name: "Flank Steak with Chimichurri", upcharge: 0 },
          { id: "sausage_medley", name: "Sausage Medley", upcharge: 0 },
          { id: "hamburger_bar", name: "Hamburger Bar", upcharge: 2.50 },
          { id: "lamb_chops", name: "Lamb Chops", upcharge: 4.00 },
          { id: "smoked_leg_lamb", name: "Smoked Leg of Lamb (Family Style only)", upcharge: 0 },
          { id: "pulled_pork", name: "Pulled Pork", upcharge: 0 },
          { id: "smoked_pork_belly", name: "Smoked pork Belly", upcharge: 0 },
          { id: "baby_back_ribs", name: "Baby Back Ribs", upcharge: 0 },
          { id: "bbq_guiness_chicken", name: "BBQ Guiness Chicken", upcharge: 0 },
          { id: "carolina_bbq_chicken", name: "Carolina BBQ Chicken", upcharge: 0 },
          { id: "rotisserie_chicken", name: "Rotisserie Chicken", upcharge: 0 },
          { id: "bbq_prawns", name: "BBQ Prawns", upcharge: 2.00 },
          { id: "salmon_steak", name: "Salmon steak", upcharge: 0 },
          { id: "tofu", name: "Tofu", upcharge: 0 },
          { id: "vegetable_kebabs", name: "Vegetable kebabs", upcharge: 0 },
          { id: "cauliflower_steaks", name: "Grilled Cauliflower Steaks", upcharge: 0 }
        ]
      },
      bbq_sides: {
        title: "American BBQ - Sides",
        description: "Select side dishes from our American BBQ offerings",
        limits: {},
        items: [
          { id: "ham_hock_baked_beans", name: "Ham hock baked Beans", upcharge: 0 },
          { id: "avocado_deviled_eggs", name: "Avocado deviled Eggs", upcharge: 0 },
          { id: "mac_n_cheese", name: "Mac n' Cheese", upcharge: 0 },
          { id: "stuffed_poblano", name: "Stuffed Poblano peppers", upcharge: 0 },
          { id: "baked_potato_bar", name: "Baked Potato Bar", upcharge: 1.50 },
          { id: "garlic_mashed_potatoes", name: "Garlic Mashed Potatoes", upcharge: 0 },
          { id: "mini_smashed_potatoes", name: "Mini Smashed Potatoes", upcharge: 0 },
          { id: "twice_baked_potatoes", name: "Twice Baked Potatoes", upcharge: 0.75 },
          { id: "corn_on_the_cob", name: "Corn on the Cob", upcharge: 0 },
          { id: "creamed_corn", name: "Creamed Corn", upcharge: 0 },
          { id: "jalapeno_poppers", name: "Jalapeño Poppers", upcharge: 0 },
          { id: "roasted_brussels", name: "Roasted Brussels Sprouts", upcharge: 0 },
          { id: "corn_bread", name: "Corn Bread", upcharge: 0 },
          { id: "jalapeno_cornbread", name: "Jalapeno cornbread", upcharge: 0 },
          { id: "grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 },
          { id: "grilled_asparagus", name: "Grilled Asparagus", upcharge: 0 }
        ]
      },
      bbq_salads: {
        title: "American BBQ - Salads",
        description: "Select salads from our American BBQ offerings",
        limits: {},
        items: [
          { id: "caesar", name: "Caesar", upcharge: 0 },
          { id: "coleslaw", name: "Coleslaw", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad", upcharge: 0 },
          { id: "pasta_salad", name: "Pasta Salad", upcharge: 0 },
          { id: "bacon_jalapeno_corn", name: "Bacon Jalapeño Corn Salad", upcharge: 0 },
          { id: "wedge_salad", name: "Wedge Salad", upcharge: 0 },
          { id: "german_cucumber", name: "German cucumber salad", upcharge: 0 },
          { id: "asian_slaw", name: "Crunchy Asian Slaw", upcharge: 0 },
          { id: "tossed_cobb", name: "Tossed Cobb", upcharge: 0 },
          { id: "potato_salad", name: "Classic Potato Salad", upcharge: 0 },
          { id: "german_potato", name: "German Potato Salad", upcharge: 0 },
          { id: "macaroni_salad", name: "Macaroni Salad", upcharge: 0 },
          { id: "hawaiian_macaroni", name: "Hawaiian Macaroni Salad", upcharge: 0 },
          { id: "fruit_salad", name: "Fruit Salad", upcharge: 0 }
        ]
      },

      // Greek Menu Items
      greek_mains: {
        title: "Greek - Mains",
        description: "Select main dishes from our Greek offerings",
        limits: {},
        items: [
          { id: "papoutsakia", name: "Papoutsakia", upcharge: 0 },
          { id: "soutzoukakia", name: "Soutzoukakia", upcharge: 0 },
          { id: "kokinisto", name: "Kokinisto", upcharge: 0 },
          { id: "kleftiko", name: "Kleftiko (Family style only)", upcharge: 5.00 },
          { id: "pastitsio", name: "Pastitsio", upcharge: 0 },
          { id: "kotopoulo_lemonato", name: "Kotopoulo lemonato", upcharge: 0 },
          { id: "paidakia", name: "Paidakia", upcharge: 4.00 },
          { id: "kotsi_arni", name: "Kotsi Arni", upcharge: 0 },
          { id: "bifteki_gemisto", name: "Bifteki Gemisto", upcharge: 0 },
          { id: "psari_plaki", name: "Psari Plaki", upcharge: 0 },
          { id: "brizola_solomou", name: "Brizola Solomou", upcharge: 0 },
          { id: "bakaliaros_plaki", name: "Bakaliaros Plaki", upcharge: 0 },
          { id: "aginares_vegan", name: "Aginares -Ala Polita - Vegan", upcharge: 0 },
          { id: "gemista_vegan", name: "Gemista - Vegan", upcharge: 0 }
        ]
      },
      greek_sides: {
        title: "Greek - Sides",
        description: "Select side dishes from our Greek offerings",
        limits: {},
        items: [
          { id: "lemon_potatoes", name: "Lemon Potatoes", upcharge: 0 },
          { id: "spanakopita", name: "Spanakopita", upcharge: 0 },
          { id: "kritharaki", name: "Kritharaki", upcharge: 0 },
          { id: "fasolakia", name: "Fasolakia", upcharge: 0 },
          { id: "gigandes_plaki", name: "Gigandes Plaki", upcharge: 0 },
          { id: "tyrokroketes", name: "Tyrokroketes", upcharge: 0 },
          { id: "octapodi", name: "Octapodi (Spanish octopus)", upcharge: 7.00 },
          { id: "dolmades", name: "Dolmades", upcharge: 0 },
          { id: "saganaki_cheese", name: "Saganaki Cheese (Family style only)", upcharge: 2.00 },
          { id: "greek_rice_pilaf", name: "Greek Rice Pilaf", upcharge: 0 },
          { id: "baked_vegetables", name: "Baked Vegetables- Briam", upcharge: 0 }
        ]
      },

      // Kebab Party Menu Items
      kebab_proteins: {
        title: "Kebab Party - Proteins",
        description: "Select protein options for kebabs",
        limits: {},
        items: [
          { id: "pork_tenderloin", name: "Pork Tenderloin", upcharge: 0 },
          { id: "chicken", name: "Chicken", upcharge: 0 },
          { id: "beef_tenderloin", name: "Beef Tenderloin", upcharge: 0 },
          { id: "beef_flank", name: "Beef Flank", upcharge: 0 },
          { id: "lamb", name: "Lamb", upcharge: 0 },
          { id: "swordfish", name: "Swordfish", upcharge: 0 },
          { id: "shrimp", name: "Shrimp", upcharge: 0 },
          { id: "bacon_wrapped_asparagus", name: "Bacon wrapped Asparagus", upcharge: 0 },
          { id: "tofu", name: "Tofu", upcharge: 0 },
          { id: "mushrooms", name: "Mushrooms", upcharge: 0 },
          { id: "tomato_gnocchi", name: "Tomato & Gnocchi- with pesto", upcharge: 0 },
          { id: "mixed_vegetables", name: "Mixed Vegetables", upcharge: 0 }
        ]
      },
      kebab_sides: {
        title: "Kebab Party - Sides",
        description: "Select side dishes for your kebab menu",
        limits: {},
        items: [
          { id: "falafel", name: "Falafel", upcharge: 0 },
          { id: "spanakopita", name: "Spanakopita", upcharge: 0 },
          { id: "dolmades", name: "Dolmades", upcharge: 0 },
          { id: "yellow_rice_pilaf", name: "Yellow Rice Pilaf", upcharge: 0 },
          { id: "wild_rice_mushroom_pilaf", name: "Wild Rice and Mushroom Pilaf", upcharge: 0 },
          { id: "patatas_bravas", name: "Patatas Bravas", upcharge: 0 },
          { id: "potato_croquettes", name: "Potato Croquettes", upcharge: 0 },
          { id: "roasted_beets", name: "Roasted beets", upcharge: 0 },
          { id: "roasted_brussel_sprouts", name: "Roasted Brussel Sprouts", upcharge: 0 },
          { id: "moroccan_cauliflower", name: "Morrocan-style roasted Cauliflower", upcharge: 0 },
          { id: "roasted_carrots", name: "Roasted carrots", upcharge: 0 },
          { id: "grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 }
        ]
      },
      kebab_salads: {
        title: "Kebab Party - Salads",
        description: "Select salads for your kebab menu",
        limits: {},
        items: [
          { id: "tabouli", name: "Tabouli", upcharge: 0 },
          { id: "fattoush", name: "Fattoush", upcharge: 0 },
          { id: "cous_cous", name: "Cous-cous", upcharge: 0 },
          { id: "lebanese_potato", name: "Lebanese Potato Salad", upcharge: 0 },
          { id: "greek_village", name: "Greek Village Salad", upcharge: 0 },
          { id: "tomato_cucumber", name: "Tomato - Cucumber salad", upcharge: 0 },
          { id: "caprese_pasta", name: "Caprese pasta salad", upcharge: 0 },
          { id: "caesar", name: "Caesar", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad", upcharge: 0 }
        ]
      },

      // Italian Menu Items
      italian_mains: {
        title: "Italian - Mains",
        description: "Select main dishes from our Italian offerings",
        limits: {},
        items: [
          { id: "chicken_saltimbocca", name: "Chicken Saltimbocca", upcharge: 0 },
          { id: "chicken_florentine", name: "Chicken Florentine", upcharge: 0 },
          { id: "chicken_piccata", name: "Chicken Piccata", upcharge: 0 },
          { id: "chicken_cacciatore", name: "Chicken Cacciatore", upcharge: 0 },
          { id: "chicken_parmesan_white", name: "Chicken parmesan White", upcharge: 0 },
          { id: "chicken_parmesan_red", name: "Chicken Parmesan Red", upcharge: 0 },
          { id: "chicken_marsala", name: "Chicken Marsala", upcharge: 0 },
          { id: "chicken_puttanesca", name: "Chicken Puttanesca", upcharge: 0 },
          { id: "beef_pizzaiola", name: "Beef Pizzaiola", upcharge: 0 },
          { id: "beef_braciole", name: "Beef Braciole", upcharge: 0 },
          { id: "lasagna", name: "Lasagna", upcharge: 0 },
          { id: "osso_bucco", name: "Osso Bucco", upcharge: 8.00 },
          { id: "brasato_al_barolo", name: "Brasato Al Barolo", upcharge: 0 },
          { id: "italian_meatballs", name: "Italian Meatballs", upcharge: 0 },
          { id: "vegetarian_lasagna", name: "Vegetarian Lasagna", upcharge: 0 },
          { id: "spinach_ricotta_cannelloni", name: "Spinach and Ricotta Cannelloni", upcharge: 0 }
        ]
      },
      italian_sides: {
        title: "Italian - Sides",
        description: "Select side dishes from our Italian offerings",
        limits: {},
        items: [
          { id: "rosemary_potatoes", name: "Rosemary roasted Potatoes", upcharge: 0 },
          { id: "green_beans_almondine", name: "Green Beans Almondine", upcharge: 0 },
          { id: "baked_cauliflower", name: "Baked Cauliflower with bechamel and Parmesan", upcharge: 0 },
          { id: "asiago_zucchini", name: "Asiago Zucchini bites", upcharge: 0 },
          { id: "eggplant_parmesan", name: "Eggplant Parmesan", upcharge: 0 },
          { id: "cannellini_caponata", name: "Cannellini Beans with caponata", upcharge: 0 },
          { id: "peas_pancetta", name: "Peas with Pancetta", upcharge: 0 },
          { id: "tuscan_carrots", name: "Tuscan Roasted Carrots", upcharge: 0 }
        ]
      },
      italian_pasta: {
        title: "Italian - Pasta",
        description: "Select pasta options from our Italian offerings",
        limits: {},
        items: [
          { id: "penne_butter", name: "Penne Pasta with butter", upcharge: 0 },
          { id: "penne_pesto", name: "Penne Pasta with Pesto", upcharge: 0 },
          { id: "penne_marinara", name: "Penne Pasta with Marinara", upcharge: 0 },
          { id: "rigatoni_butter", name: "Rigatoni with butter", upcharge: 0 },
          { id: "rigatoni_pesto", name: "Rigatoni with Pesto", upcharge: 0 },
          { id: "rigatoni_marinara", name: "Rigatoni with Marinara", upcharge: 0 },
          { id: "conchiglie_butter", name: "Conchiglie with butter", upcharge: 0 },
          { id: "conchiglie_pesto", name: "Conchiglie with Pesto", upcharge: 0 },
          { id: "conchiglie_marinara", name: "Conchiglie with Marinara", upcharge: 0 }
        ]
      },
      italian_salads: {
        title: "Italian - Salads",
        description: "Select salads from our Italian offerings",
        limits: {},
        items: [
          { id: "caprese_avocado", name: "Caprese Stuffed Avocado", upcharge: 0 },
          { id: "panzanella", name: "Panzanella Bread Salad", upcharge: 0 },
          { id: "italian_cobb", name: "Tossed Italian Cobb Salad", upcharge: 0 },
          { id: "sicilian_fennel", name: "Sicilian Fennel Salad", upcharge: 0 },
          { id: "rigatoni_pesto_salad", name: "Rigatoni with Pesto", upcharge: 0 },
          { id: "roasted_beets_burrata", name: "Roasted Beets with Burrata", upcharge: 0 },
          { id: "caprese", name: "Caprese", upcharge: 0 },
          { id: "pasta_salad", name: "Pasta Salad", upcharge: 0 },
          { id: "tuscan_orzo", name: "Tuscan Orzo Pesto Salad", upcharge: 0 }
        ]
      },

      // Vegan Menu Items
      vegan_mains: {
        title: "Vegan - Mains",
        description: "Select plant-based main dishes",
        limits: {},
        items: [
          { id: "cabbage_rolls", name: "Cabbage rolls with rice, dried figs, pine nuts and herbs", upcharge: 0 },
          { id: "eggplant_imam", name: "Eggplant Imam Baildi- Topped with stewed tomato and peppers", upcharge: 0 },
          { id: "indian_stuffed_peppers", name: "Indian style stuffed Peppers with curried chickpeas", upcharge: 0 },
          { id: "eggplant_napolean", name: "Eggplant Napolean with roasted red peppers", upcharge: 0 },
          { id: "artichoke_polita", name: "Artichoke Ala Polita with lemon tahini sauce", upcharge: 0 },
          { id: "stuffed_portabella", name: "Stuffed Portabella Mushroom with stewed lentils", upcharge: 0 },
          { id: "wild_rice_squash", name: "Wild Rice Stuffed Acorn Squash", upcharge: 0 },
          { id: "tofu_vindaloo", name: "Tofu Vindaloo", upcharge: 0 },
          { id: "greek_stuffed_peppers", name: "Greek style stuffed Peppers with jasmine rice", upcharge: 0 },
          { id: "vegan_moussaka", name: "Vegan Moussaka with stewed lentils and cauliflower", upcharge: 0 },
          { id: "stuffed_poblano", name: "Stuffed Poblano peppers with rice and beans", upcharge: 0 }
        ]
      },
      vegan_sides: {
        title: "Vegan - Sides",
        description: "Select plant-based side dishes",
        limits: {},
        items: [
          { id: "lemon_potatoes", name: "Lemon Potatoes", upcharge: 0 },
          { id: "green_beans_almondine", name: "Green Beans Almondine", upcharge: 0 },
          { id: "fasolakia", name: "Fasolakia", upcharge: 0 },
          { id: "gigante_beans", name: "Gigante Beans", upcharge: 0 },
          { id: "vegan_dolmades", name: "Dolmades with bulgur and dried figs", upcharge: 0 },
          { id: "cannellini_caponata", name: "Cannellini Beans with caponata", upcharge: 0 },
          { id: "roasted_brussel_sprouts", name: "Roasted Brussel Sprouts with balsamic", upcharge: 0 },
          { id: "moroccan_cauliflower", name: "Moroccan-style roasted Cauliflower", upcharge: 0 },
          { id: "tuscan_carrots", name: "Tuscan carrots", upcharge: 0 },
          { id: "moroccan_wild_rice", name: "Moroccan wild rice", upcharge: 0 },
          { id: "cilantro_lime_rice", name: "Cilantro-Lime rice", upcharge: 0 },
          { id: "greek_rice_pilaf", name: "Greek rice pilaf", upcharge: 0 },
          { id: "southwest_spring_rolls", name: "Southwest style Spring Rolls", upcharge: 0 },
          { id: "crispy_falafel", name: "Crispy Falafel", upcharge: 0 }
        ]
      },
      vegan_salads: {
        title: "Vegan - Salads",
        description: "Select plant-based salads",
        limits: {},
        items: [
          { id: "panzanella", name: "Panzanella Bread Salad", upcharge: 0 },
          { id: "sicilian_fennel", name: "Sicilian Fennel Salad", upcharge: 0 },
          { id: "bowtie_pasta", name: "Bowtie Pasta Salad", upcharge: 0 },
          { id: "tuscan_orzo", name: "Tuscan Orzo Pesto Salad", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad", upcharge: 0 },
          { id: "greek_village", name: "Greek Village Salad", upcharge: 0 },
          { id: "tomato_cucumber", name: "Tomato - Cucumber salad", upcharge: 0 },
          { id: "tabouli", name: "Tabouli", upcharge: 0 },
          { id: "lebanese_potato", name: "Lebanese Potato Salad", upcharge: 0 }
        ]
      }
    }
  },

  taco_fiesta: {
    title: "Taco Fiesta",
    description: "A festive Mexican-inspired menu perfect for casual gatherings and celebrations",
    packages: [
      {
        id: "bronze",
        name: "Bronze Package",
        price: 32.00,
        description: "Basic taco bar setup",
        minGuestCount: 0,
        limits: {
          proteins: 2,
          sides: 2,
          salsas: 2,
          condiments: 3
        }
      },
      {
        id: "silver",
        name: "Silver Package",
        price: 37.00,
        description: "Enhanced taco bar with more variety",
        minGuestCount: 0,
        limits: {
          proteins: 3,
          sides: 3,
          salsas: 3,
          condiments: 5
        }
      },
      {
        id: "gold",
        name: "Gold Package",
        price: 45.00,
        description: "Premium taco bar with maximum variety",
        minGuestCount: 0,
        limits: {
          proteins: 4,
          sides: 4,
          salsas: 4,
          condiments: 8
        }
      },
      {
        id: "diamond",
        name: "Diamond Package",
        price: 55.00,
        description: "Ultimate taco bar experience with maximum selection and premium options",
        minGuestCount: 0,
        limits: {
          proteins: 5,
          sides: 5,
          salsas: 5,
          condiments: 10
        }
      }
    ],
    categories: {
      proteins: {
        title: "Proteins",
        description: "Select your protein options",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "barbacoa", name: "Barbacoa", upcharge: 0 },
          { id: "flank_steak_fajitas", name: "Flank steak Fajitas", upcharge: 2.00 },
          { id: "ground_beef", name: "Ground Beef", upcharge: 0 },
          { id: "pork_carnitas", name: "Pork Carnitas", upcharge: 0 },
          { id: "chorizo", name: "Chorizo", upcharge: 0 },
          { id: "beef_birria", name: "Beef Birria", upcharge: 0 },
          { id: "mexican_chicken", name: "Mexican Chicken", upcharge: 0 },
          { id: "cod", name: "Cod", upcharge: 0 },
          { id: "shrimp", name: "Shrimp", upcharge: 0 },
          { id: "tofu", name: "Tofu", upcharge: 0 },
          { id: "roasted_vegetables", name: "Roasted Vegetables", upcharge: 0 }
        ]
      },
      sides: {
        title: "Sides",
        description: "Select your desired side dishes",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "refried_beans", name: "Refried Beans", upcharge: 0 },
          { id: "mexican_street_corn", name: "Mexican Street corn (Elotes)", upcharge: 0 },
          { id: "queso_dip", name: "Queso Dip", upcharge: 0 },
          { id: "chorizo_queso_dip", name: "Chorizo Queso Dip", upcharge: 0 },
          { id: "stuffed_poblano_peppers", name: "Stuffed Poblano peppers", upcharge: 0 },
          { id: "mexican_rice", name: "Mexican Rice", upcharge: 0 },
          { id: "cilantro_lime_rice", name: "Cilantro Lime Rice", upcharge: 0 },
          { id: "rice_and_beans", name: "Rice and Beans", upcharge: 0 },
          { id: "jalapeno_cornbread", name: "Jalapeno cornbread", upcharge: 0 },
          { id: "grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 },
          { id: "mexican_slaw_mango", name: "Mexican Slaw with Mango", upcharge: 0 },
          { id: "vegetarian_empanadas", name: "Vegetarian Empanadas", upcharge: 0 }
        ]
      },
      salsas: {
        title: "Salsas",
        description: "Select your desired salsas",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "pico_de_gallo", name: "Classic Pico de Gallo", upcharge: 0 },
          { id: "mango_salsa", name: "Fresh Mango Salsa", upcharge: 0 },
          { id: "pineapple_habanero", name: "Pineapple Habanero Salsa", upcharge: 0 },
          { id: "cucumber_apple", name: "Cucumber & Apple Salsa", upcharge: 0 },
          { id: "salsa_roja", name: "Salsa Roja (red sauce)", upcharge: 0 },
          { id: "salsa_verde", name: "Salsa Verde (green sauce)", upcharge: 0 },
          { id: "creamy_salsa_verde", name: "Creamy Salsa Verde (green sauce)", upcharge: 0 }
        ]
      },
      condiments: {
        title: "Condiments",
        description: "Select your desired condiments",
        limits: {
          "bronze": 3,
          "silver": 5,
          "gold": 8,
          "diamond": 10 // ADDED
        },
        items: [
          { id: "shredded_cheese", name: "Shredded cheese", upcharge: 0 },
          { id: "shredded_vegan_cheese", name: "Shredded vegan cheese", upcharge: 0 },
          { id: "diced_onions", name: "Diced Onions", upcharge: 0 },
          { id: "lime_wedges", name: "Lime wedges", upcharge: 0 },
          { id: "jalapenos", name: "Jalapeños", upcharge: 0 },
          { id: "sour_cream", name: "Sour Cream", upcharge: 0 },
          { id: "diced_bell_peppers", name: "Diced bell peppers", upcharge: 0 },
          { id: "guacamole", name: "Guacamole", upcharge: 0 },
          { id: "fire_roasted_bell_peppers", name: "Fire roasted bell peppers", upcharge: 0 },
          { id: "sliced_radish", name: "Sliced radish", upcharge: 0 },
          { id: "cilantro", name: "Cilantro", upcharge: 0 },
          { id: "pickled_cabbage", name: "Pickled cabbage", upcharge: 0 }
        ]
      }
    }
  },

  american_bbq: {
    title: "American BBQ",
    description: "Classic American BBQ menu with smoky flavors and comfort food favorites",
    packages: [
      {
        id: "bronze",
        name: "Bronze Package",
        price: 29.00,
        description: "Basic BBQ setup",
        minGuestCount: 0,
        limits: {
          mains: 3,
          sides: 2,
          salads: 2,
          sauces: 3,
          condiments: 2
        }
      },
      {
        id: "silver",
        name: "Silver Package",
        price: 36.00,
        description: "Enhanced BBQ with more variety",
        minGuestCount: 0,
        limits: {
          mains: 4,
          sides: 3,
          salads: 2,
          sauces: 3,
          condiments: 2
        }
      },
      {
        id: "gold",
        name: "Gold Package",
        price: 45.00,
        description: "Premium BBQ with maximum variety",
        minGuestCount: 0,
        limits: {
          mains: 4,
          sides: 4,
          salads: 3,
          sauces: 4,
          condiments: 3
        }
      },
      {
        id: "diamond",
        name: "Diamond Package",
        price: 52.00,
        description: "Ultimate BBQ experience with maximum selection and premium options",
        minGuestCount: 0,
        limits: {
          mains: 5,
          sides: 5,
          salads: 3,
          sauces: 4,
          condiments: 4
        }
      }
    ],
    categories: {
      mains: {
        title: "Mains",
        description: "Select your desired main dishes",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "smoked_brisket", name: "Smoked Brisket", upcharge: 3.00 },
          { id: "beef_ribs", name: "Beef Ribs", upcharge: 4.00 },
          { id: "flank_steak_chimichurri", name: "Flank Steak with Chimichurri", upcharge: 0 },
          { id: "sausage_medley", name: "Sausage Medley", upcharge: 0 },
          { id: "hamburger_bar", name: "Hamburger Bar", upcharge: 2.50 },
          { id: "lamb_chops", name: "Lamb Chops", upcharge: 4.00 },
          { id: "smoked_leg_lamb", name: "Smoked Leg of Lamb (Family Style only)", upcharge: 0 },
          { id: "pulled_pork", name: "Pulled Pork", upcharge: 0 },
          { id: "smoked_pork_belly", name: "Smoked pork Belly", upcharge: 0 },
          { id: "baby_back_ribs", name: "Baby Back Ribs", upcharge: 0 }
        ]
      },
      sides: {
        title: "Sides",
        description: "Select your desired side dishes",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "ham_hock_baked_beans", name: "Ham hock baked Beans", upcharge: 0 },
          { id: "avocado_deviled_eggs", name: "Avocado deviled Eggs", upcharge: 0 },
          { id: "mac_n_cheese", name: "Mac n' Cheese", upcharge: 0 },
          { id: "stuffed_poblano", name: "Stuffed Poblano peppers", upcharge: 0 },
          { id: "baked_potato_bar", name: "Baked Potato Bar", upcharge: 1.50 },
          { id: "garlic_mashed_potatoes", name: "Garlic Mashed Potatoes", upcharge: 0 },
          { id: "mini_smashed_potatoes", name: "Mini Smashed Potatoes", upcharge: 0 },
          { id: "twice_baked_potatoes", name: "Twice Baked Potatoes", upcharge: 0.75 },
          { id: "corn_on_the_cob", name: "Corn on the Cob", upcharge: 0 },
          { id: "creamed_corn", name: "Creamed Corn", upcharge: 0 }
        ]
      },
      salads: {
        title: "Salads",
        description: "Select your desired salads",
        limits: {
          "bronze": 1,
          "silver": 2,
          "gold": 3,
          "diamond": 4 // ADDED
        },
        items: [
          { id: "caesar", name: "Caesar", upcharge: 0 },
          { id: "coleslaw", name: "Coleslaw", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad", upcharge: 0 },
          { id: "pasta_salad", name: "Pasta Salad", upcharge: 0 },
          { id: "bacon_jalapeno_corn", name: "Bacon Jalapeño Corn Salad", upcharge: 0 },
          { id: "wedge_salad", name: "Wedge Salad", upcharge: 0 }
        ]
      },
      sauces: {
        title: "Sauces",
        description: "Select your desired sauces",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "kansas_city_bbq", name: "Kansas City BBQ Sauce", upcharge: 0 },
          { id: "south_carolina_gold", name: "South Carolina Gold BBQ Sauce", upcharge: 0 },
          { id: "north_carolina_vinegar", name: "North Carolina Vinegar based BBQ Sauce", upcharge: 0 },
          { id: "alabama_white", name: "Alabama White BBQ Sauce", upcharge: 0 },
          { id: "texas_bbq", name: "Texas BBQ Sauce", upcharge: 0 },
          { id: "very_berry_bbq", name: "Very Berry BBQ Sauce", upcharge: 0 }
        ]
      },
      condiments: {
        title: "Condiments",
        description: "Select your desired condiments",
        limits: {
          "bronze": 3,
          "silver": 5,
          "gold": 8,
          "diamond": 10 // ADDED
        },
        items: [
          { id: "ketchup", name: "Ketchup", upcharge: 0 },
          { id: "stone_ground_mustard", name: "Stone Ground Mustard", upcharge: 0 },
          { id: "dijon_mustard", name: "Dijon Mustard", upcharge: 0 },
          { id: "yellow_mustard", name: "Yellow Mustard", upcharge: 0 },
          { id: "mayonnaise", name: "Mayonnaise", upcharge: 0 },
          { id: "sweet_pickle_chips", name: "Sweet pickle Chips", upcharge: 0 },
          { id: "dill_pickle_chips", name: "Dill pickle Chips", upcharge: 0 },
          { id: "sliced_radish", name: "Sliced radish", upcharge: 0 }
        ]
      }
    }
  },

  taste_of_greece: {
    title: "A Taste of Greece",
    description: "Mediterranean flavors from Greece with authentic dishes and fresh ingredients",
    packages: [
      {
        id: "bronze",
        name: "Bronze Package",
        price: 32.00,
        description: "Basic Greek menu",
        minGuestCount: 0,
        limits: {
          mains: 2,
          sides: 3,
          salads: 1
        }
      },
      {
        id: "silver",
        name: "Silver Package",
        price: 38.00,
        description: "Enhanced Greek menu with more variety",
        minGuestCount: 0,
        limits: {
          mains: 3,
          sides: 4,
          salads: 2
        }
      },
      {
        id: "gold",
        name: "Gold Package",
        price: 45.00,
        description: "Premium Greek menu with maximum variety",
        minGuestCount: 0,
        limits: {
          mains: 4,
          sides: 5,
          salads: 3
        }
      },
      {
        id: "diamond",
        name: "Diamond Package",
        price: 55.00,
        description: "Ultimate Greek feast with maximum selection and premium options",
        minGuestCount: 0,
        limits: {
          mains: 5,
          sides: 6,
          salads: 4
        }
      }
    ],
    categories: {
      mains: {
        title: "Mains",
        description: "Select your desired main dishes",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "papoutsakia", name: "Papoutsakia", upcharge: 0 },
          { id: "soutzoukakia", name: "Soutzoukakia", upcharge: 0 },
          { id: "kokinisto", name: "Kokinisto", upcharge: 0 },
          { id: "kleftiko", name: "Kleftiko (Family style only)", upcharge: 5.00 },
          { id: "pastitsio", name: "Pastitsio", upcharge: 0 },
          { id: "kotopoulo_lemonato", name: "Kotopoulo lemonato", upcharge: 0 },
          { id: "paidakia", name: "Paidakia", upcharge: 4.00 },
          { id: "kotsi_arni", name: "Kotsi Arni", upcharge: 0 }
        ]
      },
      sides: {
        title: "Sides",
        description: "Select your desired side dishes",
        limits: {
          "bronze": 3,
          "silver": 4,
          "gold": 5,
          "diamond": 6 // ADDED
        },
        items: [
          { id: "lemon_potatoes", name: "Lemon Potatoes", upcharge: 0 },
          { id: "spanakopita", name: "Spanakopita", upcharge: 0 },
          { id: "kritharaki", name: "Kritharaki", upcharge: 0 },
          { id: "fasolakia", name: "Fasolakia", upcharge: 0 },
          { id: "gigandes_plaki", name: "Gigandes Plaki", upcharge: 0 },
          { id: "tyrokroketes", name: "Tyrokroketes", upcharge: 0 },
          { id: "octapodi", name: "Octapodi (Spanish octopus)", upcharge: 7.00 }
        ]
      },
      salads: {
        title: "Salads",
        description: "Select your desired salads",
        limits: {
          "bronze": 1,
          "silver": 2,
          "gold": 3,
          "diamond": 4 // ADDED
        },
        items: [
          { id: "salata_horiatiki", name: "Salata Horiatiki", upcharge: 0 },
          { id: "lahanosalata", name: "Lahanosalata (Greek Coleslaw)", upcharge: 0 },
          { id: "maroulosalata", name: "Maroulosalata (Greek Romaine Salad)", upcharge: 0 },
          { id: "patatosalata", name: "Patatosalata", upcharge: 0 },
          { id: "dakos_bread_salad", name: "Dakos Bread Salad", upcharge: 0 }
        ]
      }
    }
  },

  kebab_party: {
    title: "Kebab Party",
    description: "Skewered delights featuring global flavors and grilled perfection",
    packages: [
      {
        id: "bronze",
        name: "Bronze Package",
        price: 29.00,
        description: "Basic kebab selection",
        minGuestCount: 0,
        limits: {
          proteins: 2,
          sides: 2,
          sauces: 2
        }
      },
      {
        id: "silver",
        name: "Silver Package",
        price: 36.00,
        description: "Enhanced kebab selection with more variety",
        minGuestCount: 0,
        limits: {
          proteins: 3,
          sides: 3,
          sauces: 3
        }
      },
      {
        id: "gold",
        name: "Gold Package",
        price: 42.00,
        description: "Premium kebab selection with maximum variety",
        minGuestCount: 0,
        limits: {
          proteins: 4,
          sides: 4,
          sauces: 4
        }
      },
      {
        id: "diamond",
        name: "Diamond Package",
        price: 52.00,
        description: "Ultimate kebab feast with maximum selection and premium options",
        minGuestCount: 0,
        limits: {
          proteins: 5,
          sides: 5,
          sauces: 5
        }
      }
    ],
    categories: {
      proteins: {
        title: "Proteins",
        description: "Select your desired protein options",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "pork_tenderloin", name: "Pork Tenderloin", upcharge: 0 },
          { id: "chicken", name: "Chicken", upcharge: 0 },
          { id: "beef_tenderloin", name: "Beef Tenderloin", upcharge: 0 },
          { id: "beef_flank", name: "Beef Flank", upcharge: 0 },
          { id: "lamb", name: "Lamb", upcharge: 0 },
          { id: "swordfish", name: "Swordfish", upcharge: 0 },
          { id: "shrimp", name: "Shrimp", upcharge: 0 }
        ]
      },
      sides: {
        title: "Sides",
        description: "Select your desired side dishes",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "falafel", name: "Falafel", upcharge: 0 },
          { id: "spanakopita", name: "Spanakopita", upcharge: 0 },
          { id: "dolmades", name: "Dolmades", upcharge: 0 },
          { id: "yellow_rice_pilaf", name: "Yellow Rice Pilaf", upcharge: 0 },
          { id: "wild_rice_mushroom_pilaf", name: "Wild Rice and Mushroom Pilaf", upcharge: 0 },
          { id: "patatas_bravas", name: "Patatas Bravas", upcharge: 0 }
        ]
      },
      sauces: {
        title: "Sauces",
        description: "Select your desired sauces",
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5 // ADDED
        },
        items: [
          { id: "tzatziki", name: "Tzatziki", upcharge: 0 },
          { id: "baba_ganoush", name: "Baba Ganoush", upcharge: 0 },
          { id: "hummus", name: "Hummus", upcharge: 0 },
          { id: "muhammara", name: "Muhammara", upcharge: 0 },
          { id: "chimichurri", name: "Chimichurri", upcharge: 0 },
          { id: "romesco", name: "Romesco", upcharge: 0 }
        ]
      }
    }
  }
};