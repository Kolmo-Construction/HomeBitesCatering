// Use require syntax for Node.js compatibility
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');

// Database connection using environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Import schema - we'll reference the tables directly
const { menuItems, menus } = require('./shared/schema.ts');
const db = drizzle(pool, { schema: { menuItems, menus } });

// Since we need to load the data dynamically, let's create sample data based on your structure
const weddingThemeMenuData = {
  "taste_of_italy_wedding": {
    "title": "A Taste of Italy - Wedding Celebration",
    "description": "Elegant Italian cuisine, exquisitely prepared for your wedding reception.",
    "packages": [
      {
        "id": "italy_wedding_bronze",
        "name": "Bronze Celebration Package",
        "price": 32.00,
        "description": "An elegant introduction: Select 2 Mains, 3 Sides, 1 Pasta, and 1 Salad. Includes artisanal bread service.",
        "minGuestCount": 50,
        "limits": { "mains": 2, "sides": 3, "pasta": 1, "salads": 1 }
      },
      {
        "id": "italy_wedding_silver",
        "name": "Silver Celebration Package",
        "price": 38.00,
        "description": "A delightful selection: Select 3 Mains, 3 Sides, 2 Pastas, and 2 Salads. Includes artisanal bread service and a choice of infused olive oils.",
        "minGuestCount": 50,
        "limits": { "mains": 3, "sides": 3, "pasta": 2, "salads": 2 }
      }
    ],
    "categories": {
      "mains": {
        "title": "Exquisite Italian Mains",
        "description": "Premium main courses crafted with authentic Italian ingredients",
        "items": [
          { "id": "chicken_saltimbocca_w", "name": "Chicken Saltimbocca with Prosciutto & Sage", "upcharge": 0 },
          { "id": "beef_braciole_w", "name": "Slow-Cooked Beef Braciole in Rich Tomato Sauce", "upcharge": 5.00 },
          { "id": "vegetarian_lasagna_w", "name": "Layered Vegetarian Lasagna with Fresh Béchamel", "upcharge": 0 },
          { "id": "salmon_lemon_dill_w", "name": "Pan-Seared Salmon with a Delicate Lemon-Dill Sauce", "upcharge": 7.00 }
        ]
      },
      "sides": {
        "title": "Italian Sides & Accompaniments",
        "description": "Perfect complements to your main courses",
        "items": [
          { "id": "garlic_roasted_vegetables", "name": "Garlic Roasted Seasonal Vegetables", "upcharge": 0 },
          { "id": "parmesan_risotto", "name": "Creamy Parmesan Risotto", "upcharge": 2.00 },
          { "id": "tuscan_potatoes", "name": "Herb-Crusted Tuscan Potatoes", "upcharge": 0 }
        ]
      },
      "pasta": {
        "title": "Artisanal Pasta Selection",
        "description": "Fresh pasta made daily with traditional techniques",
        "items": [
          { "id": "penne_arrabbiata", "name": "Penne Arrabbiata with Spicy Tomato Sauce", "upcharge": 0 },
          { "id": "fettuccine_alfredo", "name": "Classic Fettuccine Alfredo", "upcharge": 1.50 }
        ]
      },
      "salads": {
        "title": "Fresh Italian Salads",
        "description": "Garden-fresh salads with Italian flair",
        "items": [
          { "id": "caprese_salad", "name": "Classic Caprese Salad with Fresh Mozzarella", "upcharge": 0 },
          { "id": "caesar_salad", "name": "Traditional Caesar Salad with Parmesan", "upcharge": 0 }
        ]
      }
    }
  }
};

