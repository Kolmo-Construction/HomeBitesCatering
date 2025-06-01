/**
 * Build-time Menu Data Generation Script
 * 
 * This script fetches all menu data from the database and generates
 * static JSON files that can be imported directly in the frontend,
 * eliminating the need for runtime API calls.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { menus, menuItems } from './shared/schema.ts';
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
    
    // Get all menu items first (with full metadata)
    console.log('🍽️ Fetching all menu items with metadata...');
    const allItems = await db.select().from(menuItems);
    const enrichedItems = await Promise.all(allItems.map(item => enrichMenuItem(item)));
    
    // Create a lookup map for quick item access
    const itemsLookup = {};
    enrichedItems.forEach(item => {
      itemsLookup[item.id] = item;
    });
    
    // Generate menu themes with organized items
    console.log('📋 Generating menu themes with associated items...');
    const weddingMenus = await db
      .select()
      .from(menus)
      .where(eq(menus.displayOnCustomerForm, true));

    const menusByTheme = {};
    const organizedMenuData = {};

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

      const themeKey = menuStructure?.theme_key || `theme_${menu.id}`;
      
      // Collect all item IDs for this menu - handle both formats
      const menuItemIds = new Set();
      
      // Handle complex structure with categories and available_item_ids
      if (menuStructure?.categories) {
        menuStructure.categories.forEach(category => {
          if (category.available_item_ids) {
            category.available_item_ids.forEach(itemId => menuItemIds.add(itemId));
          }
        });
      }
      
      // Handle simple array format: [{"id": "item_id", "type": "category"}, ...]
      if (Array.isArray(menu.items)) {
        menu.items.forEach(item => {
          if (item.id) {
            menuItemIds.add(item.id);
          }
        });
      }
      
      // Get actual menu items with full metadata for this menu
      console.log(`  Processing menu: ${menu.name} (ID: ${menu.id})`);
      console.log(`  Item IDs found: ${Array.from(menuItemIds).join(', ')}`);
      
      const menuItems = Array.from(menuItemIds)
        .map(itemId => {
          const item = itemsLookup[itemId];
          if (!item) {
            console.log(`    Warning: Item ID '${itemId}' not found in database`);
          }
          return item;
        })
        .filter(Boolean); // Remove any null/undefined items
      
      console.log(`  Successfully mapped ${menuItems.length} items`);
      
      // Organize items by category for this menu
      const itemsByCategory = {};
      
      if (menuStructure?.categories) {
        // Handle complex structure with categories and available_item_ids
        menuStructure.categories.forEach(category => {
          const categoryItems = category.available_item_ids
            .map(itemId => itemsLookup[itemId])
            .filter(Boolean);
          
          itemsByCategory[category.category_key] = {
            title: category.display_title,
            description: category.description || '',
            selectionLimit: category.selection_limit,
            items: categoryItems
          };
        });
      } else if (Array.isArray(menu.items)) {
        // Handle simple array format: organize by type field from MenuBuilder
        console.log(`    Using simple array format for menu: ${menu.name}`);
        const typeGroups = {};
        menu.items.forEach(item => {
          const itemData = itemsLookup[item.id];
          if (itemData) {
            const type = item.type || 'other';
            if (!typeGroups[type]) {
              typeGroups[type] = [];
            }
            typeGroups[type].push(itemData);
            console.log(`      Added ${itemData.name} to type: ${type}`);
          }
        });
        
        // Convert type groups to proper category structure with proper display names
        const typeDisplayNames = {
          'mains': 'Main Courses',
          'sides': 'Side Dishes', 
          'salads': 'Salads',
          'sauces': 'Sauces',
          'salsas': 'Salsas',
          'spreads': 'Spreads',
          'condiments': 'Condiments',
          'appetizers': 'Appetizers',
          'desserts': 'Desserts',
          'beverages': 'Beverages',
          'other': 'Other Items'
        };
        
        Object.entries(typeGroups).forEach(([type, items]) => {
          itemsByCategory[type] = {
            title: typeDisplayNames[type] || type.charAt(0).toUpperCase() + type.slice(1),
            description: `${typeDisplayNames[type] || type} for ${menu.name}`,
            selectionLimit: null,
            items: items
          };
          console.log(`      Created category: ${typeDisplayNames[type]} with ${items.length} items`);
        });
      }
      
      // Store organized data for this menu
      organizedMenuData[themeKey] = {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        allItems: menuItems,
        itemsByCategory: itemsByCategory,
        totalItemCount: menuItems.length
      };
      
      // Store theme mapping
      menusByTheme[themeKey] = menu.id;

      return {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        theme_key: themeKey,
        packages: menuStructure?.categories ? [{
          id: menuStructure.package_id || `package_${menu.id}`,
          name: menuStructure.package_name || menu.name,
          price: menuStructure.package_price_per_person || 0,
          description: menuStructure.package_description || menu.description,
          minGuestCount: menuStructure.min_guest_count,
          customizable: menuStructure.customizable || false
        }] : [],
        categories: menuStructure?.categories || Object.entries(itemsByCategory).map(([typeKey, categoryData]) => ({
          description: categoryData.description,
          category_key: typeKey,
          display_title: categoryData.title,
          upcharge_info: {},
          selection_limit: categoryData.selectionLimit,
          available_item_ids: categoryData.items.map(item => item.id)
        })),
        itemCount: menuItemIds.size
      };
    });

    // Write the organized menu data
    await fs.writeFile(path.join(OUTPUT_DIR, 'menusByTheme.json'), JSON.stringify(organizedMenuData, null, 2));
    await fs.writeFile(path.join(OUTPUT_DIR, 'menuThemes.json'), JSON.stringify(formattedMenus, null, 2));
    await fs.writeFile(path.join(OUTPUT_DIR, 'themeToMenuMapping.json'), JSON.stringify(menusByTheme, null, 2));
    
    // Generate menu items by category
    console.log('🍽️ Generating menu items by category...');
    
    // Use the items we already fetched
    const actualCategories = [...new Set(allItems.map(item => item.category))];
    console.log('Actual categories found:', actualCategories);
    
    // Map actual categories to simplified names
    const categoryMappings = {
      'appetizer': actualCategories.filter(cat => cat.toLowerCase().includes('appetizer')),
      'entree': actualCategories.filter(cat => 
        cat.toLowerCase().includes('main course') || 
        cat.toLowerCase().includes('entree') ||
        cat.toLowerCase().includes('protein')
      ),
      'side': actualCategories.filter(cat => 
        cat.toLowerCase().includes('side') || 
        cat.toLowerCase().includes('vegetable') ||
        cat.toLowerCase().includes('grain')
      ),
      'dessert': actualCategories.filter(cat => cat.toLowerCase().includes('dessert')),
      'beverage': actualCategories.filter(cat => cat.toLowerCase().includes('beverage'))
    };
    
    const categoryData = {};
    
    for (const [simpleName, actualNames] of Object.entries(categoryMappings)) {
      console.log(`  Processing ${simpleName} (${actualNames.length} actual categories)...`);
      
      let allCategoryItems = [];
      for (const actualName of actualNames) {
        const items = await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.category, actualName));
        allCategoryItems.push(...items);
      }
      
      const enrichedItems = await Promise.all(
        allCategoryItems.map(item => enrichMenuItem(item))
      );
      
      categoryData[simpleName] = enrichedItems;
      
      // Create individual category files
      await fs.writeFile(
        path.join(OUTPUT_DIR, `menuItems_${simpleName}.json`), 
        JSON.stringify(enrichedItems, null, 2)
      );
      console.log(`  ✓ ${simpleName} items: ${enrichedItems.length} items`);
    }
    
    // Create combined category file
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'menuItemsByCategory.json'), 
      JSON.stringify(categoryData, null, 2)
    );
    
    // Generate all menu items
    console.log('📦 Generating all menu items...');
    const allEnrichedItems = enrichedItems;
    
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
    console.log(`   - Categories: ${actualCategories.length}`);
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