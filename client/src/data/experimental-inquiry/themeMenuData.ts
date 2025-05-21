// Theme Menu Data with all available options by cuisine type
export const themeMenuData = {
  custom_menu: {
    title: "Custom Menu - Flexible Selection",
    description: "Build your own menu by selecting items from different cuisine styles",
    customizable: true,
    categories: {
      taco_fiesta: {
        title: "Taco Fiesta - Custom",
        description: "Mexican-inspired options for your event",
        subcategories: {
          proteins: {
            title: "Proteins",
            description: "Select your desired protein options",
            items: [
              { id: "barbacoa", name: "Barbacoa", upcharge: 0 },
              { id: "flank_steak_fajitas", name: "Flank steak Fajitas", upcharge: 2.00 },
              { id: "ground_beef", name: "Ground Beef", upcharge: 0 },
              { id: "pork_carnitas", name: "Pork Carnitas", upcharge: 0 },
              { id: "chorizo", name: "Chorizo", upcharge: 0 },
              { id: "beef_birria", name: "Beef Birria", upcharge: 0 },
              { id: "chicken_tinga", name: "Chicken Tinga", upcharge: 0 },
              { id: "chicken_fajita", name: "Chicken Fajita", upcharge: 0 },
              { id: "al_pastor", name: "Al Pastor", upcharge: 0 },
              { id: "carne_asada", name: "Carne Asada", upcharge: 1.50 },
              { id: "shrimp_fajita", name: "Shrimp Fajita", upcharge: 2.50 },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sides: {
            title: "Sides",
            description: "Choose your sides",
            items: [
              { id: "spanish_rice", name: "Spanish Rice" },
              { id: "cilantro_lime_rice", name: "Cilantro Lime Rice" },
              { id: "mexican_street_corn", name: "Mexican Street Corn" },
              { id: "refried_beans", name: "Refried Beans" },
              { id: "charro_beans", name: "Charro Beans" },
              { id: "black_beans", name: "Black Beans" },
              { id: "guacamole", name: "Guacamole" },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          salsas: {
            title: "Salsas",
            description: "Choose your salsas",
            items: [
              { id: "pico_de_gallo", name: "Pico de Gallo" },
              { id: "salsa_verde", name: "Salsa Verde" },
              { id: "chipotle_salsa", name: "Chipotle Salsa" },
              { id: "mango_salsa", name: "Mango Salsa" },
              { id: "roasted_tomato_salsa", name: "Roasted Tomato Salsa" },
              { id: "habanero_salsa", name: "Habanero Salsa" },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          addons: {
            title: "Add-ons",
            description: "Optional items to enhance your menu",
            items: [
              { id: "queso_blanco", name: "Queso Blanco", price: 2.50 },
              { id: "queso_fundido", name: "Queso Fundido with Chorizo", price: 3.00 },
              { id: "churros", name: "Churros with Chocolate and Caramel Sauce", price: 3.50 },
              { id: "mexican_chocolate_brownies", name: "Mexican Chocolate Brownies", price: 2.75 },
              { id: "tres_leches", name: "Tres Leches Cake", price: 4.00 },
            ],
            multiSelect: true,
            optional: true,
          }
        }
      },
      american_bbq: {
        title: "American BBQ - Custom",
        description: "Hearty BBQ selections for your event",
        subcategories: {
          proteins: {
            title: "Proteins",
            description: "Select your desired protein options",
            items: [
              { id: "brisket", name: "Smoked Brisket", upcharge: 2.50 },
              { id: "pulled_pork", name: "Pulled Pork", upcharge: 0 },
              { id: "bbq_chicken", name: "BBQ Chicken", upcharge: 0 },
              { id: "smoked_sausage", name: "Smoked Sausage", upcharge: 0 },
              { id: "beef_ribs", name: "Beef Ribs", upcharge: 3.00 },
              { id: "pork_ribs", name: "Pork Ribs", upcharge: 1.50 },
              { id: "smoked_turkey", name: "Smoked Turkey", upcharge: 0 },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sides: {
            title: "Sides",
            description: "Choose your sides",
            items: [
              { id: "mac_cheese", name: "Mac & Cheese" },
              { id: "baked_beans", name: "Baked Beans" },
              { id: "coleslaw", name: "Coleslaw" },
              { id: "potato_salad", name: "Potato Salad" },
              { id: "cornbread", name: "Cornbread" },
              { id: "collard_greens", name: "Collard Greens" },
              { id: "corn_on_cob", name: "Corn on the Cob" },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sauces: {
            title: "Sauces",
            description: "Choose your BBQ sauces",
            items: [
              { id: "classic_bbq", name: "Classic BBQ Sauce" },
              { id: "spicy_bbq", name: "Spicy BBQ Sauce" },
              { id: "carolina_gold", name: "Carolina Gold" },
              { id: "alabama_white", name: "Alabama White Sauce" },
              { id: "texas_hot", name: "Texas Hot Sauce" },
            ],
            multiSelect: true,
            maxSelections: 2,
          },
          addons: {
            title: "Add-ons",
            description: "Optional items to enhance your menu",
            items: [
              { id: "banana_pudding", name: "Banana Pudding", price: 3.50 },
              { id: "peach_cobbler", name: "Peach Cobbler", price: 3.75 },
              { id: "pecan_pie", name: "Pecan Pie", price: 4.00 },
              { id: "sweet_tea", name: "Sweet Tea (Gallon)", price: 15.00 },
            ],
            multiSelect: true,
            optional: true,
          }
        }
      },
      taste_of_greece: {
        title: "A Taste of Greece - Custom",
        description: "Mediterranean delights for your event",
        subcategories: {
          proteins: {
            title: "Proteins",
            description: "Select your desired protein options",
            items: [
              { id: "gyro_meat", name: "Traditional Gyro Meat", upcharge: 0 },
              { id: "chicken_souvlaki", name: "Chicken Souvlaki", upcharge: 0 },
              { id: "pork_souvlaki", name: "Pork Souvlaki", upcharge: 0 },
              { id: "lamb_chops", name: "Lamb Chops", upcharge: 3.50 },
              { id: "moussaka", name: "Moussaka", upcharge: 1.50 },
              { id: "pastitsio", name: "Pastitsio", upcharge: 1.50 },
              { id: "stuffed_eggplant", name: "Stuffed Eggplant", upcharge: 1.00 },
              { id: "shrimp_saganaki", name: "Shrimp Saganaki", upcharge: 2.50 },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sides: {
            title: "Sides",
            description: "Choose your sides",
            items: [
              { id: "lemon_potatoes", name: "Greek Lemon Potatoes" },
              { id: "rice_pilaf", name: "Greek Rice Pilaf" },
              { id: "greek_salad", name: "Greek Salad" },
              { id: "spanakopita", name: "Spanakopita" },
              { id: "tiropita", name: "Tiropita" },
              { id: "dolmades", name: "Dolmades (Stuffed Grape Leaves)" },
              { id: "hummus", name: "Hummus with Pita" },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sauces: {
            title: "Sauces",
            description: "Choose your sauces",
            items: [
              { id: "tzatziki", name: "Tzatziki Sauce" },
              { id: "red_pepper_feta", name: "Red Pepper & Feta Dip" },
              { id: "olive_tapenade", name: "Olive Tapenade" },
            ],
            multiSelect: true,
            maxSelections: 2,
          },
          addons: {
            title: "Desserts",
            description: "Optional Greek desserts to enhance your menu",
            items: [
              { id: "baklava", name: "Baklava", price: 3.50 },
              { id: "galaktoboureko", name: "Galaktoboureko (Custard Pie)", price: 3.75 },
              { id: "loukoumades", name: "Loukoumades (Greek Doughnut Balls)", price: 3.25 },
              { id: "greek_yogurt_honey", name: "Greek Yogurt with Honey & Walnuts", price: 3.00 },
            ],
            multiSelect: true,
            optional: true,
          }
        }
      },
      kebab_party: {
        title: "Kebab Party - Custom",
        description: "Wide variety of delicious skewered meats and vegetables",
        subcategories: {
          proteins: {
            title: "Proteins",
            description: "Select your desired protein options",
            items: [
              { id: "chicken_kebab", name: "Chicken Kebab", upcharge: 0 },
              { id: "beef_kebab", name: "Beef Kebab", upcharge: 1.50 },
              { id: "lamb_kebab", name: "Lamb Kebab", upcharge: 2.50 },
              { id: "kofta_kebab", name: "Kofta Kebab", upcharge: 0 },
              { id: "shrimp_kebab", name: "Shrimp Kebab", upcharge: 2.00 },
              { id: "veggie_kebab", name: "Vegetable Kebab", upcharge: 0 },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sides: {
            title: "Sides",
            description: "Choose your sides",
            items: [
              { id: "saffron_rice", name: "Saffron Rice" },
              { id: "roasted_vegetables", name: "Roasted Vegetables" },
              { id: "tabbouleh", name: "Tabbouleh" },
              { id: "fattoush", name: "Fattoush Salad" },
              { id: "pita_bread", name: "Pita Bread" },
              { id: "couscous", name: "Couscous" },
              { id: "grilled_halloumi", name: "Grilled Halloumi Cheese" },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sauces: {
            title: "Sauces",
            description: "Choose your sauces",
            items: [
              { id: "garlic_sauce", name: "Garlic Sauce" },
              { id: "tahini_sauce", name: "Tahini Sauce" },
              { id: "harissa", name: "Harissa" },
              { id: "yogurt_mint", name: "Yogurt Mint Sauce" },
            ],
            multiSelect: true,
            maxSelections: 2,
          },
          addons: {
            title: "Add-ons",
            description: "Optional items to enhance your menu",
            items: [
              { id: "falafel", name: "Falafel Platter", price: 3.50 },
              { id: "stuffed_dates", name: "Stuffed Dates", price: 2.75 },
              { id: "baklava", name: "Baklava Assortment", price: 3.50 },
              { id: "kunafa", name: "Kunafa (Middle Eastern Dessert)", price: 4.00 },
            ],
            multiSelect: true,
            optional: true,
          }
        }
      },
      taste_of_italy: {
        title: "A Taste of Italy - Custom",
        description: "Delicious Italian cuisine for your event",
        subcategories: {
          proteins: {
            title: "Main Dishes",
            description: "Select your desired main dishes",
            items: [
              { id: "chicken_marsala", name: "Chicken Marsala", upcharge: 0 },
              { id: "chicken_piccata", name: "Chicken Piccata", upcharge: 0 },
              { id: "chicken_parmesan", name: "Chicken Parmesan", upcharge: 0 },
              { id: "lasagna", name: "Classic Lasagna", upcharge: 1.00 },
              { id: "fettuccine_alfredo", name: "Fettuccine Alfredo", upcharge: 0 },
              { id: "spaghetti_meatballs", name: "Spaghetti and Meatballs", upcharge: 0 },
              { id: "eggplant_parmesan", name: "Eggplant Parmesan", upcharge: 0 },
              { id: "risotto", name: "Wild Mushroom Risotto", upcharge: 1.50 },
              { id: "shrimp_scampi", name: "Shrimp Scampi", upcharge: 2.00 },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sides: {
            title: "Sides",
            description: "Choose your sides",
            items: [
              { id: "garlic_bread", name: "Garlic Bread" },
              { id: "caesar_salad", name: "Caesar Salad" },
              { id: "caprese_salad", name: "Caprese Salad" },
              { id: "italian_roasted_vegetables", name: "Italian Roasted Vegetables" },
              { id: "bruschetta", name: "Bruschetta" },
              { id: "antipasto_platter", name: "Antipasto Platter" },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
          sauces: {
            title: "Sauces",
            description: "Choose your sauces",
            items: [
              { id: "marinara", name: "Marinara Sauce" },
              { id: "alfredo", name: "Alfredo Sauce" },
              { id: "pesto", name: "Pesto Sauce" },
              { id: "bolognese", name: "Bolognese Sauce" },
            ],
            multiSelect: true,
            maxSelections: 2,
          },
          addons: {
            title: "Desserts",
            description: "Optional Italian desserts",
            items: [
              { id: "tiramisu", name: "Tiramisu", price: 4.50 },
              { id: "cannoli", name: "Cannoli", price: 3.50 },
              { id: "panna_cotta", name: "Panna Cotta", price: 3.75 },
              { id: "gelato", name: "Gelato (assorted flavors)", price: 3.00 },
            ],
            multiSelect: true,
            optional: true,
          }
        }
      },
      sandwich_factory: {
        title: "Sandwich Factory - Custom",
        description: "Create your own sandwich bar",
        subcategories: {
          breads: {
            title: "Breads",
            description: "Select your bread options",
            items: [
              { id: "italian", name: "Italian Bread" },
              { id: "wheat", name: "Whole Wheat" },
              { id: "sourdough", name: "Sourdough" },
              { id: "rye", name: "Rye" },
              { id: "baguette", name: "Baguette" },
              { id: "ciabatta", name: "Ciabatta" },
              { id: "croissant", name: "Croissant" },
            ],
            multiSelect: true,
            maxSelections: 4,
          },
          meats: {
            title: "Meats",
            description: "Select your meat options",
            items: [
              { id: "turkey", name: "Roast Turkey" },
              { id: "ham", name: "Ham" },
              { id: "roast_beef", name: "Roast Beef", upcharge: 1.00 },
              { id: "chicken_salad", name: "Chicken Salad" },
              { id: "tuna_salad", name: "Tuna Salad" },
              { id: "salami", name: "Salami" },
              { id: "pastrami", name: "Pastrami", upcharge: 1.00 },
            ],
            multiSelect: true,
            maxSelections: 4,
          },
          cheeses: {
            title: "Cheeses",
            description: "Select your cheese options",
            items: [
              { id: "cheddar", name: "Cheddar" },
              { id: "swiss", name: "Swiss" },
              { id: "provolone", name: "Provolone" },
              { id: "pepper_jack", name: "Pepper Jack" },
              { id: "american", name: "American" },
              { id: "brie", name: "Brie", upcharge: 1.00 },
            ],
            multiSelect: true,
            maxSelections: 4,
          },
          sides: {
            title: "Sides",
            description: "Choose your sides",
            items: [
              { id: "potato_salad", name: "Potato Salad" },
              { id: "pasta_salad", name: "Pasta Salad" },
              { id: "cole_slaw", name: "Cole Slaw" },
              { id: "green_salad", name: "Green Salad" },
              { id: "potato_chips", name: "Potato Chips" },
              { id: "fruit_salad", name: "Fruit Salad" },
            ],
            multiSelect: true,
            maxSelections: 3,
          },
        }
      }
    }
  },
  taco_fiesta: {
    title: "Taco Fiesta",
    description: "Mexican street-style taco setup with all the fixings",
    packages: [
      {
        id: "standard",
        name: "Standard Taco Package",
        price: 14.95,
        description: "2 proteins, 3 sides, 2 salsas, and all the toppings"
      },
      {
        id: "deluxe",
        name: "Deluxe Taco Package",
        price: 19.95,
        description: "3 proteins, 4 sides, 3 salsas, premium toppings, and dessert"
      },
      {
        id: "premium",
        name: "Premium Fiesta Experience",
        price: 24.95,
        description: "4 proteins, 4 sides, 4 salsas, premium toppings, dessert, and specialty items"
      }
    ],
    categories: {
      proteins: {
        title: "Proteins",
        description: "Select your desired protein options",
        items: [
          { id: "barbacoa", name: "Barbacoa" },
          { id: "ground_beef", name: "Ground Beef" },
          { id: "pork_carnitas", name: "Pork Carnitas" },
          { id: "chicken_tinga", name: "Chicken Tinga" },
          { id: "al_pastor", name: "Al Pastor" },
          { id: "carne_asada", name: "Carne Asada" },
          { id: "shrimp", name: "Shrimp", premium: true },
          { id: "fish", name: "Baja Fish", premium: true },
        ]
      },
      sides: {
        title: "Sides",
        description: "Choose your sides",
        items: [
          { id: "spanish_rice", name: "Spanish Rice" },
          { id: "cilantro_lime_rice", name: "Cilantro Lime Rice" },
          { id: "mexican_street_corn", name: "Mexican Street Corn" },
          { id: "refried_beans", name: "Refried Beans" },
          { id: "charro_beans", name: "Charro Beans" },
          { id: "black_beans", name: "Black Beans" },
          { id: "guacamole", name: "Guacamole", premium: true },
        ]
      },
      salsas: {
        title: "Salsas",
        description: "Choose your salsas",
        items: [
          { id: "pico_de_gallo", name: "Pico de Gallo" },
          { id: "salsa_verde", name: "Salsa Verde" },
          { id: "chipotle_salsa", name: "Chipotle Salsa" },
          { id: "mango_salsa", name: "Mango Salsa", premium: true },
          { id: "roasted_tomato_salsa", name: "Roasted Tomato Salsa" },
          { id: "habanero_salsa", name: "Habanero Salsa" },
        ]
      },
      addons: {
        title: "Desserts & Add-ons",
        description: "Optional items to enhance your menu",
        items: [
          { id: "churros", name: "Churros with Chocolate and Caramel Sauce", price: 3.50 },
          { id: "mexican_chocolate_brownies", name: "Mexican Chocolate Brownies", price: 2.75 },
          { id: "tres_leches", name: "Tres Leches Cake", price: 4.00 },
          { id: "cinnamon_sugar_sopapillas", name: "Cinnamon Sugar Sopapillas", price: 3.25 },
        ]
      }
    }
  }
};