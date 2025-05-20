/**
 * Menu Items Import Script
 * 
 * This script imports predefined menu items into the library questions system.
 * It includes various cuisine types with their respective menu options.
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
 * Create a library question
 */
async function createLibraryQuestion(data) {
  console.log(`Creating library question: ${data.defaultText}`);
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
  console.log("Starting menu items import...");
  
  // ------ TACO FIESTA SECTION ------
  console.log("### IMPORTING TACO FIESTA SECTIONS ###");
  
  // Taco Fiesta - Proteins
  await createLibraryQuestion({
    libraryQuestionKey: "taco_fiesta_proteins",
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
    libraryQuestionKey: "taco_fiesta_sides",
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
    libraryQuestionKey: "taco_fiesta_salsas",
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
    libraryQuestionKey: "taco_fiesta_condiments",
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
  
  // ------ AMERICAN BBQ SECTION ------
  console.log("### IMPORTING AMERICAN BBQ SECTIONS ###");
  
  // American BBQ - Mains
  await createLibraryQuestion({
    libraryQuestionKey: "american_bbq_mains",
    defaultText: "American BBQ - Mains/Protein Choice (Selection limits vary by package)",
    questionType: "checkbox_group",
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
  });
  
  // American BBQ - Sides
  await createLibraryQuestion({
    libraryQuestionKey: "american_bbq_sides",
    defaultText: "American BBQ - Side Choice (Selection limits vary by package)",
    questionType: "checkbox_group",
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
  });
  
  // American BBQ - Salads
  await createLibraryQuestion({
    libraryQuestionKey: "american_bbq_salads",
    defaultText: "American BBQ - Salad Choice (Selection limits vary by package)",
    questionType: "checkbox_group",
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
  });
  
  // American BBQ - Sauces
  await createLibraryQuestion({
    libraryQuestionKey: "american_bbq_sauces",
    defaultText: "American BBQ - Sauce Choice (Selection limits vary by package)",
    questionType: "checkbox_group",
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
  });
  
  // American BBQ - Condiments
  await createLibraryQuestion({
    libraryQuestionKey: "american_bbq_condiments",
    defaultText: "American BBQ - Condiment Choice (Selection limits vary by package)",
    questionType: "checkbox_group",
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
      "Kimchi",
      "Mixed Pickled Vegetables - Giardiniera"
    ]
  });

  // ------ A TASTE OF GREECE SECTION ------
  console.log("### IMPORTING A TASTE OF GREECE SECTIONS ###");
  
  // A Taste of Greece - Mains
  await createLibraryQuestion({
    libraryQuestionKey: "taste_of_greece_mains",
    defaultText: "A Taste of Greece - Mains (Selection limits vary by package)",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Papoutsakia -Classic moussaka in individual hollowed eggplant shells with seasoned ground beef and topped with creamy bechamel",
      "Soutzoukakia -Plump oblong-shaped meatballs are packed with loads of aromatics and fresh herbs, smothered in a cinnamon wine-enhanced tomato sauce.",
      "Kokinisto - Boneless short rib slowly cooked in cinnamon-scented tomato sauce.",
      "Kleftiko - (Family style only - **upcharge of $5.00 pp**)- Boldly seasoned lamb roast that cooks with new potatoes, celery, and carrots, low and slow for 6 hours, in a parchment paper pouch.",
      "Pastitsio Classic baked pasta dish with cinnamon-scented ground meat and creamy béchamel sauce.",
      "Kotopoulo lemonato Aromatic and lemony baked chicken with fresh herbs.",
      "Paidakia (**upcharge of $4.00 per person**) These Greek lamb chops are marinated in a mix of olive oil, lemon juice, garlic and oregano and grilled to perfection",
      "Kotsi Arni - Slowly roasted lamb shank with tomato, herbs and robust spices such as cinnamon and clove.",
      "Bifteki Gemisto - Aromatic oven-baked minced beef 'burgers', stuffed with cheese and topped with tomato relish.",
      "Psari Plaki Oven-baked fish fillet topped with fresh tomato slices, onion, and fresh herbs",
      "Brizola Solomou Grilled salmon steaks with fresh herbs, lemon, and evoo.",
      "Bakaliaros Plaki - Oven-baked Cod fish fillet topped with fresh tomato slices, onion, and fresh herbs",
      "Aginares -Ala Polita - Vegan option - Artichoke hearts braised with potatoes and carrots and finished with a lemony sauce with herbs and olive oil."
    ]
  });

  // A Taste of Greece - Sides
  await createLibraryQuestion({
    libraryQuestionKey: "taste_of_greece_sides",
    defaultText: "A Taste of Greece - Sides (Selection limits vary by package)",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Spanakopita - Spinach and Feta Pie",
      "Tiropita - Cheese Pie",
      "Dolmades - Stuffed Grape Leaves",
      "Greek Roasted Potatoes",
      "Greek-Style Rice",
      "Souvlaki",
      "Grilled Vegetables",
      "Roasted Eggplant Dip (Melitzanosalata)",
      "Hummus",
      "Tzatziki",
      "Spanakorizo - Spinach Rice",
      "Gigantes Plaki - Greek Baked Giant Beans",
      "Lemon Potatoes",
      "Fava - Yellow Split Pea Puree",
      "Skordalia - Garlic Dip"
    ]
  });

  // A Taste of Greece - Salads
  await createLibraryQuestion({
    libraryQuestionKey: "taste_of_greece_salads",
    defaultText: "A Taste of Greece - Salad Choice (Selection limits vary by package)",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Greek Salad - Classic combination of tomatoes, cucumbers, bell peppers, red onions, Kalamata olives, and feta cheese",
      "Cretan Dakos Salad - Barley rusks topped with grated tomato, feta, olives, capers, and herbs",
      "Politiki Salad - Cabbage, carrot and celery salad with a vinegar dressing",
      "Marouli Salad - Romaine lettuce with fresh dill and spring onions in a light dressing"
    ]
  });

  // A Taste of Italy sections
  console.log("### IMPORTING A TASTE OF ITALY SECTIONS ###");
  
  // A Taste of Italy - Mains
  await createLibraryQuestion({
    libraryQuestionKey: "taste_of_italy_mains",
    defaultText: "A Taste of Italy - Mains (Selection limits vary by package)",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Meatballs",
      "Italian Sausage with Peppers and Onions",
      "Eggplant Parmesan",
      "Chicken Parmesan",
      "Chicken Piccata - Lemon Caper Sauce",
      "Chicken Marsala",
      "Chicken Cacciatore",
      "Chicken Saltimbocca",
      "Veal Parmesan (**upcharge of $3.00 pp**)",
      "Veal Piccata (**upcharge of $3.00 pp**)",
      "Veal Marsala (**upcharge of $3.00 pp**)",
      "Veal Saltimbocca (**upcharge of $3.00 pp**)",
      "Ossobuco - Braised Veal Shanks (**upcharge of $4.00 pp**)",
      "Tuscan Steak - Steak with Rosemary, Garlic & Olive Oil (**upcharge of $3.00 pp**)",
      "Porchetta - Stuffed, Rolled, and Roasted Pork Belly (**upcharge of $2.00 pp**)",
      "Pork Involtini",
      "Shrimp Scampi",
      "Baked Shrimp",
      "Linguine with Clams",
      "Baked Salmon",
      "Italian Stuffed Peppers",
      "Vegetarian Lasagna",
      "Eggplant Involtini"
    ]
  });

  // A Taste of Italy - Pasta
  await createLibraryQuestion({
    libraryQuestionKey: "taste_of_italy_pasta",
    defaultText: "A Taste of Italy - Pasta Choice (Selection limits vary by package)",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Spaghetti and Meatballs",
      "Fettuccine Alfredo",
      "Spaghetti Carbonara",
      "Lasagna Bolognese",
      "Lasagna Vegetarian",
      "Baked Ziti",
      "Stuffed Shells",
      "Rigatoni with Vodka Sauce",
      "Gnocchi with Brown Butter and Sage",
      "Linguine with Clam Sauce",
      "Cacio e Pepe",
      "Tortellini with Pesto",
      "Cheese Ravioli with Tomato Sauce",
      "Lobster Ravioli (**upcharge of $2.00 pp**)",
      "Mushroom Risotto",
      "Seafood Risotto (**upcharge of $3.00 pp**)",
      "Truffle Risotto (**upcharge of $3.00 pp**)"
    ]
  });

  // A Taste of Italy - Sides
  await createLibraryQuestion({
    libraryQuestionKey: "taste_of_italy_sides",
    defaultText: "A Taste of Italy - Sides (Selection limits vary by package)",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Garlic Bread",
      "Rosemary Focaccia",
      "Bruschetta",
      "Caprese Salad",
      "Italian Green Beans",
      "Roasted Vegetables",
      "Grilled Asparagus",
      "Roasted Potatoes with Rosemary",
      "Polenta",
      "Risotto",
      "Ratatouille",
      "Italian Bread Basket"
    ]
  });

  // A Taste of Italy - Salads
  await createLibraryQuestion({
    libraryQuestionKey: "taste_of_italy_salads",
    defaultText: "A Taste of Italy - Salad Choice (Selection limits vary by package)",
    questionType: "checkbox_group",
    category: "menu_info",
    defaultOptions: [
      "Caesar Salad",
      "Caprese Salad",
      "Arugula with Parmesan",
      "Italian Chopped Salad",
      "Tuscan Kale Salad",
      "Antipasto Salad",
      "Insalata Mista - Mixed Greens with Balsamic Vinaigrette"
    ]
  });

  console.log("Menu items import complete!");
}

// Run the import function
importMenuItems().catch(err => {
  console.error("Error importing menu items:", err);
  process.exit(1);
});