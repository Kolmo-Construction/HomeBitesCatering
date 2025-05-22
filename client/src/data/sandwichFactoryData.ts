export const sandwichFactoryData = {
  title: "Sandwich Factory - Catering Packages",
  description: "Select a package that suits your needs and customize your sandwich options",
  packages: [
    { 
      id: "bronze",
      name: "Bronze Package", 
      price: 13.00,
      description: "Includes: Meats, Cheeses, Veggies, & four condiments, White, multigrain, and whole wheat breads.",
      minGuestCount: 10
    },
    { 
      id: "silver",
      name: "Silver Package", 
      price: 18.00,
      description: "Includes: Meats, cheeses, veggies, & five condiments, White, Multigrain, and whole wheat breads, croissants, bagels, and two salads.",
      minGuestCount: 10
    },
    { 
      id: "gold",
      name: "Gold Package", 
      price: 23.00,
      description: "Includes Premium meats & cheeses, veggies, fruits & six condiments, White, multigrain, whole wheat sliced breads, croissants, bagels, and two salads.",
      minGuestCount: 10
    },
    { 
      id: "diamond",
      name: "Diamond Package", 
      price: 28.00,
      description: "Includes Premium meats & cheeses, veggies, & six condiments, White, multigrain, and whole wheat breads, croissants, bagels and rolls, three salads, and fresh fruit grazing board.",
      minGuestCount: 10
    }
  ],
  options: {
    meats: [
      "Smoked Turkey",
      "Black Forest Ham",
      "Pepperoni",
      "Salami",
      "Roast Beef",
      "Pastrami"
    ],
    cheeses: [
      "Cheddar Cheese",
      "Swiss Cheese",
      "Monterey Cheese",
      "Havarti",
      "Brie",
      "Gouda",
      "Cream Cheese"
    ],
    vegetables: [
      "Lettuce",
      "Tomato",
      "Onion",
      "Avocado",
      "Spinach",
      "Arugula",
      "Pickle",
      "Bell Pepper",
      "Cucumber",
      "Olives",
      "Sprouts"
    ],
    breads: [
      "Sourdough",
      "Rye",
      "Multigrain Bread",
      "Whole Wheat Bread",
      "White Bread",
      "Bagels",
      "Croissants",
      "Rolls"
    ],
    spreads: [
      "Classic Mayo",
      "Vegan Mayo",
      "Cranberry Mayo",
      "Stone Ground Mustard",
      "Dijon Mustard",
      "Vegan Cilantro jalapeño aioli",
      "Citrus Aioli",
      "Basil Aioli",
      "Horseradish Aioli",
      "Cranberry relish",
      "Classic Sweet Pickle Relish",
      "Balsamic Fig Relish",
      "Avocado Cilantro & Lime Spread",
      "Eggplant & Tahini Spread",
      "Pomegranate / pepper / walnut spread",
      "Lebanese garlic Spread (very garlicky)"
    ],
    salads: [
      "Kale Salad",
      "Greek Village Salad",
      "Italian Pasta Salad",
      "Tabouli Salad",
      "German Cucumber Salad",
      "Wedge Salad",
      "Classic Potato Salad",
      "Tossed Cobb",
      "Crunchy Asian Salad",
      "Caesar Salad",
      "Garden Salad",
      "Lebanese Bread Salad (Fattoush)"
    ]
  },
  limits: {
    bronze: {
      spreads: 4,
      salads: 0
    },
    silver: {
      spreads: 5,
      salads: 2
    },
    gold: {
      spreads: 6,
      salads: 2
    },
    diamond: {
      spreads: 6,
      salads: 3
    }
  }
};