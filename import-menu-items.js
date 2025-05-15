// Script to import menu items from the provided JSON
import axios from 'axios';

// Parse the menu items from the JSON data
const menuData = [
  {
    "itemName": "Shoestring Fries",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Crispy fries with sea salt.",
    "ingredients": ["Potatoes", "Vegetable Oil", "Sea Salt"],
    "dietaryNotes": {
      "vegetarian": true,
      "vegan": true,
      "glutenFree": true,
      "dairyFree": true,
      "nutFree": true
    }
  },
  {
    "itemName": "Asian Street Fries",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Fries topped with tangy chili-garlic sauce and peanut powder.",
    "ingredients": ["Potatoes", "Vegetable Oil", "Tangy Chili-Garlic Sauce", "Peanut Powder"],
    "dietaryNotes": {
      "vegetarian": true,
      "vegan": false,
      "glutenFree": true,
      "dairyFree": true,
      "nutFree": false
    }
  },
  {
    "itemName": "Cajun Fries",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Fries with Cajun seasoning and harissa aioli.",
    "ingredients": ["Potatoes", "Vegetable Oil", "Cajun Seasoning", "Harissa Aioli (eggs, oil, harissa)"],
    "dietaryNotes": {
      "vegetarian": true,
      "vegan": false,
      "glutenFree": true,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Greek Fries",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Fries with feta, onions, oregano, and yogurt sauce.",
    "ingredients": ["Potatoes", "Vegetable Oil", "Feta Cheese", "Onions", "Oregano", "Yogurt Sauce"],
    "dietaryNotes": {
      "vegetarian": true,
      "vegan": false,
      "glutenFree": true,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Mac n' Cheese",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Elbow pasta with cheddar, cream, green onions, and breadcrumbs; optional chorizo, bacon, or jalapeños.",
    "ingredients": ["Elbow Pasta", "Cheddar Cheese", "Cream", "Green Onions", "Breadcrumbs", "Optional: Chorizo, Bacon, Jalapeños"],
    "dietaryNotes": {
      "vegetarian": true,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Spanakopita Samosas",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Samosas filled with spinach, Swiss chard, leeks, herbs, and feta, served with minted yogurt sauce.",
    "ingredients": ["Samosa Pastry (flour)", "Spinach", "Swiss Chard", "Leeks", "Herbs", "Feta Cheese", "Minted Yogurt Sauce"],
    "dietaryNotes": {
      "vegetarian": true,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Bang-Bang Popcorn Shrimp",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Crispy shrimp tossed in sweet and spicy Bang-Bang sauce.",
    "ingredients": ["Shrimp", "Batter (flour, spices)", "Bang-Bang Sauce (mayonnaise, sweet chili sauce, sriracha)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": true,
      "nutFree": true
    }
  },
  {
    "itemName": "Korean Pork Belly Bites",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Seared pork belly cubes glazed in Korean BBQ sauce.",
    "ingredients": ["Pork Belly", "Korean BBQ Sauce (soy, sugar, garlic, ginger)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": true,
      "nutFree": true
    }
  },
  {
    "itemName": "Sesame Tofu Bites",
    "category": "Small Bites",
    "pricePerPerson": null,
    "description": "Tofu coated with sesame seeds, served with choice of Teriyaki, garlic honey, or sweet Thai chili sauce.",
    "ingredients": ["Tofu", "Sesame Seeds", "Choice of Sauce: Teriyaki, Garlic Honey, Sweet Thai Chili"],
    "dietaryNotes": {
      "vegetarian": true,
      "vegan": true,
      "glutenFree": true,
      "dairyFree": true,
      "nutFree": false
    }
  },
  {
    "itemName": "The Big Cheese",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "7oz beef patty with cheddar, Monterey, Swiss, lettuce, tomato, red onion, and Bang-Bang sauce on a brioche bun.",
    "ingredients": ["Beef Patty (7oz)", "Cheddar Cheese", "Monterey Jack Cheese", "Swiss Cheese", "Lettuce", "Tomato", "Red Onion", "Bang-Bang Sauce", "Brioche Bun (flour, eggs, butter)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Delirious Mushroom Burger",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "7oz beef patty with sautéed mushrooms, bacon, Gruyère, caramelized onions, arugula, and harissa aioli.",
    "ingredients": ["Beef Patty (7oz)", "Sautéed Mushrooms", "Bacon", "Gruyère Cheese", "Caramelized Onions", "Arugula", "Harissa Aioli", "Brioche Bun (flour, eggs, butter)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "California Dreaming Chicken Burger",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Grilled chicken breast with red onion, lettuce, tomato, avocado, mozzarella, and citrus aioli.",
    "ingredients": ["Grilled Chicken Breast", "Red Onion", "Lettuce", "Tomato", "Avocado", "Mozzarella Cheese", "Citrus Aioli", "Bun (flour)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Mike's Reuben",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Corned beef with Swiss cheese and Bang-Bang slaw on grilled rye.",
    "ingredients": ["Corned Beef", "Swiss Cheese", "Bang-Bang Slaw (cabbage, Bang-Bang sauce)", "Grilled Rye Bread (flour)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "The Rachael",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Roasted turkey, Swiss cheese, coleslaw, and thousand island dressing on marble rye.",
    "ingredients": ["Roasted Turkey", "Swiss Cheese", "Coleslaw (cabbage, mayonnaise)", "Thousand Island Dressing", "Marble Rye Bread (flour)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Cubano",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Roasted pork tenderloin, black forest ham, Swiss cheese, pickles, and mustard on Cuban bread.",
    "ingredients": ["Roasted Pork Tenderloin", "Black Forest Ham", "Swiss Cheese", "Pickles", "Mustard", "Cuban Bread (flour)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Cajun Salmon Sandwich",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Blackened Sockeye salmon with cabbage/fennel slaw and citrus aioli on Cuban bread.",
    "ingredients": ["Blackened Sockeye Salmon", "Cabbage/Fennel Slaw", "Citrus Aioli", "Cuban Bread (flour)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Banh Mi",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Choice of chicken, pork, or sesame tofu with hoisin sauce, pickled vegetables, cucumbers, and habanero/cilantro aioli on French bread.",
    "ingredients": ["Choice of: Chicken, Pork, or Sesame Tofu", "Hoisin Sauce", "Pickled Vegetables (carrots, daikon)", "Cucumbers", "Habanero/Cilantro Aioli", "French Bread (flour)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Nikki's Chicken Bites",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Gluten-free chicken nuggets made with rice panko and potato starch, served with choice of sauce.",
    "ingredients": ["Chicken", "Rice Panko", "Potato Starch", "Choice of Sauce"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": true,
      "dairyFree": true,
      "nutFree": true
    }
  },
  {
    "itemName": "The Real Greek Gyro Wrap",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Homemade beef gyro meat with tomato, onions, and tzatziki in grilled pita.",
    "ingredients": ["Beef Gyro Meat", "Tomato", "Onions", "Tzatziki Sauce (yogurt, cucumber, garlic)", "Grilled Pita Bread (flour)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Barbacoa Quesadilla",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Beef, fried onions, and cheese in a toasted flour tortilla, served with pico de gallo.",
    "ingredients": ["Beef Barbacoa", "Fried Onions", "Cheese (Monterey Jack or similar)", "Toasted Flour Tortilla", "Pico de Gallo (tomatoes, onions, cilantro, lime)"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  },
  {
    "itemName": "Crispy Chicken Wings",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Nine wings seasoned with rotisserie spice rub, served with choice of sauce.",
    "ingredients": ["Chicken Wings (9 pieces)", "Rotisserie Spice Rub", "Choice of Sauce"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": true,
      "dairyFree": true,
      "nutFree": true
    }
  },
  {
    "itemName": "Korean Pork Belly Sandwich",
    "category": "Big Bites",
    "pricePerPerson": null,
    "description": "Pork belly with Asian slaw and cucumber slices on a brioche bun, drizzled with Korean BBQ sauce.",
    "ingredients": ["Pork Belly", "Asian Slaw (cabbage, carrots, dressing)", "Cucumber Slices", "Brioche Bun (flour, eggs, butter)", "Korean BBQ Sauce"],
    "dietaryNotes": {
      "vegetarian": false,
      "vegan": false,
      "glutenFree": false,
      "dairyFree": false,
      "nutFree": true
    }
  }
];

// Login to get a session cookie
async function login() {
  try {
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'password'
    });
    
    return loginResponse.headers['set-cookie'][0];
  } catch (error) {
    console.error('Login failed:', error.message);
    return null;
  }
}

// Import menu items function
async function importMenuItems() {
  const cookie = await login();
  if (!cookie) {
    console.error('Failed to authenticate. Cannot import menu items.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const item of menuData) {
    try {
      // Transform the data to match the API expectations
      const menuItemData = {
        name: item.itemName,
        description: item.description,
        category: item.category,
        price: null, // Price is null as per requirement
        ingredients: item.ingredients.join(', '),
        isVegetarian: item.dietaryNotes.vegetarian,
        isVegan: item.dietaryNotes.vegan,
        isGlutenFree: item.dietaryNotes.glutenFree,
        isDairyFree: item.dietaryNotes.dairyFree,
        isNutFree: item.dietaryNotes.nutFree
      };

      const response = await axios.post('http://localhost:3000/api/menu-items', menuItemData, {
        headers: {
          'Cookie': cookie,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Added menu item: ${item.itemName}`);
      successCount++;
    } catch (error) {
      console.error(`Failed to add ${item.itemName}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\nImport complete. Successfully added ${successCount} menu items. Failed: ${errorCount}`);
}

// Run the import
importMenuItems();