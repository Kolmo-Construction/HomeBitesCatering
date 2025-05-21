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
  custom_menu: {
    title: "Custom Menu - Flexible Selection",
    description: "Build your own menu by selecting items from different cuisine styles",
    customizable: true,
    packages: [],
    categories: {
      proteins: {
        title: "Proteins",
        description: "Select your desired protein options",
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
      sides: {
        title: "Sides",
        description: "Select your desired side dishes",
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
          "gold": 4
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
          "gold": 4
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
          "gold": 4
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
          "gold": 8
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
          mains: 2,
          sides: 2,
          salads: 1,
          sauces: 2,
          condiments: 3
        }
      },
      {
        id: "silver",
        name: "Silver Package",
        price: 36.00,
        description: "Enhanced BBQ with more variety",
        minGuestCount: 0,
        limits: {
          mains: 3,
          sides: 3,
          salads: 2,
          sauces: 3,
          condiments: 5
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
          condiments: 8
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
          salads: 4,
          sauces: 5,
          condiments: 10
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
          "gold": 4
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
          "gold": 4
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
          "gold": 3
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
          "gold": 4
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
          "gold": 8
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
          "gold": 4
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
          "gold": 5
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
          "gold": 3
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
          "gold": 4
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
          "gold": 4
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
          "gold": 4
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