// Sample enhanced dietary data
const enhancedDietaryData = {
  "chicken_saltimbocca_w": {
    dietary_flags: ["HIGH_PROTEIN"],
    allergen_alert: ["CONTAINS_DAIRY"],
    nutritional_info: {
      calories_range_kcal: "380-420",
      protein_g_range: "32-38g",
      fat_g_range: "18-22g",
      carbs_g_range: "8-12g",
      fiber_g_range: "2-3g"
    },
    key_preparation_notes: "Pan-seared with prosciutto and fresh sage",
    diet_preference_fit: ["MEDITERRANEAN"],
    guidance_for_customer: "A classic Italian dish that's perfect for protein-focused diners"
  },
  "vegetarian_lasagna_w": {
    dietary_flags: ["VEGETARIAN", "HIGH_PROTEIN"],
    allergen_alert: ["CONTAINS_DAIRY", "CONTAINS_GLUTEN"],
    nutritional_info: {
      calories_range_kcal: "340-390",
      protein_g_range: "18-22g",
      fat_g_range: "16-20g",
      carbs_g_range: "28-35g",
      fiber_g_range: "4-6g"
    },
    key_preparation_notes: "Layered with fresh béchamel and seasonal vegetables",
    diet_preference_fit: ["VEGETARIAN", "MEDITERRANEAN"],
    guidance_for_customer: "A hearty vegetarian option that satisfies even meat lovers"
  }
};

