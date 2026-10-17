require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql not found at', schemaPath);
    process.exit(1);
  }

  const dbName = process.env.DB_NAME || 'ju_cbe_training';

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  });

  if (process.argv.includes('--fresh')) {
    console.log(`Dropping database ${dbName} if it exists ...`);
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  }

  console.log('Running schema.sql ...');
  let schema = fs.readFileSync(schemaPath, 'utf8').split('ju_cbe_training').join(dbName);
  // Some hosts do not allow CREATE DATABASE: set DB_SKIP_CREATE=true to skip it.
  if (process.env.DB_SKIP_CREATE === 'true') {
    schema = schema.replace(/CREATE DATABASE[^;]*;/i, '');
  }
  await conn.query(schema);
  console.log('Schema created successfully.');

  if (process.argv.includes('--seed')) {
    console.log('Running seed.sql ...');
    const seed = fs.readFileSync(seedPath, 'utf8').split('ju_cbe_training').join(dbName);
    await conn.query(seed);
    console.log('Sample data seeded successfully.');
  }

  await conn.end();
}

run().catch((err) => {
  console.error('Database initialization failed:', err.message);
  process.exit(1);
});