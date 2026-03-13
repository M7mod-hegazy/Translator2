// Vercel serverless entry point
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files - serve from parent directory
app.use(express.static(path.join(__dirname, '../public')));

// Global mongoose connection cache
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && cachedDb.readyState === 1) {
    return cachedDb;
  }
  
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
  });
  cachedDb = conn.connection;
  return cachedDb;
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('DB connection error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/', require('../routes/index'));
app.use('/translate', require('../routes/translate'));
app.use('/projects', require('../routes/projects'));
app.use('/glossary', require('../routes/glossary'));
app.use('/api', require('../routes/api'));
app.use('/api/translate', require('../routes/translateApi'));

// Error handling
app.use((req, res) => {
  res.status(404).render('errors/404');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', { error: err });
});

// Export for Vercel
module.exports = app;
