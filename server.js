require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Initialize app
const app = express();

// Database connection
const connectDB = require('./config/database');
connectDB();

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/index'));
app.use('/translate', require('./routes/translate'));
app.use('/projects', require('./routes/projects'));
app.use('/glossary', require('./routes/glossary'));
app.use('/api', require('./routes/api'));
app.use('/api/translate', require('./routes/translateApi'));

// Error handling
app.use((req, res) => {
  res.status(404).render('errors/404');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', { error: err });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Translator server running on port ${PORT}`);
});
