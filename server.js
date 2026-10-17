require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('==========================================');
  console.log('  Jimma University CBE Training System');
  console.log(`  Running on http://localhost:${PORT}`);
  console.log('==========================================');
});

module.exports = server;