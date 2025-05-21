// client/src/data/menuAndAppetizerData.ts

// Appetizer data for the regular appetizer selection
export const appetizerData = {
  categories: [
    {
      id: "cold_appetizers",
      name: "Cold Appetizers",
      items: [
        {
          id: "bruschetta",
          name: "Bruschetta",
          price: 2.99
        },
        {
          id: "caprese_skewers",
          name: "Caprese Skewers",
          price: 3.50
        },
        {
          id: "shrimp_cocktail",
          name: "Shrimp Cocktail",
          price: 4.99
        },
        {
          id: "smoked_salmon_crostini",
          name: "Smoked Salmon Crostini",
          price: 4.50
        }
      ]
    },
    {
      id: "hot_appetizers",
      name: "Hot Appetizers",
      items: [
        {
          id: "stuffed_mushrooms",
          name: "Stuffed Mushrooms",
          price: 3.99
        },
        {
          id: "chicken_satay",
          name: "Chicken Satay with Peanut Sauce",
          price: 4.50
        },
        {
          id: "mini_crab_cakes",
          name: "Mini Crab Cakes",
          price: 5.99
        },
        {
          id: "bacon_wrapped_dates",
          name: "Bacon Wrapped Dates",
          price: 3.99
        }
      ]
    },
    {
      id: "platters",
      name: "Shared Platters",
      note: "Platters serve approximately 10-15 guests",
      items: [
        {
          id: "cheese_board",
          name: "Artisanal Cheese Board",
          price: 89.99
        },
        {
          id: "charcuterie",
          name: "Charcuterie Platter",
          price: 99.99
        },
        {
          id: "mediterranean",
          name: "Mediterranean Platter",
          price: 79.99
        },
        {
          id: "fruit_platter",
          name: "Fresh Fruit Platter",
          price: 69.99
        }
      ]
    }
  ]
};

// Hors d'oeuvres data for the matrix selection
export const horsDoeurvesData = {
  categories: [
    {
      id: "premium_bites",
      name: "Premium Bites",
      lotSizes: [24, 36, 48, 96, 144],
      items: [
        {
          id: "beef_wellington",
          name: "Mini Beef Wellington",
          price: 2.99
        },
        {
          id: "lobster_roll",
          name: "Mini Lobster Rolls",
          price: 3.50
        },
        {
          id: "tuna_tartare",
          name: "Tuna Tartare on Wonton Crisp",
          price: 2.75
        }
      ]
    },
    {
      id: "signature_bites",
      name: "Signature Bites",
      lotSizes: [24, 36, 48, 96, 144],
      items: [
        {
          id: "arancini",
          name: "Arancini (Fried Risotto Balls)",
          price: 1.99
        },
        {
          id: "chicken_quesadilla",
          name: "Mini Chicken Quesadilla",
          price: 1.75
        },
        {
          id: "spanakopita",
          name: "Spanakopita Triangles",
          price: 1.50
        }
      ]
    },
    {
      id: "vegetarian",
      name: "Vegetarian Options",
      lotSizes: [24, 36, 48, 96, 144],
      items: [
        {
          id: "stuffed_peppers",
          name: "Stuffed Mini Peppers",
          price: 1.75
        },
        {
          id: "avocado_toast",
          name: "Avocado Toast Points",
          price: 1.99
        },
        {
          id: "mushroom_vol_au_vent",
          name: "Mushroom Vol-au-vent",
          price: 1.85
        }
      ]
    }
  ]
};

