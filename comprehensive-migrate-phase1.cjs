const { Pool } = require('pg');

// Database connection using environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Comprehensive wedding menu data from ALL your data files
const weddingData = {
  // From weddingThemeMenuData.ts - Taste of Italy Wedding
  "taste_of_italy_wedding": {
    "title": "A Taste of Italy - Wedding Celebration",
    "categories": {
      "mains": {
        "title": "Exquisite Italian Mains",
        "items": [
          { "id": "chicken_saltimbocca_w", "name": "Chicken Saltimbocca with Prosciutto & Sage", "description": "Pan-seared chicken breast wrapped in prosciutto with fresh sage", "upcharge": 0 },
          { "id": "beef_braciole_w", "name": "Slow-Cooked Beef Braciole in Rich Tomato Sauce", "description": "Traditional Italian stuffed beef rolls in marinara", "upcharge": 5.00 },
          { "id": "vegetarian_lasagna_w", "name": "Layered Vegetarian Lasagna with Fresh Béchamel", "description": "House-made pasta layered with seasonal vegetables and béchamel", "upcharge": 0 },
          { "id": "salmon_lemon_dill_w", "name": "Pan-Seared Salmon with a Delicate Lemon-Dill Sauce", "description": "Fresh Atlantic salmon with citrus herb sauce", "upcharge": 7.00 },
          { "id": "veal_marsala_w", "name": "Veal Marsala with Wild Mushrooms", "description": "Tender veal scallopini in rich marsala wine sauce", "upcharge": 8.00 },
          { "id": "chicken_piccata_w", "name": "Chicken Piccata with Lemon Capers", "description": "Pan-seared chicken with bright lemon caper sauce", "upcharge": 2.00 },
          { "id": "osso_buco_w", "name": "Braised Osso Buco with Gremolata", "description": "Slow-braised veal shanks with aromatic herbs", "upcharge": 12.00 }
        ]
      },
      "sides": {
        "title": "Italian Sides & Accompaniments",
        "items": [
          { "id": "garlic_roasted_vegetables", "name": "Garlic Roasted Seasonal Vegetables", "description": "Fresh seasonal vegetables roasted with herbs", "upcharge": 0 },
          { "id": "parmesan_risotto", "name": "Creamy Parmesan Risotto", "description": "Arborio rice slowly cooked with aged parmesan", "upcharge": 2.00 },
          { "id": "tuscan_potatoes", "name": "Herb-Crusted Tuscan Potatoes", "description": "Roasted fingerling potatoes with rosemary and thyme", "upcharge": 0 },
          { "id": "grilled_asparagus", "name": "Grilled Asparagus with Lemon Zest", "description": "Fresh asparagus spears with bright lemon finish", "upcharge": 1.50 },
          { "id": "italian_green_beans", "name": "Italian Green Beans with Almonds", "description": "Fresh green beans with toasted almonds", "upcharge": 1.00 },
          { "id": "polenta_creamy", "name": "Creamy Polenta with Mascarpone", "description": "Rich and creamy polenta with mascarpone cheese", "upcharge": 2.50 }
        ]
      },
      "pasta": {
        "title": "Artisanal Pasta Selection",
        "items": [
          { "id": "penne_arrabbiata", "name": "Penne Arrabbiata with Spicy Tomato Sauce", "description": "House-made penne in spicy tomato and garlic sauce", "upcharge": 0 },
          { "id": "fettuccine_alfredo", "name": "Classic Fettuccine Alfredo", "description": "Fresh fettuccine in rich cream and parmesan sauce", "upcharge": 1.50 },
          { "id": "gnocchi_pesto", "name": "Potato Gnocchi with Basil Pesto", "description": "Hand-rolled gnocchi with fresh basil pesto", "upcharge": 2.00 },
          { "id": "linguine_clams", "name": "Linguine alle Vongole", "description": "Fresh linguine with clams in white wine sauce", "upcharge": 4.00 },
          { "id": "ravioli_spinach", "name": "Spinach & Ricotta Ravioli", "description": "House-made ravioli with spinach and ricotta filling", "upcharge": 3.00 }
        ]
      },
      "salads": {
        "title": "Fresh Italian Salads",
        "items": [
          { "id": "caprese_salad", "name": "Classic Caprese Salad with Fresh Mozzarella", "description": "Fresh tomatoes, mozzarella, and basil with balsamic", "upcharge": 0 },
          { "id": "caesar_salad", "name": "Traditional Caesar Salad with Parmesan", "description": "Crisp romaine with house-made caesar dressing", "upcharge": 0 },
          { "id": "arugula_salad", "name": "Arugula Salad with Lemon Vinaigrette", "description": "Peppery arugula with light lemon dressing", "upcharge": 1.00 },
          { "id": "antipasto_salad", "name": "Traditional Antipasto Salad", "description": "Mixed greens with Italian meats, cheeses, and vegetables", "upcharge": 3.00 }
        ]
      }
    }
  },

  // From weddingDessertData.ts
  "desserts": {
    "title": "Wedding Desserts",
    "categories": {
      "desserts": {
        "title": "Premium Dessert Selection",
        "items": [
          { "id": "petit_fours", "name": "Petit Fours", "price": 2.25 },
          { "id": "macaroons", "name": "Macaroons", "price": 2.25 },
          { "id": "flourless_chocolate_cake", "name": "Flourless Chocolate Cake", "price": 4.75 },
          { "id": "cheesecake", "name": "Cheesecake", "price": 5.75 },
          { "id": "baklava", "name": "Baklava", "price": 5.25 },
          { "id": "cannolis", "name": "Cannolis", "price": 4.75 },
          { "id": "mini_cannolis", "name": "Mini Cannolis", "price": 2.75 },
          { "id": "assorted_dessert_cups", "name": "Assorted dessert cups", "price": 3.25 },
          { "id": "pate_a_choux", "name": "Pâte à Choux with Crème Pâtissière", "price": 3.25 },
          { "id": "baklava_rollups", "name": "Baklava roll-ups", "price": 3.75 },
          { "id": "lemon_tartlets", "name": "Lemon Tartlets", "price": 2.75 },
          { "id": "mille_feuille", "name": "Mille feuille with cream and berries", "price": 3.75 }
        ]
      }
    }
  },

  // From weddingAppetizerData.ts
  "appetizers": {
    "title": "Wedding Appetizers",
    "categories": {
      "elegant_bites": {
        "title": "Elegant Bites (Priced Per Piece)",
        "items": [
          { "id": "caprese_skewers", "name": "Mini Caprese Skewers with Balsamic Glaze", "price": 2.75, "description": "Cherry tomato, fresh mozzarella, basil." },
          { "id": "smoked_salmon_crostini", "name": "Smoked Salmon & Dill Cream Cheese Crostini", "price": 3.25, "description": "Crisp crostini topped with premium smoked salmon." },
          { "id": "prosciutto_melon", "name": "Prosciutto-Wrapped Melon Bites", "price": 3.00, "description": "Sweet cantaloupe with savory prosciutto." },
          { "id": "fig_brie_bites", "name": "Fig & Brie Bites with Toasted Walnuts", "price": 3.50, "description": "Creamy brie and sweet fig jam on a cracker." },
          { "id": "mini_quiches", "name": "Assorted Mini Quiches (Lorraine, Spinach)", "price": 3.00, "description": "Bite-sized savory quiches." }
        ]
      },
      "wedding_shooters": {
        "title": "Gourmet Shooters (Priced Per Piece)",
        "items": [
          { "id": "shrimp_cocktail_shooter", "name": "Classic Shrimp Cocktail Shooter", "price": 3.75, "description": "Chilled shrimp with zesty cocktail sauce." },
          { "id": "gazpacho_shooter", "name": "Chilled Gazpacho Shooter with Cucumber Garnish", "price": 3.25, "description": "Refreshing Spanish soup." },
          { "id": "ceviche_shooter", "name": "White Fish Ceviche Shooter with Avocado", "price": 4.00, "description": "Citrus-marinated fish." }
        ]
      },
      "wedding_spreads_dips": {
        "title": "Artisan Spreads & Dips",
        "items": [
          { "id": "spinach_artichoke_dip", "name": "Creamy Spinach & Artichoke Dip (Warm)", "price": 0 },
          { "id": "roasted_red_pepper_hummus", "name": "Roasted Red Pepper Hummus", "price": 0 },
          { "id": "gourmet_cheese_ball", "name": "Gourmet Cheese Ball with Nuts & Herbs", "price": 0 },
          { "id": "olive_tapenade", "name": "Kalamata Olive Tapenade", "price": 0 },
          { "id": "whipped_feta_honey", "name": "Whipped Feta with Honey & Pistachios", "price": 0 }
        ]
      }
    }
  },

  // From weddingHorsDoeurvesData.ts
  "hors_doeuvres": {
    "title": "Wedding Hors D'oeuvres",
    "categories": {
      "tea_sandwiches": {
        "title": "Tea Sandwiches",
        "items": [
          { "id": "ts_pate_veg", "name": "Pate with pickled veg", "pricePerPiece": 1.95 },
          { "id": "ts_creamcheese_shrimp", "name": "Cream Cheese and Shrimp", "pricePerPiece": 2.50 },
          { "id": "ts_blt", "name": "BLT - (Bacon Lettuce & Tomato)", "pricePerPiece": 1.95 },
          { "id": "ts_cucumber_mint", "name": "Cucumber & Mint", "pricePerPiece": 1.75 },
          { "id": "ts_chicken_salad", "name": "Classic Chicken Salad", "pricePerPiece": 2.25 },
          { "id": "ts_egg_salad", "name": "Traditional Egg Salad", "pricePerPiece": 1.95 }
        ]
      },
      "canapes": {
        "title": "Canapés",
        "items": [
          { "id": "canape_smoked_salmon", "name": "Smoked Salmon Canapé", "pricePerPiece": 3.50 },
          { "id": "canape_brie_cranberry", "name": "Brie & Cranberry Canapé", "pricePerPiece": 2.75 },
          { "id": "canape_goat_cheese", "name": "Goat Cheese & Sun-dried Tomato", "pricePerPiece": 2.95 },
          { "id": "canape_prosciutto_fig", "name": "Prosciutto & Fig Canapé", "pricePerPiece": 3.25 }
        ]
      },
      "spreads_package": {
        "title": "Spreads Package",
        "items": [
          { "id": "spread_hummus_classic", "name": "Classic Hummus" },
          { "id": "spread_spinach_dip", "name": "Spinach & Artichoke Dip" },
          { "id": "spread_cheese_ball", "name": "Herbed Cheese Ball" },
          { "id": "spread_tapenade", "name": "Olive Tapenade" },
          { "id": "spread_baba_ganoush", "name": "Baba Ganoush" }
        ]
      }
    }
  },

  // From weddingBreakfastMenuData.ts
  "breakfast": {
    "title": "Wedding Breakfast & Brunch",
    "categories": {
      "grab_and_go": {
        "title": "Grab & Go Items",
        "items": [
          { "id": "breakfast_wrap", "name": "Breakfast Wrap", "price": 8.50 },
          { "id": "yogurt_parfait", "name": "Greek Yogurt Parfait", "price": 6.75 },
          { "id": "fresh_fruit_cup", "name": "Fresh Fruit Cup", "price": 4.50 },
          { "id": "breakfast_muffin", "name": "Gourmet Breakfast Muffin", "price": 3.75 },
          { "id": "croissant_sandwich", "name": "Croissant Breakfast Sandwich", "price": 9.25 }
        ]
      },
      "continental": {
        "title": "Continental Breakfast Items",
        "items": [
          { "id": "assorted_pastries", "name": "Assorted Pastries & Danish", "upcharge": 0 },
          { "id": "fresh_bagels", "name": "Fresh Bagels with Cream Cheese", "upcharge": 0 },
          { "id": "seasonal_fruit", "name": "Seasonal Fresh Fruit Display", "upcharge": 0 },
          { "id": "premium_coffee", "name": "Premium Coffee Service", "upcharge": 2.00 },
          { "id": "fresh_juice", "name": "Fresh Orange & Apple Juice", "upcharge": 1.50 }
        ]
      },
      "american_breakfast": {
        "title": "American Breakfast Items",
        "items": [
          { "id": "scrambled_eggs", "name": "Fluffy Scrambled Eggs", "upcharge": 0 },
          { "id": "breakfast_potatoes", "name": "Seasoned Breakfast Potatoes", "upcharge": 0 },
          { "id": "bacon_strips", "name": "Crispy Bacon Strips", "upcharge": 2.00 },
          { "id": "sausage_links", "name": "Breakfast Sausage Links", "upcharge": 2.00 },
          { "id": "french_toast", "name": "Classic French Toast", "upcharge": 3.00 },
          { "id": "pancakes", "name": "Buttermilk Pancakes", "upcharge": 2.50 }
        ]
      }
    }
  },

  // From weddingEquipmentData.ts
  "equipment": {
    "title": "Wedding Equipment & Rentals",
    "categories": {
      "linens": {
        "title": "Linens",
        "items": [
          { "id": "table_cloths_standard", "name": "Table Cloths - Standard", "price": 12.50 },
          { "id": "table_cloths_premium", "name": "Table Cloths - Premium", "price": 18.00 },
          { "id": "napkins_cloth", "name": "Napkins - Cloth", "price": 1.50 },
          { "id": "table_runners", "name": "Table Runners", "price": 6.00 },
          { "id": "chair_covers", "name": "Chair Covers", "price": 4.50 },
          { "id": "chair_sashes", "name": "Chair Sashes", "price": 2.00 }
        ]
      },
      "servingWare": {
        "title": "Serving Ware",
        "items": [
          { "id": "plates_dinner", "name": "Plates - Dinner", "price": 1.25 },
          { "id": "plates_salad", "name": "Plates - Salad/Dessert", "price": 1.00 },
          { "id": "flatware_sets", "name": "Flatware Sets (Fork, Knife, Spoon)", "price": 1.50 },
          { "id": "water_glasses", "name": "Water Glasses", "price": 0.75 },
          { "id": "wine_glasses", "name": "Wine Glasses", "price": 1.00 },
          { "id": "champagne_flutes", "name": "Champagne Flutes", "price": 1.25 }
        ]
      },
      "furniture": {
        "title": "Furniture & Setup",
        "items": [
          { "id": "round_tables_60", "name": "Round Tables (60 inch)", "price": 15.00 },
          { "id": "rectangular_tables", "name": "Rectangular Tables (8 ft)", "price": 12.00 },
          { "id": "chiavari_chairs", "name": "Chiavari Chairs", "price": 8.00 },
          { "id": "cocktail_tables", "name": "Cocktail Tables (High Top)", "price": 18.00 },
          { "id": "lounge_furniture", "name": "Lounge Furniture Set", "price": 75.00 }
        ]
      }
    }
  }
};

