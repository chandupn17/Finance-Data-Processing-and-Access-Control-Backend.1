/**
 * Vercel serverless entry: exports the Express app (do not call app.listen here).
 * Local development: use `npm start` → src/server.js
 */
const app = require('../src/app');

module.exports = app;
