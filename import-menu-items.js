import fetch from 'node-fetch';
import fs from 'fs';

const API_ENDPOINT_URL = "http://localhost:5000/api/form-builder/library-questions";

// Function to login and get cookie
async function login() {
  console.log('Logging in to get authentication cookie...');
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin'
    })
  });

  if (!loginResponse.ok) {
    throw new Error(`Login failed with status ${loginResponse.status}`);
  }

  const setCookie = loginResponse.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No cookie received after login');
  }

  // Save cookie to file for subsequent requests
  fs.writeFileSync('cookie.txt', setCookie);
  console.log('Authentication cookie saved to cookie.txt');
  return setCookie;
}

// Function to create library question
async function createLibraryQuestion(data, cookie) {
  console.log(`Creating library question: ${data.defaultText}`);
  
  // Extract the actual cookie value without attributes like path, expires, etc.
  // This handles cases where the cookie contains semicolons which can cause 
  // ERR_INVALID_CHAR errors with the node-fetch library
  const simpleCookie = cookie.split(';')[0];
  
  const response = await fetch(API_ENDPOINT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': simpleCookie
    },
    body: JSON.stringify(data)
  });

  const responseText = await response.text();
  console.log(`Response (${response.status}): ${responseText}`);
  
  return {
    status: response.status,
    data: responseText ? JSON.parse(responseText) : null
  };
}

