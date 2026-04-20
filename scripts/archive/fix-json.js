import fs from 'fs';

// Read the problematic JSON file
let content = fs.readFileSync('./client/src/pages/wedding/data/weddingAppt-dessert-sand-Import.ts', 'utf-8');

// Simple fix: ensure the JSON array is properly closed
const lines = content.split('\n');
let fixedLines = [];
let objectCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Count opening braces to track objects
  if (line.includes('{') && !line.includes('"')) {
    objectCount++;
  }
  
  fixedLines.push(line);
  
  // If we're at a closing brace and it's the end of the file area
  if (line.trim() === '}' && i > lines.length - 10) {
    fixedLines.push('  ]');
    break;
  }
}

const fixedContent = fixedLines.join('\n');
fs.writeFileSync('./client/src/pages/wedding/data/weddingAppt-dessert-sand-Import.ts', fixedContent);

// Test the fix
try {
  const data = JSON.parse(fixedContent);
  console.log('Fixed successfully! Found', data.length, 'wedding menu items');
} catch (e) {
  console.log('Manual fix needed:', e.message.substring(0, 50));
}