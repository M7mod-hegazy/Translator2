const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Document = require('../models/Document');
const Segment = require('../models/Segment');
const GlossaryTerm = require('../models/GlossaryTerm');
const GlossaryCategory = require('../models/GlossaryCategory');
const TranslationMemory = require('../models/TranslationMemory');
const TranslationSession = require('../models/TranslationSession');
const UserTranslationEdit = require('../models/UserTranslationEdit');
const Language = require('../models/Language');
const { translateMultiTarget, translateDirect, mtWord } = require('../utils/translateEngine');
const { ensureAuth } = require('../middleware/auth');

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
    
    console.log('[Translate API] ──── NEW REQUEST ────');
    console.log('[Translate API] Text:', JSON.stringify(text?.substring(0, 80)));
    console.log('[Translate API] Source:', source_lang, '→ Targets:', target_langs);
    console.log('[Translate API] Category:', category_id, 'Glossary:', use_glossary);
    console.log('[Translate API] Auth:', req.isAuthenticated ? req.isAuthenticated() : false, 'User:', req.user?._id);
    
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
    
    // Look up user's saved edits if authenticated
    let userEdits = [];
    if (req.isAuthenticated && req.isAuthenticated()) {
      try {
        console.log('[Translate API] Looking up user edits for user:', req.user._id);
        const savedEdits = await UserTranslationEdit.find({
          user: req.user._id,
          sourceLanguage: source_lang || 'en',
          targetLanguage: { $in: target_langs }
        }).sort({ usageCount: -1, lastUsedAt: -1 });
        
        console.log('[Translate API] Found', savedEdits.length, 'saved edits in DB');
        savedEdits.forEach(e => console.log('[Translate API]   DB Edit:', e.sourceWord, '→', e.editedTranslation, '(original:', e.originalTranslation, ') lang:', e.targetLanguage));
        
        if (savedEdits.length) {
          const textLower = text.toLowerCase();
          for (const edit of savedEdits) {
            const srcLower = edit.sourceWord.toLowerCase();
            const found = textLower.includes(srcLower);
            console.log('[Translate API]   Checking if source text contains "' + edit.sourceWord + '":', found);
            if (found) {
              // Get what Google currently translates this word to
              let googleWord = edit.originalTranslation || '';
              if (!googleWord) {
                try {
                  googleWord = await mtWord(edit.sourceWord, edit.sourceLanguage, edit.targetLanguage);
                  console.log('[Translate API]   MT lookup for "' + edit.sourceWord + '" →', googleWord);
                } catch (e) { googleWord = ''; }
              }
              userEdits.push({
                editId: edit._id,
                sourceWord: edit.sourceWord,
                targetLanguage: edit.targetLanguage,
                googleTranslation: googleWord,
                userTranslation: edit.editedTranslation,
                usageCount: edit.usageCount
              });
            }
          }
        }
      } catch (e) {
        console.error('[Translate API] User edit lookup error:', e.message, e.stack);
      }
    } else {
      console.log('[Translate API] User NOT authenticated — skipping edit lookup');
    }
    
    console.log('[Translate API] ──── RESPONSE ────');
    console.log('[Translate API] Translation keys:', Object.keys(results));
    console.log('[Translate API] UserEdits returned:', userEdits.length);
    userEdits.forEach(e => console.log('[Translate API]   Return Edit:', e.sourceWord, '→', e.userTranslation, '(google:', e.googleTranslation, ')'));
    
    res.json({ success: true, translations: results, userEdits });
  } catch (err) {
    console.error('[Translate API] FATAL Error:', err.message, err.stack);
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
    console.log('[save-session] ──── SAVE REQUEST ────');
    console.log('[save-session] Auth:', req.isAuthenticated ? req.isAuthenticated() : false);
    console.log('[save-session] User:', req.user?._id, req.user?.email);
    
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log('[save-session] ✗ NOT AUTHENTICATED — returning 401');
      return res.status(401).json({ success: false, requireLogin: true, error: 'Login required to save history and track edits.' });
    }

    const { source_text, source_lang, translations, category_id, session_id, title } = req.body;
    
    console.log('[save-session] Payload:', {
      source_text: source_text?.substring(0, 50),
      source_lang,
      translations: translations ? Object.keys(translations) : 'none',
      category_id,
      session_id: session_id || 'NEW',
      title: title || 'auto'
    });
    
    if (!source_text || !source_text.trim()) {
      console.log('[save-session] ✗ No source text');
      return res.status(400).json({ success: false, error: 'No text to save.' });
    }
    
    const srcLang = await Language.findOne({ code: source_lang || 'en' });
    if (!srcLang) {
      console.log('[save-session] ✗ Language not found for code:', source_lang);
      return res.status(400).json({ success: false, error: 'Invalid source language.' });
    }
    console.log('[save-session] Source language resolved:', srcLang.code, srcLang._id);
    
    const sessionTitle = title || source_text.split('\n')[0].substring(0, 80);
    
    // Build translations Map from the provided object
    const translationsMap = new Map();
    if (translations && typeof translations === 'object') {
      for (const [langCode, text] of Object.entries(translations)) {
        if (text) translationsMap.set(langCode, text);
      }
    }
    console.log('[save-session] Translations map entries:', [...translationsMap.keys()]);
    
    // Update existing session
    if (session_id) {
      console.log('[save-session] Trying to update existing session:', session_id);
      const session = await TranslationSession.findOne({ _id: session_id, createdBy: req.user._id });
      if (session) {
        session.title = sessionTitle;
        session.sourceText = source_text;
        session.sourceLanguage = srcLang._id;
        session.translations = translationsMap;
        session.category = category_id || null;
        await session.save();
        console.log('[save-session] ✓ Updated existing session:', session._id);
        return res.json({ success: true, session_id: session._id, title: session.title });
      } else {
        console.log('[save-session] Session not found or not owned, will create new');
      }
    }
    
    // Create new session
    console.log('[save-session] Creating new session...');
    const session = await TranslationSession.create({
      title: sessionTitle,
      sourceText: source_text,
      sourceLanguage: srcLang._id,
      translations: translationsMap,
      category: category_id || null,
      createdBy: req.user._id
    });
    console.log('[save-session] ✓ Created session:', session._id, 'title:', session.title);
    
    // Enforce MAX_SESSIONS cap (100) per user
    const MAX_SESSIONS = 100;
    const allSessions = await TranslationSession.find({ createdBy: req.user._id }).sort({ updatedAt: -1 });
    console.log('[save-session] Total sessions for user:', allSessions.length);
    if (allSessions.length > MAX_SESSIONS) {
      const excessIds = allSessions.slice(MAX_SESSIONS).map(s => s._id);
      await TranslationSession.deleteMany({ _id: { $in: excessIds } });
      console.log('[save-session] Pruned', excessIds.length, 'old sessions');
    }
    
    res.json({ success: true, session_id: session._id, title: session.title });
  } catch (err) {
    console.error('[save-session] ✗ ERROR:', err.message, err.stack);
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

// ── User Translation Edits (Per-User Memory) ──

// POST /api/user-edit — Save or update a user's word edit
router.post('/user-edit', ensureAuth, async (req, res) => {
  try {
    const { source_word, source_lang, target_lang, original_translation, edited_translation } = req.body;
    
    console.log('[user-edit] ──── SAVE EDIT ────');
    console.log('[user-edit] User:', req.user._id);
    console.log('[user-edit] source_word:', JSON.stringify(source_word));
    console.log('[user-edit] source_lang:', source_lang, '→ target_lang:', target_lang);
    console.log('[user-edit] original_translation:', JSON.stringify(original_translation));
    console.log('[user-edit] edited_translation:', JSON.stringify(edited_translation));
    
    if (!source_word || !edited_translation || !source_lang || !target_lang) {
      console.log('[user-edit] ✗ Missing fields:', { source_word: !!source_word, edited_translation: !!edited_translation, source_lang: !!source_lang, target_lang: !!target_lang });
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    
    const filter = {
      user: req.user._id,
      sourceWord: source_word.trim(),
      sourceLanguage: source_lang,
      targetLanguage: target_lang
    };
    console.log('[user-edit] Filter:', JSON.stringify(filter));
    
    const existing = await UserTranslationEdit.findOne(filter);
    console.log('[user-edit] Existing record:', existing ? existing._id : 'NONE');
    
    if (existing) {
      existing.originalTranslation = original_translation || existing.originalTranslation;
      existing.editedTranslation = edited_translation.trim();
      existing.usageCount += 1;
      existing.lastUsedAt = new Date();
      await existing.save();
      console.log('[user-edit] ✓ Updated existing:', existing._id, 'usageCount:', existing.usageCount);
      return res.json({ success: true, edit: existing, updated: true });
    }
    
    const edit = await UserTranslationEdit.create({
      user: req.user._id,
      sourceWord: source_word.trim(),
      sourceLanguage: source_lang,
      originalTranslation: (original_translation || '').trim(),
      editedTranslation: edited_translation.trim(),
      targetLanguage: target_lang,
      lastUsedAt: new Date()
    });
    
    console.log('[user-edit] ✓ Created new:', edit._id);
    res.json({ success: true, edit, created: true });
  } catch (err) {
    console.error('[user-edit] ✗ ERROR:', err.message, err.stack);
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/user-edits/match — Find saved edits that match source text
router.get('/user-edits/match', ensureAuth, async (req, res) => {
  try {
    const { text, source_lang, target_lang } = req.query;
    
    if (!text || !source_lang || !target_lang) {
      return res.json({ success: true, edits: [] });
    }
    
    const savedEdits = await UserTranslationEdit.find({
      user: req.user._id,
      sourceLanguage: source_lang,
      targetLanguage: target_lang
    }).sort({ usageCount: -1, lastUsedAt: -1 });
    
    const textLower = text.toLowerCase();
    const matches = [];
    
    for (const edit of savedEdits) {
      if (textLower.includes(edit.sourceWord.toLowerCase())) {
        matches.push({
          editId: edit._id,
          sourceWord: edit.sourceWord,
          originalTranslation: edit.originalTranslation,
          editedTranslation: edit.editedTranslation,
          usageCount: edit.usageCount
        });
      }
    }
    
    res.json({ success: true, edits: matches });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/user-edits — List all of user's saved edits (paginated)
router.get('/user-edits', ensureAuth, async (req, res) => {
  try {
    const { source_lang, target_lang, page = 1, limit = 50 } = req.query;
    
    const filter = { user: req.user._id };
    if (source_lang) filter.sourceLanguage = source_lang;
    if (target_lang) filter.targetLanguage = target_lang;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const edits = await UserTranslationEdit.find(filter)
      .sort({ lastUsedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await UserTranslationEdit.countDocuments(filter);
    
    res.json({ success: true, edits, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/user-edit/:id — Delete a saved edit
router.delete('/user-edit/:id', ensureAuth, async (req, res) => {
  try {
    const edit = await UserTranslationEdit.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!edit) {
      return res.status(404).json({ success: false, error: 'Edit not found.' });
    }
    
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