// Menu themes data
export const menuThemesData = {
  title: "Menu Themes",
  description: "Select a theme for your catering menu",
  customizable: true,
  categories: {
    taco_fiesta: {
      title: "Taco Fiesta",
      description: "Build-your-own taco bar with all the fixings",
      subcategories: {
        proteins: {
          title: "Proteins",
          description: "Choose up to 3 proteins",
          items: [
            { id: "carne_asada", name: "Carne Asada", upcharge: 0 },
            { id: "chicken_tinga", name: "Chicken Tinga", upcharge: 0 },
            { id: "carnitas", name: "Carnitas (Slow-Cooked Pork)", upcharge: 0 },
            { id: "grilled_fish", name: "Grilled Fish", upcharge: 2 },
            { id: "shrimp", name: "Seasoned Shrimp", upcharge: 3 },
            { id: "vegetarian", name: "Vegetarian Crumble", upcharge: 0 }
          ]
        },
        sides: {
          title: "Sides",
          description: "Choose up to 3 sides",
          items: [
            { id: "mexican_rice", name: "Mexican Rice", upcharge: 0 },
            { id: "refried_beans", name: "Refried Beans", upcharge: 0 },
            { id: "black_beans", name: "Black Beans", upcharge: 0 },
            { id: "corn_salad", name: "Corn Salad", upcharge: 1 },
            { id: "guacamole", name: "Guacamole", upcharge: 2 }
          ]
        },
        salsas: {
          title: "Salsas",
          description: "Choose up to 3 salsas",
          items: [
            { id: "salsa_roja", name: "Salsa Roja", upcharge: 0 },
            { id: "salsa_verde", name: "Salsa Verde", upcharge: 0 },
            { id: "pico_de_gallo", name: "Pico de Gallo", upcharge: 0 },
            { id: "mango_salsa", name: "Mango Salsa", upcharge: 1 },
            { id: "chipotle_salsa", name: "Chipotle Salsa", upcharge: 0 }
          ]
        },
        condiments: {
          title: "Condiments & Toppings",
          description: "All included",
          items: [
            { id: "sour_cream", name: "Sour Cream", upcharge: 0 },
            { id: "cheese", name: "Shredded Cheese", upcharge: 0 },
            { id: "lettuce", name: "Shredded Lettuce", upcharge: 0 },
            { id: "limes", name: "Lime Wedges", upcharge: 0 },
            { id: "tortillas", name: "Corn & Flour Tortillas", upcharge: 0 },
            { id: "chips", name: "Tortilla Chips", upcharge: 0 }
          ]
        }
      }
    },
    american_bbq: {
      title: "American BBQ",
      description: "Classic American barbecue with smoky flavors",
      subcategories: {
        proteins: {
          title: "Proteins",
          description: "Choose up to 3 proteins",
          items: [
            { id: "pulled_pork", name: "Pulled Pork", upcharge: 0 },
            { id: "brisket", name: "Beef Brisket", upcharge: 2 },
            { id: "bbq_chicken", name: "BBQ Chicken", upcharge: 0 },
            { id: "ribs", name: "St. Louis Ribs", upcharge: 3 },
            { id: "sausages", name: "Smoked Sausages", upcharge: 1 }
          ]
        },
        sides: {
          title: "Sides",
          description: "Choose up to 3 sides",
          items: [
            { id: "mac_cheese", name: "Mac & Cheese", upcharge: 0 },
            { id: "coleslaw", name: "Coleslaw", upcharge: 0 },
            { id: "baked_beans", name: "Baked Beans", upcharge: 0 },
            { id: "cornbread", name: "Cornbread", upcharge: 0 },
            { id: "potato_salad", name: "Potato Salad", upcharge: 0 }
          ]
        },
        sauces: {
          title: "Sauces",
          description: "Choose up to 3 sauces",
          items: [
            { id: "classic_bbq", name: "Classic BBQ Sauce", upcharge: 0 },
            { id: "carolina", name: "Carolina Gold", upcharge: 0 },
            { id: "white_alabama", name: "White Alabama Sauce", upcharge: 0 },
            { id: "spicy_bbq", name: "Spicy BBQ Sauce", upcharge: 0 }
          ]
        }
      }
    },
    taste_of_italy: {
      title: "A Taste of Italy",
      description: "Classic Italian dishes featuring pasta, sauces, and more",
      subcategories: {
        mains: {
          title: "Main Courses",
          description: "Choose up to 3 mains",
          items: [
            { id: "lasagna", name: "Lasagna", upcharge: 0 },
            { id: "chicken_parm", name: "Chicken Parmesan", upcharge: 0 },
            { id: "eggplant_parm", name: "Eggplant Parmesan", upcharge: 0 },
            { id: "meatballs", name: "Italian Meatballs", upcharge: 0 },
            { id: "sausage_peppers", name: "Sausage & Peppers", upcharge: 0 }
          ]
        },
        pastas: {
          title: "Pastas",
          description: "Choose up to 2 pastas",
          items: [
            { id: "penne_vodka", name: "Penne alla Vodka", upcharge: 0 },
            { id: "spaghetti_marinara", name: "Spaghetti Marinara", upcharge: 0 },
            { id: "fettuccine_alfredo", name: "Fettuccine Alfredo", upcharge: 0 },
            { id: "gnocchi", name: "Gnocchi with Pesto", upcharge: 1 }
          ]
        },
        sides: {
          title: "Sides",
          description: "Choose up to 2 sides",
          items: [
            { id: "garlic_bread", name: "Garlic Bread", upcharge: 0 },
            { id: "caprese_salad", name: "Caprese Salad", upcharge: 0 },
            { id: "caesar_salad", name: "Caesar Salad", upcharge: 0 },
            { id: "roasted_vegetables", name: "Roasted Vegetables", upcharge: 0 }
          ]
        }
      }
    },
    sandwich_factory: {
      title: "Sandwich Factory",
      quantityInput: true,
      packages: [
        {
          id: "bronze",
          name: "Bronze Package",
          price: 13.99,
          description: "Basic sandwich platter with chips and cookies",
          minGuestCount: 10
        },
        {
          id: "silver",
          name: "Silver Package",
          price: 16.99,
          description: "Sandwich platter with salad, chips, and cookies",
          minGuestCount: 10
        },
        {
          id: "gold",
          name: "Gold Package",
          price: 19.99,
          description: "Premium sandwich platter with two salads, chips, and assorted desserts",
          minGuestCount: 10
        }
      ],
      categories: {
        meats: {
          title: "Meats",
          description: "Choose up to 3 meats",
          limits: {
            min: 1,
            max: 3
          },
          items: [
            { id: "turkey", name: "Roasted Turkey" },
            { id: "ham", name: "Black Forest Ham" },
            { id: "roast_beef", name: "Roast Beef" },
            { id: "chicken", name: "Grilled Chicken" },
            { id: "tuna", name: "Tuna Salad" }
          ]
        },
        cheeses: {
          title: "Cheeses",
          description: "Choose up to 2 cheeses",
          limits: {
            min: 1,
            max: 2
          },
          items: [
            { id: "cheddar", name: "Cheddar" },
            { id: "swiss", name: "Swiss" },
            { id: "provolone", name: "Provolone" },
            { id: "pepper_jack", name: "Pepper Jack" }
          ]
        },
        breads: {
          title: "Breads",
          description: "Choose up to 2 bread types",
          limits: {
            min: 1,
            max: 2
          },
          items: [
            { id: "white", name: "White" },
            { id: "wheat", name: "Wheat" },
            { id: "sourdough", name: "Sourdough" },
            { id: "ciabatta", name: "Ciabatta" },
            { id: "baguette", name: "Baguette" }
          ]
        },
        toppings: {
          title: "Toppings",
          description: "All included",
          items: [
            { id: "lettuce", name: "Lettuce" },
            { id: "tomato", name: "Tomato" },
            { id: "onion", name: "Red Onion" },
            { id: "pickles", name: "Pickles" },
            { id: "cucumber", name: "Cucumber" }
          ]
        },
        condiments: {
          title: "Condiments",
          description: "All included",
          items: [
            { id: "mayo", name: "Mayonnaise" },
            { id: "mustard", name: "Mustard" },
            { id: "hummus", name: "Hummus" },
            { id: "aioli", name: "Garlic Aioli" }
          ]
        },
        sides: {
          title: "Sides",
          description: "Included based on package",
          items: [
            { id: "potato_chips", name: "Potato Chips" },
            { id: "pasta_salad", name: "Pasta Salad" },
            { id: "potato_salad", name: "Potato Salad" },
            { id: "garden_salad", name: "Garden Salad" },
            { id: "caesar_salad", name: "Caesar Salad" }
          ]
        },
        add_ons: {
          title: "Add-ons",
          description: "Optional additions",
          items: [
            { id: "fruit_tray", name: "Fruit Tray", price: 2.99 },
            { id: "veggie_tray", name: "Veggie Tray", price: 2.50 },
            { id: "cookies", name: "Cookie Tray", price: 1.99 },
            { id: "brownies", name: "Brownie Tray", price: 2.50 }
          ]
        }
      }
    },
    vegan_menu: {
      title: "Vegan Experience",
      description: "Plant-based menu with creative dishes",
      subcategories: {
        mains: {
          title: "Main Courses",
          description: "Choose up to 3 mains",
          items: [
            { id: "buddha_bowl", name: "Buddha Bowl", upcharge: 0 },
            { id: "beyond_meatballs", name: "Beyond Meat Meatballs", upcharge: 2 },
            { id: "stuffed_peppers", name: "Stuffed Bell Peppers", upcharge: 0 },
            { id: "jackfruit_tacos", name: "Jackfruit Street Tacos", upcharge: 1 },
            { id: "mushroom_risotto", name: "Mushroom Risotto", upcharge: 0 }
          ]
        },
        sides: {
          title: "Sides",
          description: "Choose up to 3 sides",
          items: [
            { id: "quinoa_salad", name: "Quinoa Salad", upcharge: 0 },
            { id: "roasted_vegetables", name: "Roasted Seasonal Vegetables", upcharge: 0 },
            { id: "sweet_potato", name: "Sweet Potato Wedges", upcharge: 0 },
            { id: "hummus_platter", name: "Hummus Platter with Pita", upcharge: 1 }
          ]
        },
        desserts: {
          title: "Desserts",
          description: "Choose up to 2 desserts",
          items: [
            { id: "chia_pudding", name: "Chia Seed Pudding", upcharge: 0 },
            { id: "vegan_cookies", name: "Vegan Chocolate Chip Cookies", upcharge: 0 },
            { id: "fruit_platter", name: "Fresh Fruit Platter", upcharge: 0 },
            { id: "chocolate_mousse", name: "Vegan Chocolate Mousse", upcharge: 1 }
          ]
        }
      }
    }
  }
};