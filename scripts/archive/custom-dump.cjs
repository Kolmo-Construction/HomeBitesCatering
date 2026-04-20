
// Custom database dump utility with more options
const { exec } = require('child_process');

// Get the database URL from environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// Format: data-only, schema-only, or full
const format = process.argv[2] || 'full';
// Compression: none, custom, or gzip
const compression = process.argv[3] || 'none';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
let outputFilename = `database-dump-${format}-${timestamp}`;
let command = '';

// Build the command based on format
switch (format) {
  case 'data-only':
    outputFilename += '.sql';
    command = `pg_dump "${databaseUrl}" --data-only > ${outputFilename}`;
    break;
  case 'schema-only':
    outputFilename += '.sql';
    command = `pg_dump "${databaseUrl}" --schema-only > ${outputFilename}`;
    break;
  default:
    outputFilename += '.sql';
    command = `pg_dump "${databaseUrl}" > ${outputFilename}`;
    break;
}

// Apply compression if needed
if (compression === 'gzip') {
  outputFilename += '.gz';
  command = `pg_dump "${databaseUrl}" | gzip > ${outputFilename}`;
} else if (compression === 'custom') {
  outputFilename = outputFilename.replace('.sql', '.custom');
  command = `pg_dump "${databaseUrl}" -Fc > ${outputFilename}`;
}

console.log(`Creating ${format} database dump to ${outputFilename}...`);

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
});
