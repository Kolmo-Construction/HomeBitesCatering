// Script to add Diamond Package limits to theme categories
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'themeMenuInfo.ts');
let fileContent = fs.readFileSync(filePath, 'utf8');

// Update taco_fiesta categories
fileContent = fileContent.replace(/taco_fiesta.*?salsas: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

fileContent = fileContent.replace(/taco_fiesta.*?sides: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

fileContent = fileContent.replace(/taco_fiesta.*?condiments: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 10}');
  }
  return match;
});

// Update american_bbq categories
fileContent = fileContent.replace(/american_bbq.*?mains: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

fileContent = fileContent.replace(/american_bbq.*?sides: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

fileContent = fileContent.replace(/american_bbq.*?salads: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 4}');
  }
  return match;
});

fileContent = fileContent.replace(/american_bbq.*?sauces: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

fileContent = fileContent.replace(/american_bbq.*?condiments: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 10}');
  }
  return match;
});

// Update taste_of_greece categories
fileContent = fileContent.replace(/taste_of_greece.*?mains: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

fileContent = fileContent.replace(/taste_of_greece.*?sides: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 6}');
  }
  return match;
});

fileContent = fileContent.replace(/taste_of_greece.*?salads: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 4}');
  }
  return match;
});

// Update kebab_party categories
fileContent = fileContent.replace(/kebab_party.*?proteins: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

fileContent = fileContent.replace(/kebab_party.*?sides: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

fileContent = fileContent.replace(/kebab_party.*?sauces: {[\s\S]*?limits: {([\s\S]*?)}}/g, (match) => {
  if (!match.includes('"diamond":')) {
    return match.replace(/limits: {([\s\S]*?)}/, 'limits: {,
          "diamond": 5}');
  }
  return match;
});

// Write the updated content back to the file
fs.writeFileSync(filePath, fileContent, 'utf8');

console.log('Diamond Package limits added to all theme categories successfully!');
