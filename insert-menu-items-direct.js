// Direct SQL insertion for menu items
import { menuItems } from './shared/schema.js';
import { execute_sql_tool } from './replit-tools.js';
import fs from 'fs';

// Read the menu data from the JSON file
const menuData = JSON.parse(fs.readFileSync('./menu-data.json', 'utf8'));

// Generate SQL insert statements
let allSql = '';

// Process each menu item
for (const item of menuData) {
  const ingredientsStr = item.ingredients.join(', ');
  
  // Create an SQL INSERT statement
  const sql = `INSERT INTO menu_items (
    name, 
    description, 
    category, 
    price, 
    ingredients, 
    "isVegetarian", 
    "isVegan", 
    "isGlutenFree", 
    "isDairyFree", 
    "isNutFree"
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
fs.writeFileSync('menu-items-insert.sql', allSql);
console.log('SQL insert statements generated in menu-items-insert.sql');
console.log('You can execute this SQL directly in the database using the SQL execution tool.');