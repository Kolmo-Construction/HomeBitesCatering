// Sandwich Factory Menu Data
export const sandwichFactoryData = {
  packages: [
    {
      id: "classic",
      name: "Classic Package",
      price: 14.95,
      description: "A selection of classic sandwich options with sides",
      minGuestCount: 10
    },
    {
      id: "premium",
      name: "Premium Package",
      price: 18.95,
      description: "Upgraded sandwich selections with premium sides and salads",
      minGuestCount: 10
    },
    {
      id: "deluxe",
      name: "Deluxe Package",
      price: 22.95,
      description: "Our top-tier sandwich experience with full sides and salad bar",
      minGuestCount: 15
    }
  ],
  limits: {
    classic: {
      spreads: 2,
      salads: 0
    },
    premium: {
      spreads: 3,
      salads: 1
    },
    deluxe: {
      spreads: 4,
      salads: 2
    }
  },
  options: {
    meats: [
      "Turkey",
      "Ham",
      "Roast Beef",
      "Salami",
      "Pastrami",
      "Grilled Chicken",
      "Tuna Salad",
      "Chicken Salad"
    ],
    cheeses: [
      "American",
      "Swiss",
      "Provolone",
      "Cheddar",
      "Pepper Jack",
      "Mozzarella",
      "Muenster"
    ],
    vegetables: [
      "Lettuce",
      "Tomato",
      "Onion",
      "Pickles",
      "Roasted Peppers",
      "Banana Peppers",
      "Olives",
      "Cucumber",
      "Sprouts"
    ],
    breads: [
      "White",
      "Wheat",
      "Rye",
      "Sourdough",
      "Italian",
      "Ciabatta",
      "Wrap",
      "Croissant"
    ],
    spreads: [
      "Mayo",
      "Mustard",
      "Honey Mustard",
      "Chipotle Mayo",
      "Pesto",
      "Hummus",
      "Oil & Vinegar"
    ],
    salads: [
      "Garden Salad",
      "Caesar Salad",
      "Pasta Salad",
      "Potato Salad",
      "Coleslaw",
      "Greek Salad"
    ]
  }
};
