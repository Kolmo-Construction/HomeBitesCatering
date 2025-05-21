// client/src/data/menuAndAppetizerData.ts

// Appetizer data structure
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
        { id: "gazpacho", name: "Gazpacho", price: 2.75 },
        { id: "vichyssoise", name: "Vichyssoise", price: 2.75 },
        { id: "butternut_squash", name: "Butternut Squash", price: 2.75 },
        { id: "shrimp_cocktail", name: "Shrimp Cocktail", price: 3.75 },
        { id: "oyster_shooter", name: "Oyster Shooter", price: 4.25 }
      ],
      lotSizes: [24, 36, 48, 96]
    },
    {
      id: "canapes",
      name: "Canapés",
      note: "Offered in lots of 36",
      items: [
        { id: "smoked_salmon", name: "Smoked Salmon & Caviar", price: 3.95 },
        { id: "crab_cake", name: "Mini Crab Cake", price: 3.75 },
        { id: "stuffed_mushroom", name: "Stuffed Mushroom", price: 3.25 },
        { id: "prosciutto_melon", name: "Prosciutto-wrapped Melon", price: 3.25 },
        { id: "endive_blue_cheese", name: "Endive with Blue Cheese", price: 2.95 }
      ],
      lotSizes: [36, 48, 96, 144]
    },
    {
      id: "spreads",
      name: "Spreads & Dips",
      note: "Priced per person, minimum 25",
      items: [
        { id: "hummus", name: "Hummus with Pita", price: 2.75 },
        { id: "spinach_artichoke", name: "Spinach & Artichoke Dip", price: 3.25 },
        { id: "guacamole", name: "Guacamole with Tortilla Chips", price: 3.50 },
        { id: "bruschetta", name: "Bruschetta with Crostini", price: 2.95 },
        { id: "cheese_board", name: "Cheese Board with Crackers", price: 4.25 }
      ],
      basePrice: 25,
      servingSizes: [25, 50, 75, 100],
      selectLimit: 3
    }
  ]
};

// Hors d'oeuvres data structure
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
      lotSizes: [24, 36, 48, 96],
      items: [
        { id: "gazpacho", name: "Gazpacho", price: 2.75 },
        { id: "vichyssoise", name: "Vichyssoise", price: 2.75 },
        { id: "butternut_squash", name: "Butternut Squash", price: 2.75 },
        { id: "corn_chowder", name: "Corn Chowder", price: 2.75 },
        { id: "lobster_bisque", name: "Lobster Bisque", price: 3.50 },
        { id: "shrimp_cocktail", name: "Shrimp Cocktail", price: 3.75 },
        { id: "oyster_shooter", name: "Oyster Shooter", price: 4.25 },
        { id: "ceviche", name: "Ceviche", price: 3.25 }
      ]
    }
  ]
};

// Theme menu data structure (partial representation - this is a very large object)
export const themeMenuData = {
  title: "Themed Menu Options",
  description: "Choose from our curated themed menu packages",
  customizable: true,
  categories: {
    taco_fiesta: {
      title: "Taco Fiesta",
      description: "A festive taco bar with all the fixings",
      subcategories: {
        proteins: {
          title: "Proteins",
          description: "Choose up to 3 proteins",
          items: [
            { id: "carne_asada", name: "Carne Asada", upcharge: 0 },
            { id: "chicken_tinga", name: "Chicken Tinga", upcharge: 0 },
            { id: "carnitas", name: "Carnitas", upcharge: 0 },
            { id: "al_pastor", name: "Al Pastor", upcharge: 0 },
            { id: "fish", name: "Grilled Fish", upcharge: 2 },
            { id: "shrimp", name: "Garlic Lime Shrimp", upcharge: 3 }
          ]
        },
        sides: {
          title: "Sides",
          description: "Choose 2 sides",
          items: [
            { id: "mexican_rice", name: "Mexican Rice" },
            { id: "black_beans", name: "Black Beans" },
            { id: "refried_beans", name: "Refried Beans" },
            { id: "elote", name: "Elote (Mexican Street Corn)" },
            { id: "guacamole", name: "Guacamole" }
          ]
        },
        salsas: {
          title: "Salsas",
          description: "Choose 2 salsas",
          items: [
            { id: "pico_de_gallo", name: "Pico de Gallo" },
            { id: "salsa_verde", name: "Salsa Verde" },
            { id: "salsa_roja", name: "Salsa Roja" },
            { id: "mango_salsa", name: "Mango Salsa" }
          ]
        },
        condiments: {
          title: "Condiments",
          description: "All included",
          items: [
            { id: "sour_cream", name: "Sour Cream" },
            { id: "cheese", name: "Shredded Cheese" },
            { id: "lettuce", name: "Shredded Lettuce" },
            { id: "limes", name: "Lime Wedges" },
            { id: "cilantro", name: "Chopped Cilantro" },
            { id: "onions", name: "Diced Onions" }
          ]
        }
      }
    }
    // Additional theme menus would go here
  }
};

// Hors d'oeuvres component data
export const horsDoeurvesComponentData = {
  title: "Hors d'oeuvres & Appetizers",
  categories: {
    passed: {
      title: "Passed Hors d'oeuvres",
      items: [
        {
          id: "tea_sandwiches",
          name: "Tea Sandwiches",
          lotSizes: [36, 48, 96, 144],
          options: [
            { id: "pate_pickled_veg", name: "Pate with pickled veg", price: 1.95 },
            { id: "cream_cheese_shrimp", name: "Cream Cheese and Shrimp", price: 2.50 },
            { id: "blt", name: "BLT - (Bacon Lettuce & Tomato)", price: 1.95 }
          ]
        },
        {
          id: "canapes",
          name: "Canapés",
          lotSizes: [36, 48, 96, 144],
          options: [
            { id: "smoked_salmon", name: "Smoked Salmon & Caviar", price: 3.95 },
            { id: "crab_cake", name: "Mini Crab Cake", price: 3.75 },
            { id: "stuffed_mushroom", name: "Stuffed Mushroom", price: 3.25 }
          ]
        }
      ]
    },
    stationary: {
      title: "Stationary Appetizers",
      items: [
        {
          id: "spreads",
          name: "Dips & Spreads",
          servingSizes: [25, 50, 75, 100],
          options: [
            { id: "hummus", name: "Hummus with Pita", price: 2.75 },
            { id: "spinach_artichoke", name: "Spinach & Artichoke Dip", price: 3.25 },
            { id: "guacamole", name: "Guacamole with Tortilla Chips", price: 3.50 }
          ]
        },
        {
          id: "charcuterie",
          name: "Charcuterie & Cheese Boards",
          servingSizes: [25, 50, 75, 100],
          basePrice: 8.75,
          options: [
            { id: "classic", name: "Classic Assortment", price: 0 },
            { id: "mediterranean", name: "Mediterranean Style", price: 1.50 },
            { id: "artisanal", name: "Artisanal Selection", price: 3.75 }
          ]
        }
      ]
    }
  }
};