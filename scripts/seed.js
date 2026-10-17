require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
  if (!fs.existsSync(seedPath)) {
    console.error('seed.sql not found at', seedPath);
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  });

  console.log('Seeding database ...');
  const dbName = process.env.DB_NAME || 'ju_cbe_training';
  const seed = fs.readFileSync(seedPath, 'utf8').split('ju_cbe_training').join(dbName);
  await conn.query(seed);
  console.log('Sample data seeded successfully.');

  await conn.end();
}

run().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});