/**
 * Sandwich Factory Menu Import Script
 * 
 * This script imports Sandwich Factory catering packages and menu options
 * into the library questions system with properly formatted options.
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
 * Import all Sandwich Factory menu items
 */
async function importSandwichFactoryMenu() {
  console.log("Starting Sandwich Factory menu items import...");
  
  // ------ SANDWICH FACTORY PACKAGE SELECTION ------
  console.log("### IMPORTING SANDWICH FACTORY PACKAGES ###");
  
  // Package Selection
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_package",
    defaultText: "Sandwich Factory - Select a Catering Package",
    questionType: "radio_group",
    category: "menu_info",
    defaultOptions: [
      "Bronze Package - from $13 per person",
      "Silver Package - from $18 per person",
      "Gold Package - from $23 per person",
      "Diamond Package - from $28 per person"
    ]
  });
  
  // Package descriptions
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_package_descriptions",
    defaultText: "Package Details",
    questionType: "info_text",
    category: "menu_info",
    defaultHelpText: `
      <strong>Bronze Package</strong>: Includes Meats, Cheeses, Veggies, & four condiments, White, multigrain, and whole wheat breads.
      <strong>Silver Package</strong>: Includes Meats, cheeses, veggies, & five condiments, White, Multigrain, and whole wheat breads, croissants, bagels, and two salads.
      <strong>Gold Package</strong>: Includes Premium meats & cheeses, veggies, fruits & six condiments, White, multigrain, whole wheat sliced breads, croissants, bagels, and two salads.
      <strong>Diamond Package</strong>: Includes Premium meats & cheeses, veggies, & six condiments, White, multigrain, and whole wheat breads, croissants, bagels and rolls, three salads, and fresh fruit grazing board.
    `
  });
  
  // ------ SANDWICH FACTORY MENU OPTIONS ------
  console.log("### IMPORTING SANDWICH FACTORY MENU OPTIONS ###");
  
  // Meat Options
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_meats",
    defaultText: "Sandwich Factory - Meat Selection",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Smoked Turkey",
      "Black Forest Ham",
      "Pepperoni",
      "Salami",
      "Roast Beef",
      "Pastrami"
    ]
  });
  
  // Cheese Options
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_cheeses",
    defaultText: "Sandwich Factory - Cheese Selection",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Cheddar Cheese",
      "Swiss Cheese",
      "Monterey Cheese",
      "Havarti",
      "Brie",
      "Gouda",
      "Cream Cheese"
    ]
  });
  
  // Sandwich Veggies
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_veggies",
    defaultText: "Sandwich Factory - Veggie Selection",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
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
    ]
  });
  
  // Bread Options
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_breads",
    defaultText: "Sandwich Factory - Bread Selection",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Sourdough",
      "Rye",
      "Multigrain Bread",
      "Whole Wheat Bread",
      "White Bread",
      "Bagels",
      "Croissants",
      "Rolls"
    ]
  });
  
  // Condiments/Spreads
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_spreads",
    defaultText: "Sandwich Factory - Sandwich Spreads/Condiments",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultHelpText: "Bronze Package: Choose 4, Silver Package: Choose 5, Gold/Diamond Package: Choose 6",
    defaultOptions: [
      "Classic Mayo",
      "Vegan Mayo",
      "Chipotle Mayo",
      "Dijon Mustard",
      "Honey Mustard",
      "Stone Ground Mustard",
      "Pesto (contains nuts)",
      "Vegan Pesto (contains nuts)",
      "Vegan Caesar (contains cashews)",
      "Hummus",
      "Baba Ganoush",
      "Olive Tapenade",
      "Sun-dried Tomato Pesto",
      "Ranch Dressing",
      "Italian Dressing",
      "Balsamic Vinaigrette",
      "Fig Jam",
      "Red Pepper Jelly",
      "Cranberry Sauce",
      "Horseradish Aioli",
      "Garlic Aioli",
      "Spicy Aioli",
      "Tahini Sauce",
      "Guacamole",
      "Salsa",
      "Artichoke Dip",
      "Caramelized Onion Jam",
      "Roasted Red Pepper Spread"
    ]
  });
  
  // Salad Options
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_salads",
    defaultText: "Sandwich Factory - Salad Selection",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultHelpText: "Silver & Gold Package: Pick 2, Diamond Package: Pick 3",
    defaultOptions: [
      "Side Salad",
      "Greek Village Salad",
      "Caesar Salad",
      "Mediterranean Quinoa Salad",
      "Pasta Salad",
      "Potato Salad",
      "Coleslaw",
      "Fruit Salad",
      "Caprese Salad",
      "Asian Noodle Salad",
      "Beet Salad",
      "Lentil Salad",
      "Chickpea Salad",
      "Waldorf Salad",
      "Israeli Couscous Salad",
      "Tabbouleh Salad",
      "Black Bean and Corn Salad",
      "Spinach Salad with Strawberries",
      "Arugula Salad with Parmesan"
    ]
  });
  
  // Gluten Free Option
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_gluten_free",
    defaultText: "Do you want to add Gluten Free Bread?",
    questionType: "radio_group",
    category: "menu_info",
    defaultOptions: [
      "Yes",
      "No"
    ]
  });
  
  // Gluten Free Quantity
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_gluten_free_quantity",
    defaultText: "Gluten Free Bread Quantity",
    questionType: "number",
    category: "menu_info",
    defaultHelpText: "Gluten Free Bread ($0.50 / ea) - Enter Amount"
  });
  
  // Special Requests
  await createLibraryQuestion({
    libraryQuestionKey: "sandwich_factory_special_requests",
    defaultText: "Special Requests, Comments, or Dietary Restrictions",
    questionType: "textarea",
    category: "menu_info",
    defaultHelpText: "Please list any comments/concerns/special requests. There is a Dietary restriction page to follow."
  });
  
  console.log("Sandwich Factory menu import complete!");
}

// Run the import function
importSandwichFactoryMenu().catch(err => {
  console.error("Error importing Sandwich Factory menu items:", err);
  process.exit(1);
});