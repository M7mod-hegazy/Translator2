const express = require('express');
const router = express.Router();
const TranslationSession = require('../models/TranslationSession');
const Language = require('../models/Language');

// Translation home page
router.get('/', async (req, res) => {
  try {
    const sessions = await TranslationSession.find()
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('sourceLanguage category');
    
    const languages = await Language.find().sort('name');
    
    res.render('translator/home', {
      sessions,
      languages,
      title: 'Translate'
    });
  } catch (err) {
    console.error(err);
    res.render('translator/home', {
      sessions: [],
      languages: [],
      title: 'Translate'
    });
  }
});

// Create new translation session
router.post('/session', async (req, res) => {
  try {
    const { sourceText, sourceLanguage, title, category } = req.body;
    
    const session = new TranslationSession({
      sourceText,
      sourceLanguage,
      title: title || '',
      category: category || null
    });
    
    await session.save();
    res.json({ success: true, sessionId: session._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get translation session
router.get('/session/:id', async (req, res) => {
  try {
    const session = await TranslationSession.findById(req.params.id)
      .populate('sourceLanguage category');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update translation session
router.put('/session/:id', async (req, res) => {
  try {
    const { targetLang, translation, title } = req.body;
    
    const session = await TranslationSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (targetLang && translation !== undefined) {
      session.translations.set(targetLang, translation);
    }
    if (title) {
      session.title = title;
    }
    
    await session.save();
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete translation session
router.delete('/session/:id', async (req, res) => {
  try {
    const session = await TranslationSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    await session.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Translation Memory browser
router.get('/tm', async (req, res) => {
  try {
    const TranslationMemory = require('../models/TranslationMemory');
    const memories = await TranslationMemory.find()
      .populate('sourceLanguage targetLanguage')
      .sort({ usageCount: -1 })
      .limit(100);
    
    res.render('translator/tm_browser', {
      memories,
      title: 'Translation Memory'
    });
  } catch (err) {
    res.render('translator/tm_browser', {
      memories: [],
      title: 'Translation Memory'
    });
  }
});

module.exports = router;
