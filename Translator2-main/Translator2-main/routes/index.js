const express = require('express');
const router = express.Router();

// Home page - Translation interface
router.get('/', async (req, res) => {
  try {
    const TranslationSession = require('../models/TranslationSession');
    const GlossaryCategory = require('../models/GlossaryCategory');
    
    const [sessions, categories] = await Promise.all([
      TranslationSession.find()
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate('sourceLanguage'),
      GlossaryCategory.find().sort({ name: 1 })
    ]);
    
    res.render('translator/home', {
      sessions,
      categories,
      title: 'Translate',
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.render('translator/home', {
      sessions: [],
      categories: [],
      title: 'Translate',
      user: req.user || null
    });
  }
});

// Settings page
router.get('/settings', (req, res) => {
  res.render('accounts/settings', {
    title: 'Settings',
    user: req.user || null
  });
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const Project = require('../models/Project');
    const projects = await Project.find()
      .sort({ updatedAt: -1 })
      .populate('sourceLanguage targetLanguage');
    
    res.render('projects/dashboard', {
      projects,
      title: 'Dashboard',
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.render('projects/dashboard', {
      projects: [],
      title: 'Dashboard',
      user: req.user || null
    });
  }
});

module.exports = router;
