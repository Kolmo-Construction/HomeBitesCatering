/**
 * Enhanced Menu Import Script with Event Type Support
 * 
 * This script imports menu themes and associates them with specific event types
 * (wedding, corporate, birthday, etc.) for better categorization and filtering.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { menus, menuItems } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const { Pool } = pg;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Event-specific menu configurations
const EVENT_MENU_CONFIGURATIONS = {
  wedding: [
    {
      name: "Elegant Wedding Reception",
      description: "Sophisticated menu perfect for wedding celebrations with classic and contemporary options",
      type: "form_builder",
      eventType: "wedding",
      categories: [
        {
          category_key: "appetizers",
          display_title: "Wedding Appetizers",
          description: "Elegant starters for your special day",
          selection_limit: 3,
          available_item_ids: ["stuffed_poblano", "grilled_vegetables", "cilantro_lime_rice"]
        },
        {
          category_key: "main_courses", 
          display_title: "Main Course Selection",
          description: "Choose your wedding entrees",
          selection_limit: 2,
          available_item_ids: ["cacciatore_w", "barbacoa", "pork_carnitas"]
        },
        {
          category_key: "sides",
          display_title: "Wedding Sides",
          description: "Perfect accompaniments for your meal",
          selection_limit: 2,
          available_item_ids: ["pasta_salad", "garden_salad", "mexican_rice"]
        }
      ]
    },
    {
      name: "Rustic Wedding Feast",
      description: "Farm-to-table wedding menu with seasonal ingredients and comfort food classics",
      type: "form_builder", 
      eventType: "wedding",
      categories: [
        {
          category_key: "farm_fresh_appetizers",
          display_title: "Farm Fresh Starters",
          description: "Seasonal appetizers made with local ingredients",
          selection_limit: 2,
          available_item_ids: ["grilled_vegetables", "crunchy_asian_salad"]
        },
        {
          category_key: "hearty_mains",
          display_title: "Hearty Main Courses", 
          description: "Comfort food classics for your celebration",
          selection_limit: 2,
          available_item_ids: ["cacciatore_w", "ground_beef", "pork_belly"]
        }
      ]
    }
  ],
  
  corporate: [
    {
      name: "Executive Business Lunch",
      description: "Professional catering menu designed for corporate events and business meetings",
      type: "form_builder",
      eventType: "corporate",
      categories: [
        {
          category_key: "professional_appetizers",
          display_title: "Professional Appetizers",
          description: "Light starters perfect for business settings",
          selection_limit: 2,
          available_item_ids: ["garden_salad", "pasta_salad"]
        },
        {
          category_key: "business_entrees",
          display_title: "Business Lunch Entrees",
          description: "Sophisticated main courses for corporate dining",
          selection_limit: 2,
          available_item_ids: ["cacciatore_w", "flank_steak_fajitas"]
        }
      ]
    },
    {
      name: "Corporate Conference Catering",
      description: "All-day catering solution for conferences and workshops",
      type: "form_builder",
      eventType: "corporate", 
      categories: [
        {
          category_key: "conference_breakfast",
          display_title: "Conference Breakfast",
          description: "Energizing breakfast options",
          selection_limit: 2,
          available_item_ids: ["mexican_rice", "cilantro_lime_rice"]
        },
        {
          category_key: "conference_lunch",
          display_title: "Conference Lunch",
          description: "Satisfying lunch selections",
          selection_limit: 3,
          available_item_ids: ["barbacoa", "pork_carnitas", "tofu"]
        }
      ]
    }
  ],
  
  birthday: [
    {
      name: "Birthday Party Celebration",
      description: "Fun and festive menu perfect for birthday celebrations of all ages",
      type: "form_builder",
      eventType: "birthday",
      categories: [
        {
          category_key: "party_favorites",
          display_title: "Party Favorites", 
          description: "Crowd-pleasing favorites everyone will love",
          selection_limit: 3,
          available_item_ids: ["ground_beef", "pork_belly", "flank_steak_fajitas"]
        },
        {
          category_key: "birthday_sides",
          display_title: "Birthday Sides",
          description: "Perfect sides for your celebration",
          selection_limit: 2,
          available_item_ids: ["mexican_rice", "pasta_salad", "garden_salad"]
        }
      ]
    }
  ],
  
  holiday_party: [
    {
      name: "Holiday Celebration Menu",
      description: "Festive holiday menu with seasonal flavors and traditional favorites",
      type: "form_builder",
      eventType: "holiday_party",
      categories: [
        {
          category_key: "holiday_appetizers",
          display_title: "Holiday Appetizers",
          description: "Festive starters for your holiday gathering",
          selection_limit: 2,
          available_item_ids: ["stuffed_poblano", "grilled_vegetables"]
        },
        {
          category_key: "holiday_mains",
          display_title: "Holiday Main Courses",
          description: "Traditional holiday entrees",
          selection_limit: 2,
          available_item_ids: ["cacciatore_w", "prime_rib", "pork_carnitas"]
        }
      ]
    }
  ]
};

/**
 * Helper function to make authenticated API requests
 */
