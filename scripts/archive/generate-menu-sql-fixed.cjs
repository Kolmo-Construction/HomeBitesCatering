// Generate SQL inserts for menu items with correct column names
const fs = require('fs');

// Read the menu data from the JSON file
const menuData = JSON.parse(fs.readFileSync('./menu-data.json', 'utf8'));

// Generate SQL insert statements
let allSql = '';

// Process each menu item
for (const item of menuData) {
  const ingredientsStr = item.ingredients.join(', ');
  
  // Create an SQL INSERT statement with correct column names (snake_case)
  const sql = `INSERT INTO menu_items (
    name, 
    description, 
    category, 
    price, 
    ingredients, 
    is_vegetarian, 
    is_vegan, 
    is_gluten_free, 
    is_dairy_free, 
    is_nut_free
  ) VALUES (
    '${item.itemName.replace(/'/g, "''")}', 
    '${item.description.replace(/'/g, "''")}', 
    '${item.category.replace(/'/g, "''")}', 
    NULL, 
    '${ingredientsStr.replace(/'/g, "''")}', 
    ${item.dietaryNotes.vegetarian}, 
    ${item.dietaryNotes.vegan}, 
    ${item.dietaryNotes.glutenFree}, 
    ${item.dietaryNotes.dairyFree}, 
    ${item.dietaryNotes.nutFree}
  );\n`;
  
  allSql += sql;
}

// Write SQL to a file
fs.writeFileSync('menu-items-insert-fixed.sql', allSql);
console.log('SQL insert statements generated in menu-items-insert-fixed.sql');
console.log('You can execute this SQL directly in the database.');