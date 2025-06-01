/**
 * Build-time Menu Data Generation Script - CommonJS Version
 * 
 * This script fetches all menu data from the database and generates
 * static JSON files that can be imported directly in the frontend.
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');
const fs = require('fs/promises');
const path = require('path');

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

async function generateMenuData() {
  console.log('🚀 Starting menu data generation...');
  
  try {
    await ensureOutputDirectory();
    
    // Get all form_builder menus
    console.log('📋 Fetching form_builder menus...');
    const formBuilderMenus = await db.execute(`
      SELECT id, name, description, items, event_type 
      FROM menus 
      WHERE type = 'form_builder'
    `);
    
    const menusByEventType = {};
    const allMenus = [];

    for (const menu of formBuilderMenus.rows) {
      let menuStructure;
      try {
        menuStructure = typeof menu.items === 'string' 
          ? JSON.parse(menu.items) 
          : menu.items;
      } catch (error) {
        console.error(`Failed to parse menu items for menu ${menu.id}:`, error);
        continue;
      }

      const eventType = menu.event_type || 'general';
      const themeKey = menuStructure?.theme_key || `theme_${menu.id}`;
      const packageId = menuStructure?.package_id || `package_${menu.id}`;
      
      const processedMenu = {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        event_type: eventType,
        theme_key: themeKey,
        package_id: packageId,
        structure: menuStructure
      };

      // Group by event type
      if (!menusByEventType[eventType]) {
        menusByEventType[eventType] = [];
      }
      menusByEventType[eventType].push(processedMenu);
      allMenus.push(processedMenu);

      console.log(`✓ Processed menu: ${menu.name} (Event: ${eventType}, Theme: ${themeKey})`);
    }

    // Write categorized menus by event type
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'menus-by-event-type.json'),
      JSON.stringify(menusByEventType, null, 2)
    );

    // Write all menus
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'all-menus.json'),
      JSON.stringify(allMenus, null, 2)
    );

    console.log('✅ Menu data generation complete!');
    console.log(`📁 Generated files in: ${OUTPUT_DIR}`);
    console.log(`📊 Processed ${allMenus.length} menus across ${Object.keys(menusByEventType).length} event types`);
    
  } catch (error) {
    console.error('Error generating menu data:', error);
  } finally {
    await pool.end();
  }
}

// Run the generation
generateMenuData();