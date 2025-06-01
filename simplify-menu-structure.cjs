/**
 * Script to simplify menu structure by removing redundant fields
 * and using the existing database columns properly
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');
const { menus } = require('./shared/schema.ts');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function simplifyMenuStructure() {
  console.log('🧹 Simplifying menu structure...');
  
  try {
    // Get all form_builder menus
    const formBuilderMenus = await db
      .select()
      .from(menus)
      .where(eq(menus.type, 'form_builder'));

    for (const menu of formBuilderMenus) {
      let menuStructure;
      try {
        menuStructure = typeof menu.items === 'string' 
          ? JSON.parse(menu.items) 
          : menu.items;
      } catch (error) {
        console.error(`Failed to parse menu items for menu ${menu.id}:`, error);
        continue;
      }

      // Create simplified structure - keep only the essential data
      const simplifiedStructure = {
        // Remove redundant fields: theme_key, package_id, package_name, package_description, customizable
        categories: menuStructure.categories || [],
        // Keep any pricing info if it exists
        ...(menuStructure.package_price_per_person && { 
          base_price_per_person: menuStructure.package_price_per_person 
        })
      };

      // Update the menu with simplified structure
      await db
        .update(menus)
        .set({ 
          items: JSON.stringify(simplifiedStructure),
          // Ensure description is populated from package_description if empty
          description: menu.description || menuStructure.package_description || `${menu.name} menu`
        })
        .where(eq(menus.id, menu.id));

      console.log(`✅ Simplified menu: ${menu.name}`);
    }

    console.log('\n🎉 Menu structure simplification complete!');
    
  } catch (error) {
    console.error('Error simplifying menu structure:', error);
  } finally {
    await pool.end();
  }
}

// Run the simplification
simplifyMenuStructure();