/**
 * Build-time Menu Data Generation Script
 * 
 * This script fetches all menu data from the database and generates
 * static JSON files that can be imported directly in the frontend,
 * eliminating the need for runtime API calls.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { menus, menuItems } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

const { Pool } = pg;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Output directory for generated data files
const OUTPUT_DIR = './client/src/data/generated';

async function ensureOutputDirectory() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating output directory:', error);
  }
}

async function enrichMenuItem(item) {
  const dietaryMetadata = item.additional_dietary_metadata || {};
  
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price ? parseFloat(item.price.toString()) : 0,
    upcharge: item.upcharge ? parseFloat(item.upcharge.toString()) : 0,
    
    // Basic dietary flags
    isVegetarian: item.isVegetarian,
    isVegan: item.isVegan,
    isGlutenFree: item.isGlutenFree,
    isDairyFree: item.isDairyFree,
    isNutFree: item.isNutFree,
    
    // Rich dietary information
    dietaryFlags: dietaryMetadata.dietary_flags_list || [],
    allergenAlerts: dietaryMetadata.allergen_alert_list || [],
    nutritionalHighlights: dietaryMetadata.nutritional_highlights || {},
    preparationNotes: dietaryMetadata.key_preparation_notes || '',
    suitableForDiets: dietaryMetadata.suitable_for_diet_preferences || [],
    customerGuidance: dietaryMetadata.guidance_for_customer_short || '',
    availableLotSizes: dietaryMetadata.available_lot_sizes || [],
    
    image: item.image
  };
}

async function generateMenuData() {
  console.log('🚀 Starting menu data generation...');
  
  try {
    await ensureOutputDirectory();
    
    // Generate menu themes
    console.log('📋 Generating menu themes data...');
    const weddingMenus = await db
      .select()
      .from(menus)
      .where(eq(menus.type, 'standard'));

    const formattedMenus = weddingMenus.map(menu => {
      let menuStructure;
      try {
        menuStructure = typeof menu.items === 'string' 
          ? JSON.parse(menu.items) 
          : menu.items;
      } catch (error) {
        console.error(`Failed to parse menu items for menu ${menu.id}:`, error);
        menuStructure = null;
      }

      return {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        theme_key: menuStructure?.theme_key || `theme_${menu.id}`,
        packages: menuStructure?.categories ? [{
          id: menuStructure.package_id || `package_${menu.id}`,
          name: menuStructure.package_name || menu.name,
          price: menuStructure.package_price_per_person || 0,
          description: menuStructure.package_description || menu.description,
          minGuestCount: menuStructure.min_guest_count,
          customizable: menuStructure.customizable || false
        }] : [],
        categories: menuStructure?.categories || []
      };
    });

    await fs.writeFile(path.join(OUTPUT_DIR, 'menuThemes.json'), JSON.stringify(formattedMenus, null, 2));
    
    // Generate menu items by category
    console.log('🍽️ Generating menu items by category...');
    const categories = ['appetizer', 'entree', 'side', 'dessert', 'beverage'];
    const categoryData = {};
    
    for (const category of categories) {
      console.log(`  Processing ${category}...`);
      
      const items = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.category, category));
      
      const enrichedItems = await Promise.all(
        items.map(item => enrichMenuItem(item))
      );
      
      categoryData[category] = enrichedItems;
      
      // Create individual category files
      await fs.writeFile(
        path.join(OUTPUT_DIR, `menuItems_${category}.json`), 
        JSON.stringify(enrichedItems, null, 2)
      );
      console.log(`  ✓ ${category} items: ${enrichedItems.length} items`);
    }
    
    // Create combined category file
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'menuItemsByCategory.json'), 
      JSON.stringify(categoryData, null, 2)
    );
    
    // Generate all menu items
    console.log('📦 Generating all menu items...');
    const allItems = await db.select().from(menuItems);
    const enrichedItems = await Promise.all(
      allItems.map(item => enrichMenuItem(item))
    );
    
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'allMenuItems.json'), 
      JSON.stringify(enrichedItems, null, 2)
    );
    
    // Generate dietary filters
    console.log('🏷️ Generating dietary filter data...');
    const allDietaryFlags = new Set();
    const allAllergens = new Set();
    const allDietPreferences = new Set();
    
    allItems.forEach(item => {
      const metadata = item.additional_dietary_metadata || {};
      
      if (metadata.dietary_flags_list) {
        metadata.dietary_flags_list.forEach(flag => allDietaryFlags.add(flag));
      }
      
      if (metadata.allergen_alert_list) {
        metadata.allergen_alert_list.forEach(allergen => allAllergens.add(allergen));
      }
      
      if (metadata.suitable_for_diet_preferences) {
        metadata.suitable_for_diet_preferences.forEach(pref => allDietPreferences.add(pref));
      }
    });
    
    const dietaryData = {
      availableDietaryFlags: Array.from(allDietaryFlags).sort(),
      availableAllergens: Array.from(allAllergens).sort(),
      availableDietPreferences: Array.from(allDietPreferences).sort(),
      basicDietaryOptions: [
        'vegetarian',
        'vegan', 
        'gluten_free',
        'dairy_free',
        'nut_free'
      ]
    };
    
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'dietaryFilters.json'), 
      JSON.stringify(dietaryData, null, 2)
    );
    
    // Generate index file for easy imports
    const indexContent = `// Generated menu data exports
import menuThemes from './menuThemes.json';
import menuItemsByCategory from './menuItemsByCategory.json';
import allMenuItems from './allMenuItems.json';
import dietaryFilters from './dietaryFilters.json';

// Individual category imports
import appetizerItems from './menuItems_appetizer.json';
import entreeItems from './menuItems_entree.json';
import sideItems from './menuItems_side.json';
import dessertItems from './menuItems_dessert.json';
import beverageItems from './menuItems_beverage.json';

export {
  menuThemes,
  menuItemsByCategory,
  allMenuItems,
  dietaryFilters,
  appetizerItems,
  entreeItems,
  sideItems,
  dessertItems,
  beverageItems
};

// Utility functions
export function getMenuItemsByCategory(category) {
  return menuItemsByCategory[category] || [];
}

export function getMenuItemById(id) {
  return allMenuItems.find(item => item.id === id);
}

export function getMenuItemsByIds(ids) {
  return allMenuItems.filter(item => ids.includes(item.id));
}

export function filterMenuItemsByDietary(items, dietaryPrefs = [], allergens = []) {
  return items.filter(item => {
    // Check allergen restrictions
    if (allergens.length > 0) {
      const hasRestrictedAllergen = item.allergenAlerts.some(allergen =>
        allergens.some(userAllergen =>
          allergen.toLowerCase().includes(userAllergen.toLowerCase())
        )
      );
      if (hasRestrictedAllergen) return false;
    }
    
    // Check dietary preferences
    if (dietaryPrefs.length > 0) {
      const suitsPreferences = dietaryPrefs.some(pref => {
        const prefLower = pref.toLowerCase();
        
        // Check basic flags
        switch (prefLower) {
          case 'vegetarian': return item.isVegetarian;
          case 'vegan': return item.isVegan;
          case 'gluten_free': return item.isGlutenFree;
          case 'dairy_free': return item.isDairyFree;
          case 'nut_free': return item.isNutFree;
        }
        
        // Check suitable diet preferences
        return item.suitableForDiets.some(diet =>
          diet.toLowerCase().includes(prefLower)
        );
      });
      
      if (!suitsPreferences) return false;
    }
    
    return true;
  });
}
`;
    
    await fs.writeFile(path.join(OUTPUT_DIR, 'index.js'), indexContent);
    
    console.log('\n✅ Menu data generation completed successfully!');
    console.log(`📁 Files generated in: ${OUTPUT_DIR}`);
    console.log(`📊 Summary:`);
    console.log(`   - Menu themes: ${formattedMenus.length}`);
    console.log(`   - Total menu items: ${enrichedItems.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Dietary flags: ${allDietaryFlags.size}`);
    console.log(`   - Available allergens: ${allAllergens.size}`);
    
  } catch (error) {
    console.error('❌ Error generating menu data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
generateMenuData();