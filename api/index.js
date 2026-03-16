// Vercel serverless entry point
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const sessionTtlSeconds = 7 * 24 * 60 * 60;
const missingEnv = ['MONGODB_URI', 'SESSION_SECRET'].filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error('[startup] Missing required env vars:', missingEnv.join(', '));
}
if (isProduction) {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  name: process.env.SESSION_COOKIE_NAME || 'orbis.sid',
  secret: process.env.SESSION_SECRET || 'translator-session-secret',
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  store: process.env.MONGODB_URI ? MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: sessionTtlSeconds,
    autoRemove: 'native'
  }) : undefined,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: sessionTtlSeconds * 1000
  }
}));

// Passport initialization
require('../config/passport');
app.use(passport.initialize());
app.use(passport.session());

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
app.use('/auth', require('../routes/auth'));
app.use('/translate', require('../routes/translate'));
app.use('/projects', require('../routes/projects'));
app.use('/glossary', require('../routes/glossary'));
app.use('/memory', require('../routes/memory'));
app.use('/admin', require('../routes/admin'));
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
