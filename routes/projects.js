const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Document = require('../models/Document');
const Segment = require('../models/Segment');
const Language = require('../models/Language');
const TranslationSession = require('../models/TranslationSession');

const MAX_SESSIONS = 100;
const SESSIONS_PER_PAGE = 15;

// ── History (Translation Sessions) ──

// Project list (History page with pagination)
router.get('/', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const page = parseInt(req.query.page) || 1;
    
    let filter = {};
    if (query) {
      const regex = new RegExp(query, 'i');
      filter = { $or: [{ sourceText: regex }, { title: regex }] };
    }
    
    const total = await TranslationSession.countDocuments(filter);
    const totalPages = Math.ceil(total / SESSIONS_PER_PAGE);
    
    const sessions = await TranslationSession.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * SESSIONS_PER_PAGE)
      .limit(SESSIONS_PER_PAGE)
      .populate('sourceLanguage');
    
    // Add computed fields for display
    const sessionsWithMeta = sessions.map(s => {
      const obj = s.toObject ? s.toObject() : s;
      obj.wordCount = obj.sourceText ? obj.sourceText.split(/\s+/).length : 0;
      const diff = Date.now() - new Date(obj.updatedAt).getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (mins < 1) obj.timeAgo = 'just now';
      else if (mins < 60) obj.timeAgo = mins + 'm ago';
      else if (hours < 24) obj.timeAgo = hours + 'h ago';
      else if (days < 7) obj.timeAgo = days + 'd ago';
      else obj.timeAgo = new Date(obj.updatedAt).toLocaleDateString();
      return obj;
    });
    
    const languages = await Language.find().sort('name');
    
    res.render('projects/project_list', {
      sessions: sessionsWithMeta,
      languages,
      query,
      currentPage: page,
      totalPages,
      title: 'History'
    });
  } catch (err) {
    console.error(err);
    res.render('projects/project_list', {
      sessions: [],
      languages: [],
      query: '',
      currentPage: 1,
      totalPages: 1,
      title: 'History'
    });
  }
});

// Search sessions (AJAX)
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    
    if (!query || query.length < 2) {
      return res.json({ success: true, results: [] });
    }
    
    const regex = new RegExp(query, 'i');
    const sessions = await TranslationSession.find({
      $or: [
        { sourceText: regex },
        { title: regex }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('sourceLanguage');
    
    const results = sessions.map(s => {
      let transPreview = '';
      if (s.translations) {
        for (const [code, text] of Object.entries(s.translations)) {
          if (text) {
            transPreview = text.substring(0, 100);
            break;
          }
        }
      }
      
      return {
        id: s._id,
        title: s.title || '',
        preview: s.sourceText ? s.sourceText.substring(0, 100) : '',
        trans_preview: transPreview,
        source_lang: s.sourceLanguage?.name || '',
        word_count: s.wordCount || 0,
        lang_codes: s.translations ? Object.keys(s.translations) : []
      };
    });
    
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete session
router.post('/session/:id/delete', async (req, res) => {
  try {
    const session = await TranslationSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    await session.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get session detail (for loading into translator)
router.get('/session/:id', async (req, res) => {
  try {
    const session = await TranslationSession.findById(req.params.id)
      .populate('sourceLanguage');
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    res.json({
      success: true,
      session: {
        id: session._id,
        title: session.title,
        source_text: session.sourceText,
        source_lang: session.sourceLanguage?.code || 'en',
        translations: session.translations || {},
        category_id: session.category
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Legacy Project Routes ──

// Create project page
router.get('/new', async (req, res) => {
  try {
    const languages = await Language.find().sort('name');
    res.render('projects/project_form', {
      languages,
      project: null,
      title: 'New Project'
    });
  } catch (err) {
    res.redirect('/projects');
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { name, description, sourceLanguage, targetLanguage, domain, pricePerWord } = req.body;
    
    if (sourceLanguage === targetLanguage) {
      return res.status(400).json({ success: false, error: 'Source and target languages must differ.' });
    }
    
    const project = new Project({
      name,
      description,
      sourceLanguage,
      targetLanguage,
      domain: domain || 'general',
      pricePerWord: pricePerWord || 0
    });
    
    await project.save();
    res.json({ success: true, project: { id: project._id, name: project.name } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Project detail
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('sourceLanguage targetLanguage');
    
    if (!project) {
      return res.status(404).render('errors/404');
    }
    
    const documents = await Document.find({ project: project._id })
      .sort({ createdAt: 1 });
    
    res.render('projects/project_detail', {
      project,
      documents,
      title: project.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('errors/500', { error: err });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { name, description, status, domain, pricePerWord } = req.body;
    
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (domain) project.domain = domain;
    if (pricePerWord !== undefined) project.pricePerWord = pricePerWord;
    
    await project.save();
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    // Delete associated documents and segments
    const documents = await Document.find({ project: project._id });
    for (const doc of documents) {
      await Segment.deleteMany({ document: doc._id });
      await doc.deleteOne();
    }
    
    await project.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Document routes
router.get('/:projectId/document/:docId', async (req, res) => {
  try {
    const document = await Document.findById(req.params.docId)
      .populate('project');
    
    if (!document) {
      return res.status(404).render('errors/404');
    }
    
    const segments = await Segment.find({ document: document._id })
      .sort({ index: 1 });
    
    res.render('translator/editor', {
      document,
      segments,
      project: document.project,
      title: document.filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('errors/500', { error: err });
  }
});

// Update segment
router.put('/segment/:segmentId', async (req, res) => {
  try {
    const { targetText, status, locked } = req.body;
    
    const segment = await Segment.findById(req.params.segmentId)
      .populate('document');
    
    if (!segment) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }
    
    if (targetText !== undefined) segment.targetText = targetText;
    if (status) segment.status = status;
    if (locked !== undefined) segment.locked = locked;
    
    await segment.save();
    res.json({ success: true, segment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