async function makeRequest(url, data) {
  const response = await fetch(`http://localhost:5000${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Create a menu with event type categorization
 */
async function createEventMenu(menuConfig) {
  try {
    console.log(`Creating ${menuConfig.eventType} menu: ${menuConfig.name}`);
    
    // Build menu structure for form builder
    const menuStructure = {
      theme_key: menuConfig.name.toLowerCase().replace(/\s+/g, '_'),
      package_id: `${menuConfig.eventType}_package_${Date.now()}`,
      package_name: menuConfig.name,
      package_description: menuConfig.description,
      package_price_per_person: 0,
      customizable: true,
      categories: menuConfig.categories
    };
    
    // Insert menu into database
    const [newMenu] = await db.insert(menus).values({
      name: menuConfig.name,
      description: menuConfig.description,
      type: menuConfig.type,
      eventType: menuConfig.eventType,
      items: JSON.stringify(menuStructure)
    }).returning();
    
    console.log(`✅ Created menu: ${newMenu.name} (ID: ${newMenu.id}) for ${menuConfig.eventType} events`);
    return newMenu;
    
  } catch (error) {
    console.error(`❌ Failed to create menu ${menuConfig.name}:`, error);
    throw error;
  }
}

/**
 * Update existing menus with event types
 */
async function updateExistingMenusWithEventTypes() {
  try {
    console.log('🔄 Updating existing menus with event types...');
    
    // Get all existing menus without event types
    const existingMenus = await db.select().from(menus);
    
    const eventTypeAssignments = {
      'American BBQ': 'wedding',
      'Taco Fiesta': 'birthday', 
      'A Taste of Greece': 'corporate',
      'Kebab party': 'celebration',
      'PASCAL MATTA': 'corporate'
    };
    
    for (const menu of existingMenus) {
      const assignedEventType = eventTypeAssignments[menu.name] || 'other';
      
      await db.update(menus)
        .set({ eventType: assignedEventType })
        .where(eq(menus.id, menu.id));
        
      console.log(`  Updated "${menu.name}" → ${assignedEventType}`);
    }
    
    console.log('✅ Existing menus updated with event types');
    
  } catch (error) {
    console.error('❌ Failed to update existing menus:', error);
    throw error;
  }
}

/**
 * Import all event-specific menus
 */
async function importEventMenus() {
  try {
    console.log('🚀 Starting event-categorized menu import...');
    
    // First, update existing menus with event types
    await updateExistingMenusWithEventTypes();
    
    let totalCreated = 0;
    
    // Import menus for each event type
    for (const [eventType, menuConfigs] of Object.entries(EVENT_MENU_CONFIGURATIONS)) {
      console.log(`\n📋 Importing ${eventType} menus...`);
      
      for (const menuConfig of menuConfigs) {
        await createEventMenu(menuConfig);
        totalCreated++;
      }
      
      console.log(`✅ Completed ${eventType} menus (${menuConfigs.length} menus)`);
    }
    
    // Generate summary statistics
    const menuStats = await db.select().from(menus);
    const eventTypeStats = {};
    
    menuStats.forEach(menu => {
      const eventType = menu.eventType || 'unassigned';
      eventTypeStats[eventType] = (eventTypeStats[eventType] || 0) + 1;
    });
    
    console.log('\n📊 Final Menu Statistics by Event Type:');
    Object.entries(eventTypeStats).forEach(([eventType, count]) => {
      console.log(`  ${eventType}: ${count} menu${count !== 1 ? 's' : ''}`);
    });
    
    console.log(`\n🎉 Import completed! Created ${totalCreated} new event-specific menus.`);
    console.log(`Total menus in system: ${menuStats.length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await pool.end();
  }
}

/**
 * Run the import
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  importEventMenus();
}

export { importEventMenus, createEventMenu, EVENT_MENU_CONFIGURATIONS };