async function runComprehensiveMigration() {
  console.log("🚀 Starting COMPREHENSIVE Phase 1 Wedding Data Migration...");
  console.log("📁 Scanning ALL wedding data files...");
  
  const stringIdToDbIdMap = {};
  const allOriginalItems = new Map();
  let itemsProcessed = 0;
  let itemsInserted = 0;
  let duplicatesFound = 0;

  try {
    // Step 1: Collect ALL unique items from ALL data sources
    console.log("📋 Collecting unique items from ALL wedding data files...");

    Object.entries(weddingData).forEach(([dataSourceKey, dataSource]) => {
      console.log(`  🔍 Processing: ${dataSource.title}`);
      
      Object.entries(dataSource.categories).forEach(([categoryKey, category]) => {
        category.items.forEach(item => {
          itemsProcessed++;
          
          if (!allOriginalItems.has(item.id)) {
            // Determine price from various possible fields
            let itemPrice = 0;
            if (item.price !== undefined) {
              itemPrice = item.price;
            } else if (item.pricePerPiece !== undefined) {
              itemPrice = item.pricePerPiece;
            } else if (item.upcharge !== undefined) {
              itemPrice = item.upcharge;
            }

            allOriginalItems.set(item.id, {
              original_id: item.id,
              name: item.name,
              description: item.description || null,
              category_suggestion: `${categoryKey} - ${dataSource.title}`,
              price: itemPrice,
              source_file: dataSourceKey,
              source_category: categoryKey
            });
          } else {
            duplicatesFound++;
            console.log(`    ⚠️  Duplicate found: ${item.name} (${item.id})`);
          }
        });
      });
    });

    console.log(`✅ Collection complete!`);
    console.log(`   • Total items processed: ${itemsProcessed}`);
    console.log(`   • Unique items found: ${allOriginalItems.size}`);
    console.log(`   • Duplicates detected: ${duplicatesFound}`);

    // Step 2: Insert unique items into menu_items table
    console.log("\n💾 Inserting items into menu_items table...");
    
    for (const itemDetails of allOriginalItems.values()) {
      // Basic metadata for Phase 1 (no dietary info yet)
      const basicMetadata = { 
        original_item_id: itemDetails.original_id,
        source_file: itemDetails.source_file,
        source_category: itemDetails.source_category
      };

      // Normalize price
      let normalizedPrice = null;
      if (typeof itemDetails.price === 'number' && itemDetails.price > 0) {
        normalizedPrice = itemDetails.price.toFixed(2);
      }

      const insertQuery = `
        INSERT INTO menu_items (
          name, description, category, price, 
          is_vegetarian, is_vegan, is_gluten_free, is_dairy_free, is_nut_free,
          additional_dietary_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
      `;

      try {
        const result = await pool.query(insertQuery, [
          itemDetails.name,
          itemDetails.description,
          itemDetails.category_suggestion,
          normalizedPrice,
          false, // Basic boolean flags set to false for Phase 1
          false,
          false,
          false,
          false,
          JSON.stringify(basicMetadata)
        ]);

        const insertedId = result.rows[0].id;
        stringIdToDbIdMap[itemDetails.original_id] = insertedId;
        itemsInserted++;
        
        if (itemsInserted % 10 === 0) {
          console.log(`  📊 Progress: ${itemsInserted}/${allOriginalItems.size} items inserted...`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to insert item ${itemDetails.name}:`, error.message);
      }
    }

    console.log(`✅ Items migration complete!`);
    
    // Final Phase 1 migration report
    console.log("\n🎉 PHASE 1 MIGRATION COMPLETE!");
    console.log("==========================================");
    console.log(`📊 COMPREHENSIVE MIGRATION SUMMARY:`);
    console.log(`   • Data sources scanned: ${Object.keys(weddingData).length}`);
    console.log(`   • Total items processed: ${itemsProcessed}`);
    console.log(`   • Duplicates found: ${duplicatesFound}`);
    console.log(`   • Unique items identified: ${allOriginalItems.size}`);
    console.log(`   • Items successfully migrated: ${itemsInserted}`);
    console.log(`   • Success rate: ${((itemsInserted/allOriginalItems.size)*100).toFixed(1)}%`);
    console.log("==========================================");
    console.log("\n📋 DATA SOURCES PROCESSED:");
    Object.entries(weddingData).forEach(([key, data]) => {
      const itemCount = Object.values(data.categories).reduce((total, cat) => total + cat.items.length, 0);
      console.log(`   • ${data.title}: ${itemCount} items`);
    });
    console.log("\n🔜 Phase 2 will add enhanced dietary information to these items.");
    
  } catch (error) {
    console.error("💥 Migration failed:", error);
  } finally {
    await pool.end();
  }
}

runComprehensiveMigration();