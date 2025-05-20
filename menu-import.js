// Import script for menu items
import axios from 'axios';
import fs from 'fs';

const API_BASE_URL = 'http://localhost:5000';
const API_ENDPOINT = '/api/form-builder/library-questions';
let authCookie = '';

// Login to get authentication cookie
async function login() {
  console.log('Attempting to login...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin'
    }, {
      withCredentials: true
    });
    
    if (response.headers['set-cookie']) {
      authCookie = response.headers['set-cookie'][0];
      console.log('Login successful!');
      return true;
    } else {
      console.log('Login successful but no cookie received');
      return false;
    }
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Create a library question
async function createLibraryQuestion(data) {
  try {
    console.log(`Creating question: ${data.defaultText}`);
    const response = await axios.post(`${API_BASE_URL}${API_ENDPOINT}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      }
    });
    console.log(`Created successfully! Response:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to create question:', error.response?.data || error.message);
    return null;
  }
}

// Main import function
async function importMenuItems() {
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Failed to login. Cannot proceed with import.');
    return;
  }
  
  console.log('\n--- Starting Menu Items Import ---\n');

  // Define all menu item categories
  const menuItems = [
    // Taco Fiesta - Proteins
    {
      libraryQuestionKey: "taco_fiesta_proteins",
      defaultText: "Taco Fiesta - Proteins (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Barbacoa",
        "Flank steak Fajitas - **upcharge of $2.00 pp**",
        "Ground Beef",
        "Pork Carnitas",
        "Pork Belly",
        "Chorizo",
        "Beef Birria",
        "Mexican Chicken",
        "Cod",
        "Shrimp",
        "Tofu",
        "Roasted Vegetables",
        "Escabeche - House-made picked vegetable medley"
      ]
    },

    // Taco Fiesta - Sides
    {
      libraryQuestionKey: "taco_fiesta_sides",
      defaultText: "Taco Fiesta - Sides (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Refried Beans",
        "Mexican Street corn (Elotes)",
        "Queso Dip",
        "Chorizo Queso Dip",
        "Stuffed Poblano peppers",
        "Mexican Rice",
        "Cilantro Lime Rice",
        "Rice and Beans",
        "Jalapeno cornbread",
        "Grilled Vegetables",
        "Mexican Slaw with Mango",
        "Vegetarian Empanadas"
      ]
    },

    // Taco Fiesta - Salsas
    {
      libraryQuestionKey: "taco_fiesta_salsas",
      defaultText: "Taco Fiesta - Salsas (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Classic Pico de Gallo",
        "Fresh Mango Salsa",
        "Pineapple Habanero Salsa",
        "Cucumber & Apple Salsa",
        "Jicama and Papaya Salsa",
        "Salsa Roja (red sauce)",
        "Salsa Verde (green sauce)",
        "Creamy Salsa Verde (green sauce)",
        "Salsa Macha -(contains peanuts and sesame seeds)"
      ]
    },

    // Taco Fiesta - Condiments
    {
      libraryQuestionKey: "taco_fiesta_condiments",
      defaultText: "Taco Fiesta - Condiments (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Shredded cheese",
        "Shredded vegan cheese",
        "Diced Onions",
        "Lime wedges",
        "Jalapeños",
        "Sour Cream",
        "Diced bell peppers",
        "Guacamole",
        "Fire roasted bell peppers",
        "Sliced radish",
        "Cilantro",
        "Pickled cabbage",
        "Escabeche - House-made picked vegetable medley"
      ]
    },

    // American BBQ - Mains/Protein Choice
    {
      libraryQuestionKey: "american_bbq_mains",
      defaultText: "American BBQ - Mains/Protein Choice (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Prime Rib - Boneless -Carving station (**upcharge of $4.00 pp**)",
        "Smoked Brisket (**upcharge $2.00 pp**)",
        "Beef Ribs (**upcharge $3.00 pp** or **$4.00 pp in Diamond**)",
        "Guinness Braised Boneless Short Ribs (**upcharge $2.00 pp**)",
        "Bacon Wrapped Fillet Mingon - (**upcharge of $4.00 pp**)",
        "Flank Steak with Chimichurri",
        "Sausage Medley",
        "Hamburger Bar (**upcharge of $1.50 pp**) (includes full condiment bar for Silver)",
        "Lamb Chops (**upcharge of $3.00 pp**)",
        "Smoked Leg of Lamb (Family Style only)",
        "Pulled Pork",
        "Smoked pork Belly",
        "Baby Back Ribs",
        "Bone-in, thick-cut, Grilled Pork Chop with Korean BBQ glaze",
        "BBQ Guiness Chicken (**upcharge of $1.00 pp for Silver**)",
        "Carolina BBQ Chicken",
        "Rotisserie Chicken",
        "BBQ Prawns (**upcharge of $1.00 pp**) / BBQ Black Tiger Prawns (**upcharge of $2.00 pp for Silver**)",
        "Salmon steak",
        "Tofu",
        "Vegetable kebabs",
        "Grilled Cauliflower Steaks"
      ]
    },

    // American BBQ - Side Choice
    {
      libraryQuestionKey: "american_bbq_sides",
      defaultText: "American BBQ - Side Choice (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Ham hock baked Beans",
        "Avocado deviled Eggs",
        "Mac n' Cheese",
        "Stuffed Poblano peppers",
        "Baked Potato Bar (**upcharge $1.50 pp**)",
        "Garlic Mashed Potatoes",
        "Mini Smashed Potatoes",
        "Twice Baked Potatoes (**upcharge $0.50 pp** or **$0.75 pp for Custom**)",
        "Corn on the Cob",
        "Creamed Corn",
        "Jalapeño Poppers",
        "Roasted Brussels Sprouts",
        "Corn Bread",
        "Jalapeno cornbread",
        "Grilled Vegetables",
        "Grilled Asparagus"
      ]
    },

    // American BBQ - Salad Choice
    {
      libraryQuestionKey: "american_bbq_salads",
      defaultText: "American BBQ - Salad Choice (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Caesar",
        "Coleslaw",
        "Garden Salad",
        "Pasta Salad",
        "Bacon Jalapeño Corn Salad",
        "Wedge Salad",
        "German cucumber salad",
        "Crunchy Asian Slaw",
        "Tossed Cobb Salad",
        "Classic Potato Salad",
        "German Potato Salad",
        "Macaroni Salad",
        "Hawaiian Macaroni Salad",
        "Fruit Salad"
      ]
    },

    // American BBQ - Sauce Choice
    {
      libraryQuestionKey: "american_bbq_sauces",
      defaultText: "American BBQ - Sauce Choice (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Kansas City BBQ Sauce",
        "South Carolina Gold BBQ Sauce",
        "North Carolina Vinegar based BBQ Sauce",
        "Alabama White BBQ Sauce",
        "Texas BBQ Sauce",
        "Very Berry BBQ Sauce",
        "Smoky bourbon BBQ Sauce"
      ]
    },

    // American BBQ - Condiment Choice
    {
      libraryQuestionKey: "american_bbq_condiments",
      defaultText: "American BBQ - Condiment Choice (Selection limits vary by package)",
      questionType: "checkbox",
      category: "menu_info",
      defaultOptions: [
        "Ketchup",
        "Stone Ground Mustard",
        "Dijon Mustard",
        "Yellow Mustard",
        "Mayonnaise",
        "Sweet pickle Chips",
        "Dill pickle Chips",
        "Sliced radish",
        "Sweet Relish",
        "Cranberry Relish",
        "Kimchi"
      ]
    }
  ];

  // Process each menu item
  for (const item of menuItems) {
    await createLibraryQuestion(item);
    // Add a small delay between requests to prevent flooding the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n--- Menu Items Import Completed ---\n');
}

// Run the import function
importMenuItems()
  .then(() => console.log('Script execution completed.'))
  .catch(err => console.error('Error in script execution:', err));