async function runMigration() {
  console.log("🚀 Starting wedding data migration...");
  
  const stringIdToDbIdMap = {};
  const allOriginalItems = new Map();
  let itemsProcessed = 0;
  let itemsInserted = 0;
  let packagesInserted = 0;

  // Step 1: Collect all unique items from all data sources
  console.log("📋 Collecting unique items from source files...");

  // Process weddingThemeMenuData
  Object.values(weddingThemeMenuData).forEach(theme => {
    Object.entries(theme.categories).forEach(([categoryKey, category]) => {
      category.items.forEach(item => {
        if (!allOriginalItems.has(item.id)) {
          allOriginalItems.set(item.id, {
            original_id: item.id,
            name: item.name,
            description: item.description,
            category_suggestion: categoryKey,
            price: item.upcharge || 0,
            ingredients_suggestion: null,
            image_url: null,
            is_vegetarian_suggestion: false,
            is_vegan_suggestion: false,
            is_gluten_free_suggestion: false,
            is_dairy_free_suggestion: false,
            is_nut_free_suggestion: false
          });
          itemsProcessed++;
        }
      });
    });
  });

  console.log(`✅ Collected ${allOriginalItems.size} unique items from ${itemsProcessed} total items found.`);

  // Step 2: Insert unique items into menu_items table
  console.log("💾 Inserting items into menu_items table...");
  
  for (const itemDetails of allOriginalItems.values()) {
    // Get enhanced dietary information if available
    const enhancedInfo = enhancedDietaryData[itemDetails.original_id];
    
    const adMetadata = { 
      original_item_id: itemDetails.original_id 
    };
    
    let isVeganFlag = itemDetails.is_vegan_suggestion || false;
    let isVegetarianFlag = itemDetails.is_vegetarian_suggestion || false;
    let isGlutenFreeFlag = itemDetails.is_gluten_free_suggestion || false;
    let isDairyFreeFlag = itemDetails.is_dairy_free_suggestion || false;
    let isNutFreeFlag = itemDetails.is_nut_free_suggestion || false;

    if (enhancedInfo) {
      adMetadata.dietary_flags_list = enhancedInfo.dietary_flags;
      adMetadata.allergen_alert_list = enhancedInfo.allergen_alert;
      adMetadata.nutritional_highlights = {
        calories: enhancedInfo.nutritional_info.calories_range_kcal,
        protein: enhancedInfo.nutritional_info.protein_g_range,
        fat: enhancedInfo.nutritional_info.fat_g_range,
        carbs: enhancedInfo.nutritional_info.carbs_g_range,
        fiber: enhancedInfo.nutritional_info.fiber_g_range,
      };
      adMetadata.key_preparation_notes = enhancedInfo.key_preparation_notes;
      adMetadata.suitable_for_diet_preferences = enhancedInfo.diet_preference_fit;
      adMetadata.guidance_for_customer_short = enhancedInfo.guidance_for_customer?.substring(0, 150);

      // Update boolean flags from detailed dietary_flags
      if (enhancedInfo.dietary_flags) {
        isVeganFlag = enhancedInfo.dietary_flags.includes("VEGAN");
        isVegetarianFlag = enhancedInfo.dietary_flags.includes("VEGETARIAN") || isVeganFlag;
        isGlutenFreeFlag = enhancedInfo.dietary_flags.includes("GLUTEN_FREE");
        isDairyFreeFlag = enhancedInfo.dietary_flags.includes("DAIRY_FREE");
        isNutFreeFlag = enhancedInfo.dietary_flags.includes("NUT_FREE");
      }
    }

    // Normalize price
    let normalizedPrice = undefined;
    if (typeof itemDetails.price === 'number') {
      normalizedPrice = itemDetails.price.toFixed(2);
    } else if (typeof itemDetails.price === 'string') {
      const parsedPrice = parseFloat(itemDetails.price);
      if (!isNaN(parsedPrice)) {
        normalizedPrice = parsedPrice.toFixed(2);
      }
    }

    try {
      const [insertedItem] = await db
        .insert(schema.menuItems)
        .values({
          name: itemDetails.name,
          description: itemDetails.description,
          category: itemDetails.category_suggestion,
          price: normalizedPrice,
          ingredients: itemDetails.ingredients_suggestion,
          isVegetarian: isVegetarianFlag,
          isVegan: isVeganFlag,
          isGlutenFree: isGlutenFreeFlag,
          isDairyFree: isDairyFreeFlag,
          isNutFree: isNutFreeFlag,
          image: itemDetails.image_url,
          additional_dietary_metadata: adMetadata,
        })
        .returning({ id: schema.menuItems.id });

      stringIdToDbIdMap[itemDetails.original_id] = insertedItem.id;
      itemsInserted++;
      console.log(`  ✓ Inserted: ${itemDetails.name} (ID: ${insertedItem.id})`);
    } catch (error) {
      console.error(`  ❌ Failed to insert item ${itemDetails.name} (Original ID: ${itemDetails.original_id}):`, error.message);
    }
  }

  console.log(`✅ Finished inserting ${itemsInserted}/${allOriginalItems.size} items into menu_items table.`);

  // Step 3: Insert Packages into menus table
  console.log("📦 Inserting packages into menus table...");
  
  for (const [themeKey, theme] of Object.entries(weddingThemeMenuData)) {
    for (const pkg of theme.packages) {
      const packageItemsJsonCategories = [];

      for (const [categoryKey, categoryFromFile] of Object.entries(theme.categories)) {
        // Check if this category is relevant for the package based on limits
        if (pkg.limits && pkg.limits[categoryKey] !== undefined) {
          const dbItemIdsForCategory = categoryFromFile.items
            .map(item => stringIdToDbIdMap[item.id])
            .filter(id => id !== undefined);

          packageItemsJsonCategories.push({
            category_key: categoryKey,
            display_title: categoryFromFile.title,
            description: categoryFromFile.description,
            available_item_ids: dbItemIdsForCategory,
            selection_limit: pkg.limits[categoryKey],
          });
        }
      }
      
      const packageJsonForDb = {
        theme_key: themeKey,
        package_id: pkg.id,
        package_name: pkg.name,
        package_price_per_person: pkg.price,
        package_description: pkg.description,
        min_guest_count: pkg.minGuestCount,
        categories: packageItemsJsonCategories,
      };

      try {
        await db.insert(schema.menus).values({
          name: pkg.name,
          description: pkg.description,
          type: themeKey,
          items: packageJsonForDb,
        });
        packagesInserted++;
        console.log(`  ✓ Inserted package: ${pkg.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to insert package ${pkg.name}:`, error.message);
      }
    }
  }

  console.log(`✅ Finished inserting ${packagesInserted} packages into menus table.`);
  
  // Final migration report
  console.log("\n🎉 MIGRATION COMPLETE!");
  console.log("==========================================");
  console.log(`📊 MIGRATION SUMMARY:`);
  console.log(`   • Items processed: ${itemsProcessed}`);
  console.log(`   • Unique items found: ${allOriginalItems.size}`);
  console.log(`   • Items successfully migrated: ${itemsInserted}`);
  console.log(`   • Packages migrated: ${packagesInserted}`);
  console.log(`   • Success rate: ${((itemsInserted/allOriginalItems.size)*100).toFixed(1)}%`);
  console.log("==========================================");
  
  await pool.end();
}

runMigration().catch(err => {
  console.error("💥 Migration failed:", err);
  pool.end();
  process.exit(1);
});