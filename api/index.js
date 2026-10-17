// Vercel entry point: exports the Express app as a serverless function.
// For local development keep using `npm start` (server.js).
require('dotenv').config();
module.exports = require('../src/app');
