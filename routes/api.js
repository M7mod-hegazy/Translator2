const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Document = require('../models/Document');
const Segment = require('../models/Segment');
const GlossaryTerm = require('../models/GlossaryTerm');
const GlossaryCategory = require('../models/GlossaryCategory');
const TranslationMemory = require('../models/TranslationMemory');
const TranslationSession = require('../models/TranslationSession');
const Language = require('../models/Language');
const { translateMultiTarget, translateDirect } = require('../utils/translateEngine');

// Speech-to-text using Groq Whisper (free tier)
router.post('/speech-to-text', async (req, res) => {
  try {
    const { audio, lang } = req.body;
    
    if (!audio) {
      return res.status(400).json({ success: false, error: 'No audio data' });
    }
    
    // Use Groq's free Whisper API
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
      return res.json({ success: false, error: 'Speech API not configured. Add GROQ_API_KEY to .env' });
    }
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    
    if (audioBuffer.length < 100) {
      return res.json({ success: false, error: 'Audio too short' });
    }
    
    // Build multipart form manually
    const boundary = '----FormBoundary' + Date.now();
    const parts = [];
    
    // File part
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="file"; filename="audio.webm"\r\n`);
    parts.push(`Content-Type: audio/webm\r\n\r\n`);
    
    const bodyParts = [
      Buffer.from(parts.join(''), 'utf8'),
      audioBuffer,
      Buffer.from(`\r\n--${boundary}\r\n`, 'utf8'),
      Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3-turbo\r\n`, 'utf8'),
      Buffer.from(`--${boundary}\r\n`, 'utf8'),
      Buffer.from(`Content-Disposition: form-data; name="language"\r\n\r\n${lang || 'en'}\r\n`, 'utf8'),
      Buffer.from(`--${boundary}--\r\n`, 'utf8')
    ];
    
    const body = Buffer.concat(bodyParts);
    
    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });
    
    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', errText);
      return res.json({ success: false, error: 'Speech API error: ' + groqRes.status });
    }
    
    const result = await groqRes.json();
    res.json({ success: true, text: result.text || '' });
  } catch (err) {
    console.error('Speech-to-text error:', err);
    res.json({ success: false, error: err.message });
  }
});

// ── Translate API ──

// POST /api/translate - Translate text into one or more target languages
router.post('/translate', async (req, res) => {
  try {
    const { text, source_lang, target_langs, category_id, use_glossary, disabled_terms } = req.body;
    
    console.log('[Translate API] Request:', { text: text?.substring(0, 50), source_lang, target_langs, category_id });
    
    if (!text || !text.trim()) {
      return res.json({ success: true, translations: {} });
    }
    
    if (!target_langs || !target_langs.length) {
      return res.status(400).json({ success: false, error: 'No target languages.' });
    }
    
    const results = await translateMultiTarget(text, source_lang || 'en', target_langs, {
      category: category_id,
      useGlossary: use_glossary !== false,
      disabledTerms: disabled_terms || []
    });
    
    console.log('[Translate API] Success, keys:', Object.keys(results));
    res.json({ success: true, translations: results });
  } catch (err) {
    console.error('[Translate API] Error:', err.message, err.stack);
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/save-term - Save a term to glossary
router.post('/save-term', async (req, res) => {
  try {
    const { category_id, term_en, term_ar, term_es, notes } = req.body;
    
    if (!category_id) {
      return res.status(400).json({ success: false, error: 'Category is required.' });
    }
    
    const en = (term_en || '').trim();
    const ar = (term_ar || '').trim();
    const es = (term_es || '').trim();
    
    const filled = [en, ar, es].filter(Boolean).length;
    if (filled < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 language fields required.' });
    }
    
    const term = await GlossaryTerm.create({
      category: category_id,
      termEn: en,
      termAr: ar,
      termEs: es,
      notes: notes || ''
    });
    
    res.json({
      success: true,
      created: true,
      term: {
        id: term._id,
        term_en: term.termEn,
        term_ar: term.termAr,
        term_es: term.termEs
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/category-terms - Get all terms for a category
router.get('/category-terms', async (req, res) => {
  try {
    const { category_id } = req.query;
    
    if (!category_id) {
      return res.json({ success: true, terms: [] });
    }
    
    const terms = await GlossaryTerm.find({ category: category_id })
      .select('id termEn termAr termEs notes')
      .sort({ termEn: 1, termAr: 1 });
    
    res.json({
      success: true,
      terms: terms.map(t => ({
        id: t._id,
        term_en: t.termEn,
        term_ar: t.termAr,
        term_es: t.termEs,
        notes: t.notes
      }))
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/save-session - Save or update a translation session
router.post('/save-session', async (req, res) => {
  try {
    const { source_text, source_lang, translations, category_id, session_id, title } = req.body;
    
    if (!source_text || !source_text.trim()) {
      return res.status(400).json({ success: false, error: 'No text to save.' });
    }
    
    const srcLang = await Language.findOne({ code: source_lang || 'en' });
    if (!srcLang) {
      return res.status(400).json({ success: false, error: 'Invalid source language.' });
    }
    
    const sessionTitle = title || source_text.split('\n')[0].substring(0, 80);
    
    // Update existing session
    if (session_id) {
      const session = await TranslationSession.findById(session_id);
      if (session) {
        session.title = sessionTitle;
        session.sourceText = source_text;
        session.sourceLanguage = srcLang._id;
        session.translations = translations || {};
        session.category = category_id || null;
        await session.save();
        return res.json({ success: true, session_id: session._id, title: session.title });
      }
    }
    
    // Create new session
    const session = await TranslationSession.create({
      title: sessionTitle,
      sourceText: source_text,
      sourceLanguage: srcLang._id,
      translations: translations || {},
      category: category_id || null
    });
    
    // Enforce MAX_SESSIONS cap (100)
    const MAX_SESSIONS = 100;
    const allSessions = await TranslationSession.find().sort({ updatedAt: -1 });
    if (allSessions.length > MAX_SESSIONS) {
      const excessIds = allSessions.slice(MAX_SESSIONS).map(s => s._id);
      await TranslationSession.deleteMany({ _id: { $in: excessIds } });
    }
    
    res.json({ success: true, session_id: session._id, title: session.title });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Languages
router.get('/languages', async (req, res) => {
  try {
    const languages = await Language.find().sort('name');
    res.json(languages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('sourceLanguage targetLanguage')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('sourceLanguage targetLanguage');
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Documents
router.get('/documents/:projectId', async (req, res) => {
  try {
    const documents = await Document.find({ project: req.params.projectId })
      .sort({ createdAt: 1 });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Segments
router.get('/segments/:documentId', async (req, res) => {
  try {
    const segments = await Segment.find({ document: req.params.documentId })
      .sort({ index: 1 });
    res.json(segments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/segments/:id', async (req, res) => {
  try {
    const { targetText, status, locked } = req.body;
    
    const segment = await Segment.findById(req.params.id);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    if (targetText !== undefined) segment.targetText = targetText;
    if (status) segment.status = status;
    if (locked !== undefined) segment.locked = locked;
    
    await segment.save();
    res.json(segment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Glossary search
router.get('/glossary/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({ success: true, results: [] });
    }
    
    const terms = await GlossaryTerm.find({
      $or: [
        { termEn: new RegExp(q, 'i') },
        { termAr: new RegExp(q, 'i') },
        { termEs: new RegExp(q, 'i') },
        { notes: new RegExp(q, 'i') }
      ]
    }).populate('category').limit(30);
    
    const results = terms.map(t => ({
      id: t._id,
      term_en: t.termEn,
      term_ar: t.termAr,
      term_es: t.termEs,
      notes: t.notes,
      category_id: t.category?._id,
      category_name: t.category?.name || ''
    }));
    
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Translation Memory lookup
router.get('/tm/lookup', async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.query;
    
    const memories = await TranslationMemory.find({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      sourceText: { $regex: text, $options: 'i' }
    }).sort({ usageCount: -1, qualityScore: -1 }).limit(10);
    
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add to TM
router.post('/tm', async (req, res) => {
  try {
    const { sourceLanguage, targetLanguage, sourceText, targetText, domain, projectOrigin } = req.body;
    
    // Check if exists
    let tm = await TranslationMemory.findOne({
      sourceLanguage,
      targetLanguage,
      sourceText
    });
    
    if (tm) {
      tm.targetText = targetText;
      tm.usageCount += 1;
    } else {
      tm = new TranslationMemory({
        sourceLanguage,
        targetLanguage,
        sourceText,
        targetText,
        domain: domain || 'general',
        projectOrigin
      });
    }
    
    await tm.save();
    res.json(tm);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
