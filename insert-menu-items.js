// Direct database insertion script using Drizzle
import { db } from './server/db.js';
import { menuItems } from './shared/schema.js';
import fs from 'fs';

(async () => {
  try {
    // Parse menu data from JSON file
    const rawData = fs.readFileSync('./menu-data.json', 'utf8');
    const menuData = JSON.parse(rawData);
    
    console.log(`Preparing to insert ${menuData.length} menu items...`);
    
    // Process each menu item
    for (const item of menuData) {
      try {
        // Transform the data to match our schema
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
        
        // Insert the menu item
        const [insertedItem] = await db.insert(menuItems).values(menuItemData).returning();
        console.log(`Added menu item: ${item.itemName} (ID: ${insertedItem.id})`);
      } catch (error) {
        console.error(`Failed to add ${item.itemName}:`, error.message);
      }
    }
    
    console.log('Menu items import completed successfully!');
  } catch (error) {
    console.error('Error importing menu items:', error);
  } finally {
    process.exit(0);
  }
})();