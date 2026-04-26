const express = require('express');
const router = express.Router();
const { translate, batchTranslate, getTMSuggestions } = require('../utils/translateEngine');

// Single translation
router.post('/', async (req, res) => {
  try {
    const { sourceText, sourceLang, targetLang, useTM, useGlossary, domain, saveToTM } = req.body;
    
    if (!sourceText || !sourceLang || !targetLang) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await translate(sourceText, sourceLang, targetLang, {
      useTM: useTM !== false,
      useGlossary: useGlossary !== false,
      domain: domain || 'general',
      saveToTM: saveToTM || false
    });
    
    res.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch translation
router.post('/batch', async (req, res) => {
  try {
    const { segments, sourceLang, targetLang, options } = req.body;
    
    if (!segments || !Array.isArray(segments) || !sourceLang || !targetLang) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const results = await batchTranslate(segments, sourceLang, targetLang, options || {});
    
    res.json({ translations: results });
  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TM suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { text, sourceLang, targetLang, limit } = req.query;
    
    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    const suggestions = await getTMSuggestions(text, sourceLang, targetLang, parseInt(limit) || 5);
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
