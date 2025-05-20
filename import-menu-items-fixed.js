/**
 * Menu Items Import Script - Fixed Version
 * 
 * This script imports predefined menu items into the library questions system
 * with properly formatted options for display in the form editor.
 */

import fetch from 'node-fetch';

// Configuration
const API_ENDPOINT_URL = "http://localhost:5000/api/form-builder/library-questions";
const USERNAME = "admin";
const PASSWORD = "admin123";

/**
 * Helper function to make authenticated API requests
 */
async function makeRequest(url, data) {
  try {
    const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Format options for checkbox_group or radio_group question types
 * Each option should have a label, value structure (not just strings)
 */
function formatOptions(optionsArray) {
  return optionsArray.map(option => ({
    label: option,
    value: option.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  }));
}

/**
 * Create a library question
 */
async function createLibraryQuestion(data) {
  console.log(`Creating library question: ${data.defaultText}`);
  
  // Format the options properly if they exist
  if (data.defaultOptions && Array.isArray(data.defaultOptions)) {
    data.defaultOptions = formatOptions(data.defaultOptions);
  }
  
  const result = await makeRequest(API_ENDPOINT_URL, data);
  
  if (result.success) {
    console.log(`✅ Successfully created: ${data.defaultText}`);
  } else {
    console.error(`❌ Failed to create: ${data.defaultText}`);
    console.error(result.data || result.error);
  }
  console.log('---');
  
  return result;
}

/**
 * Import all menu items
 */
async function importMenuItems() {
  console.log("Starting menu items import with properly formatted options...");
  
  // ------ TACO FIESTA SECTION ------
  console.log("### IMPORTING TACO FIESTA SECTIONS ###");
  
  // Taco Fiesta - Proteins
  await createLibraryQuestion({
    libraryQuestionKey: "taco_fiesta_proteins_fixed",
    defaultText: "Taco Fiesta - Proteins (Selection limits vary by package)",
    questionType: "checkbox_group",
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
  });
  
  // Taco Fiesta - Sides
  await createLibraryQuestion({
    libraryQuestionKey: "taco_fiesta_sides_fixed",
    defaultText: "Taco Fiesta - Sides (Selection limits vary by package)",
    questionType: "checkbox_group",
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
  });
  
  // Taco Fiesta - Salsas
  await createLibraryQuestion({
    libraryQuestionKey: "taco_fiesta_salsas_fixed",
    defaultText: "Taco Fiesta - Salsas (Selection limits vary by package)",
    questionType: "checkbox_group",
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
  });
  
  // Taco Fiesta - Condiments
  await createLibraryQuestion({
    libraryQuestionKey: "taco_fiesta_condiments_fixed",
    defaultText: "Taco Fiesta - Condiments (Selection limits vary by package)",
    questionType: "checkbox_group",
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
  });
  
  console.log("Menu items import complete!");
}

// Run the import function
importMenuItems().catch(err => {
  console.error("Error importing menu items:", err);
  process.exit(1);
});