// Builds the Express app (kept separate from index.js so tests can use it without starting a server).
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { errorHandler } = require('./middleware');
const { roadmapRouter, progressRouter } = require('./routes/roadmap');

const app = express();
app.set('trust proxy', 1); // hosting services put a proxy in front of the app

app.use(helmet()); // safer HTTP headers
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true })); // only needed if the frontend is hosted elsewhere
app.use(express.json({ limit: '100kb' }));

// Slow down password guessing
if (!config.isTest) {
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
}

// ---- API ----
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api', require('./routes/catalogue')); // /api/skills, /api/roles
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/roadmap', roadmapRouter);
app.use('/api/progress', progressRouter);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

// ---- Frontend ----
// After `npm run build`, the React app is in client/dist. The same server serves it,
// so there is only ONE website address to share.
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html'))); // lets React Router handle /login, /roadmap...
}

app.use(errorHandler);

module.exports = app;