// Main function to import all menu items
async function importMenuItems() {
  // Login and get cookie
  let cookie;
  try {
    cookie = await login();
  } catch (error) {
    console.error('Login failed:', error.message);
    
    // Try to use existing cookie if available
    try {
      if (fs.existsSync('cookie.txt')) {
        cookie = fs.readFileSync('cookie.txt', 'utf8');
        console.log('Using existing cookie from file');
      } else {
        console.error('No existing cookie found. Please check your credentials.');
        return;
      }
    } catch (readError) {
      console.error('Failed to read existing cookie:', readError);
      return;
    }
  }

  // --- Taco Fiesta - Proteins ---
  const SECTION_TITLE_PROTEINS = "Taco Fiesta - Proteins (Selection limits vary by package)";
  const LIBRARY_KEY_PROTEINS = "taco_fiesta_proteins";
  const CATEGORY_PROTEINS = "menu_info";

  // Prepare options for Proteins
  const PROTEIN_OPTIONS = [
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
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_PROTEINS,
    defaultText: SECTION_TITLE_PROTEINS,
    questionType: "checkbox",
    category: CATEGORY_PROTEINS,
    defaultOptions: PROTEIN_OPTIONS
  }, cookie);

  // --- Taco Fiesta - Sides ---
  const SECTION_TITLE_SIDES = "Taco Fiesta - Sides (Selection limits vary by package)";
  const LIBRARY_KEY_SIDES = "taco_fiesta_sides";
  const CATEGORY_SIDES = "menu_info";

  const SIDE_OPTIONS = [
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
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_SIDES,
    defaultText: SECTION_TITLE_SIDES,
    questionType: "checkbox",
    category: CATEGORY_SIDES,
    defaultOptions: SIDE_OPTIONS
  }, cookie);

  // --- Taco Fiesta - Salsas ---
  const SECTION_TITLE_SALSAS = "Taco Fiesta - Salsas (Selection limits vary by package)";
  const LIBRARY_KEY_SALSAS = "taco_fiesta_salsas";
  const CATEGORY_SALSAS = "menu_info";

  const SALSAS_OPTIONS = [
    "Classic Pico de Gallo",
    "Fresh Mango Salsa",
    "Pineapple Habanero Salsa",
    "Cucumber & Apple Salsa",
    "Jicama and Papaya Salsa",
    "Salsa Roja (red sauce)",
    "Salsa Verde (green sauce)",
    "Creamy Salsa Verde (green sauce)",
    "Salsa Macha -(contains peanuts and sesame seeds)"
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_SALSAS,
    defaultText: SECTION_TITLE_SALSAS,
    questionType: "checkbox",
    category: CATEGORY_SALSAS,
    defaultOptions: SALSAS_OPTIONS
  }, cookie);

  // --- Taco Fiesta - Condiments ---
  const SECTION_TITLE_CONDIMENTS = "Taco Fiesta - Condiments (Selection limits vary by package)";
  const LIBRARY_KEY_CONDIMENTS = "taco_fiesta_condiments";
  const CATEGORY_CONDIMENTS = "menu_info";

  const CONDIMENTS_OPTIONS = [
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
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_CONDIMENTS,
    defaultText: SECTION_TITLE_CONDIMENTS,
    questionType: "checkbox",
    category: CATEGORY_CONDIMENTS,
    defaultOptions: CONDIMENTS_OPTIONS
  }, cookie);

  console.log("Taco Fiesta sections processed.");
  console.log("####################################");
  console.log("Starting American BBQ sections...");
  console.log("####################################");

  // --- American BBQ - Mains/Protein Choice ---
  const SECTION_TITLE_BBQ_MAINS = "American BBQ - Mains/Protein Choice (Selection limits vary by package)";
  const LIBRARY_KEY_BBQ_MAINS = "american_bbq_mains";
  const CATEGORY_BBQ_MAINS = "menu_info";

  const BBQ_MAINS_OPTIONS = [
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
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_BBQ_MAINS,
    defaultText: SECTION_TITLE_BBQ_MAINS,
    questionType: "checkbox",
    category: CATEGORY_BBQ_MAINS,
    defaultOptions: BBQ_MAINS_OPTIONS
  }, cookie);

  // --- American BBQ - Side Choice ---
  const SECTION_TITLE_BBQ_SIDES = "American BBQ - Side Choice (Selection limits vary by package)";
  const LIBRARY_KEY_BBQ_SIDES = "american_bbq_sides";
  const CATEGORY_BBQ_SIDES = "menu_info";

  const BBQ_SIDES_OPTIONS = [
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
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_BBQ_SIDES,
    defaultText: SECTION_TITLE_BBQ_SIDES,
    questionType: "checkbox",
    category: CATEGORY_BBQ_SIDES,
    defaultOptions: BBQ_SIDES_OPTIONS
  }, cookie);

  // --- American BBQ - Salad Choice ---
  const SECTION_TITLE_BBQ_SALADS = "American BBQ - Salad Choice (Selection limits vary by package)";
  const LIBRARY_KEY_BBQ_SALADS = "american_bbq_salads";
  const CATEGORY_BBQ_SALADS = "menu_info";

  const BBQ_SALADS_OPTIONS = [
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
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_BBQ_SALADS,
    defaultText: SECTION_TITLE_BBQ_SALADS,
    questionType: "checkbox",
    category: CATEGORY_BBQ_SALADS,
    defaultOptions: BBQ_SALADS_OPTIONS
  }, cookie);

  // --- American BBQ - Sauce Choice ---
  const SECTION_TITLE_BBQ_SAUCES = "American BBQ - Sauce Choice (Selection limits vary by package)";
  const LIBRARY_KEY_BBQ_SAUCES = "american_bbq_sauces";
  const CATEGORY_BBQ_SAUCES = "menu_info";

  const BBQ_SAUCES_OPTIONS = [
    "Kansas City BBQ Sauce",
    "South Carolina Gold BBQ Sauce",
    "North Carolina Vinegar based BBQ Sauce",
    "Alabama White BBQ Sauce",
    "Texas BBQ Sauce",
    "Very Berry BBQ Sauce",
    "Smoky bourbon BBQ Sauce"
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_BBQ_SAUCES,
    defaultText: SECTION_TITLE_BBQ_SAUCES,
    questionType: "checkbox",
    category: CATEGORY_BBQ_SAUCES,
    defaultOptions: BBQ_SAUCES_OPTIONS
  }, cookie);

  // --- American BBQ - Condiment Choice ---
  const SECTION_TITLE_BBQ_CONDIMENTS = "American BBQ - Condiment Choice (Selection limits vary by package)";
  const LIBRARY_KEY_BBQ_CONDIMENTS = "american_bbq_condiments";
  const CATEGORY_BBQ_CONDIMENTS = "menu_info";

  const BBQ_CONDIMENTS_OPTIONS = [
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
  ];

  await createLibraryQuestion({
    libraryQuestionKey: LIBRARY_KEY_BBQ_CONDIMENTS,
    defaultText: SECTION_TITLE_BBQ_CONDIMENTS,
    questionType: "checkbox",
    category: CATEGORY_BBQ_CONDIMENTS,
    defaultOptions: BBQ_CONDIMENTS_OPTIONS
  }, cookie);

  console.log("American BBQ sections processed.");
  console.log("####################################");
  console.log("Menu items import completed successfully!");
}

// Run the import function
importMenuItems()
  .then(() => console.log('Script completed successfully!'))
  .catch(error => console.error('Error running script:', error));