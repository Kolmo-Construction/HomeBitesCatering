
// Database dump utility script
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the database URL from environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// Create a timestamp for the filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFilename = `database-dump-${timestamp}.sql`;

console.log(`Creating database dump to ${outputFilename}...`);

// Use pg_dump to create a database dump
// Note: pg_dump is installed by default in Replit PostgreSQL module
const command = `pg_dump "${databaseUrl}" > ${outputFilename}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing pg_dump: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`pg_dump stderr: ${stderr}`);
    return;
  }
  
  console.log(`Database dump completed successfully!`);
  console.log(`The dump file is saved as: ${outputFilename}`);
  
  // Get file size
  const stats = fs.statSync(outputFilename);
  console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  
  console.log("\nYou can download this file from the Replit Files tab.");
});
