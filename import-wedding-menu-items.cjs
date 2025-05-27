/**
 * Wedding Menu Items Import Script
 * 
 * This script imports menu items from WeddingImport.ts into the menu_items database table
 * with all the enhanced dietary metadata and nutritional information.
 */

const { readFileSync } = require('fs');
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

// Set up database connection
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importWeddingMenuItems() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting wedding menu items import...');
    
    // Read the wedding import data
    const weddingDataFile = './client/src/pages/wedding/data/weddingAppt-dessert-sand-Import.ts';
    const fileContent = readFileSync(weddingDataFile, 'utf-8');
    
    // Extract JSON array from the TypeScript file with robust error handling
    let weddingItems;
    try {
      // Read and parse the JSON content
      let jsonContent = fileContent.trim();
      
      // Handle potential JSON syntax issues
      if (!jsonContent.startsWith('[')) {
        throw new Error('File does not start with array bracket');
      }
      
      // Find the last complete object and ensure proper array closure
      const lastUpchargeIndex = jsonContent.lastIndexOf('"upcharge":');
      if (lastUpchargeIndex > -1) {
        const afterUpcharge = jsonContent.indexOf('}', lastUpchargeIndex);
        if (afterUpcharge > -1) {
          // Ensure we have a complete JSON array
          jsonContent = jsonContent.substring(0, afterUpcharge + 1) + '\n  ]';
        }
      }
      
      weddingItems = JSON.parse(jsonContent);
      console.log('✅ Successfully parsed wedding menu data');
      
    } catch (error) {
      console.log('⚠️  JSON parsing failed, using fallback parsing method...');
      
      // Fallback: try to extract individual objects from the file
      try {
        const objectMatches = fileContent.match(/{[^{}]*"upcharge":\s*\d+[^{}]*}/g);
        if (objectMatches && objectMatches.length > 0) {
          weddingItems = objectMatches.map(objStr => {
            try {
              return JSON.parse(objStr);
            } catch (e) {
              return null;
            }
          }).filter(item => item !== null);
          
          console.log('✅ Used fallback parsing method');
        } else {
          throw new Error('Could not extract valid objects from file');
        }
      } catch (e) {
        console.error('❌ All parsing methods failed. The wedding data file may be corrupted.');
        console.error('Original error:', error.message);
        process.exit(1);
      }
    }
    
    console.log(`📊 Found ${weddingItems.length} wedding menu items to import`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const item of weddingItems) {
      try {
        // Check if item already exists
        const existingResult = await client.query(
          'SELECT id FROM menu_items WHERE id = $1',
          [item.id]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`⏭️  Skipping existing item: ${item.name}`);
          skipCount++;
          continue;
        }
        
        // Insert the item with all fields including the new dietary metadata
        const insertQuery = `
          INSERT INTO menu_items (
            id, name, description, category, price, upcharge, ingredients,
            is_vegetarian, is_vegan, is_gluten_free, is_dairy_free, is_nut_free,
            image, additional_dietary_metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          )
        `;
        
        const values = [
          item.id,
          item.name,
          item.description,
          item.category,
          item.price,
          item.upcharge,
          item.ingredients,
          item.is_vegetarian || false,
          item.is_vegan || false,
          item.is_gluten_free || false,
          item.is_dairy_free || false,
          item.is_nut_free || false,
          item.image,
          JSON.stringify(item.additional_dietary_metadata)
        ];
        
        await client.query(insertQuery, values);
        
        console.log(`✅ Imported: ${item.name}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error importing ${item.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount} items`);
    console.log(`⏭️  Skipped (already exists): ${skipCount} items`);
    console.log(`❌ Errors: ${errorCount} items`);
    console.log(`📊 Total processed: ${weddingItems.length} items`);
    
    if (successCount > 0) {
      console.log('\n🍽️ Wedding menu items have been successfully imported!');
      console.log('These items now include:');
      console.log('- Enhanced dietary metadata with structured nutritional highlights');
      console.log('- Allergen alerts and dietary flags');
      console.log('- Customer guidance and preparation notes');
      console.log('- Dual pricing structure (base price + upcharge)');
    }
    
  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
importWeddingMenuItems()
  .then(() => {
    console.log('✨ Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });