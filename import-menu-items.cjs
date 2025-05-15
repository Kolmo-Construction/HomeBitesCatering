// Script to import menu items from the provided JSON
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read the menu data from the JSON file
const menuData = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu-data.json'), 'utf8'));

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
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      errorCount++;
    }
  }

  console.log(`\nImport complete. Successfully added ${successCount} menu items. Failed: ${errorCount}`);
}

// Run the import
importMenuItems();