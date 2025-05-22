// Script to add Diamond Package limits to theme categories
const fs = require('fs');

// Read the themeMenuInfo.ts file
const filePath = 'client/src/data/themeMenuInfo.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Define the changes for each theme
const updates = [
  // taco_fiesta theme
  {
    find: `taco_fiesta: {
    title: "Taco Fiesta",`,
    categories: [
      {
        name: "proteins",
        limit: 5
      },
      {
        name: "sides",
        limit: 5
      },
      {
        name: "salsas",
        limit: 5
      },
      {
        name: "condiments",
        limit: 10
      }
    ]
  },
  
  // american_bbq theme
  {
    find: `american_bbq: {
    title: "American BBQ",`,
    categories: [
      {
        name: "mains",
        limit: 5
      },
      {
        name: "sides",
        limit: 5
      },
      {
        name: "salads",
        limit: 4
      },
      {
        name: "sauces",
        limit: 5
      },
      {
        name: "condiments",
        limit: 10
      }
    ]
  },
  
  // taste_of_greece theme
  {
    find: `taste_of_greece: {
    title: "A Taste of Greece",`,
    categories: [
      {
        name: "mains",
        limit: 5
      },
      {
        name: "sides",
        limit: 6
      },
      {
        name: "salads",
        limit: 4
      }
    ]
  },
  
  // kebab_party theme
  {
    find: `kebab_party: {
    title: "Kebab Party",`,
    categories: [
      {
        name: "proteins",
        limit: 5
      },
      {
        name: "sides",
        limit: 5
      },
      {
        name: "sauces",
        limit: 5
      }
    ]
  }
];

// Process each theme update
updates.forEach(theme => {
  // Make sure this is the right theme
  if (!content.includes(theme.find)) {
    console.log(`Could not find theme: ${theme.find.split('\n')[0]}`);
    return;
  }
  
  // Process each category in the theme
  theme.categories.forEach(category => {
    // Find the category limits section in this theme
    const regexPattern = new RegExp(`${theme.find}[\\s\\S]*?${category.name}: {[\\s\\S]*?limits: {([\\s\\S]*?)},`, 'g');
    const matches = regexPattern.exec(content);
    
    if (!matches) {
      console.log(`Could not find category: ${category.name} in theme: ${theme.find.split('\n')[0]}`);
      return;
    }
    
    // Check if the diamond limit is already present
    const limitSection = matches[1];
    if (limitSection.includes('"diamond"')) {
      console.log(`Diamond limit already exists for ${category.name} in ${theme.find.split('\n')[0]}`);
      return;
    }
    
    // Add the diamond limit to the limits section
    const updatedLimits = limitSection + `,\n          "diamond": ${category.limit}`;
    content = content.replace(limitSection, updatedLimits);
  });
});

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Diamond Package limits have been added to all theme categories!');