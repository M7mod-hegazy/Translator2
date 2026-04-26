const express = require('express');
const router = express.Router();
const UserTranslationEdit = require('../models/UserTranslationEdit');
const { ensureAuth } = require('../middleware/auth');
const { toSyncPayload } = require('../utils/memoryDeletionSync');

// Memory management page
router.get('/', ensureAuth, async (req, res) => {
  try {
    res.render('translator/memory', {
      title: 'Translation Memory',
      activeTab: 'memory',
      user: req.user || null
    });
  } catch (err) {
    console.error('[Memory] Page error:', err);
    res.status(500).render('errors/500', { error: err });
  }
});

// API: List all memories with search, sort, filter
router.get('/api/list', ensureAuth, async (req, res) => {
  try {
    const { q, sort, lang, page } = req.query;
    const perPage = 20;
    const currentPage = parseInt(page) || 1;
    
    let filter = { user: req.user._id };
    
    // Search filter
    if (q && q.trim().length >= 1) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { sourceWord: regex },
        { editedTranslation: regex },
        { originalTranslation: regex }
      ];
    }
    
    // Language filter
    if (lang && lang !== 'all') {
      filter.$or = filter.$or || [];
      const langFilter = { $or: [{ sourceLanguage: lang }, { targetLanguage: lang }] };
      if (filter.$or.length) {
        filter = { $and: [filter, langFilter] };
      } else {
        delete filter.$or;
        filter.sourceLanguage = lang; // Simple case
        filter = { $or: [{ ...filter, sourceLanguage: lang }, { ...filter, targetLanguage: lang }] };
        filter = { user: req.user._id, $or: [{ sourceLanguage: lang }, { targetLanguage: lang }] };
        if (q && q.trim().length >= 1) {
          const regex = new RegExp(q.trim(), 'i');
          filter = {
            user: req.user._id,
            $and: [
              { $or: [{ sourceLanguage: lang }, { targetLanguage: lang }] },
              { $or: [{ sourceWord: regex }, { editedTranslation: regex }, { originalTranslation: regex }] }
            ]
          };
        }
      }
    }
    
    // Sort options
    let sortObj = { lastUsedAt: -1 };
    if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'most-used') sortObj = { usageCount: -1 };
    else if (sort === 'alpha') sortObj = { sourceWord: 1 };
    else if (sort === 'recent') sortObj = { lastUsedAt: -1 };
    
    const total = await UserTranslationEdit.countDocuments(filter);
    const totalPages = Math.ceil(total / perPage);
    
    const edits = await UserTranslationEdit.find(filter)
      .sort(sortObj)
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean();
    
    // Format for frontend
    const items = edits.map(e => ({
      id: e._id,
      sourceWord: e.sourceWord,
      editedTranslation: e.editedTranslation,
      originalTranslation: e.originalTranslation || '',
      sourceLanguage: e.sourceLanguage,
      targetLanguage: e.targetLanguage,
      usageCount: e.usageCount || 0,
      createdAt: e.createdAt,
      lastUsedAt: e.lastUsedAt
    }));
    
    res.json({
      success: true,
      items,
      total,
      totalPages,
      currentPage
    });
  } catch (err) {
    console.error('[Memory API] List error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Update a memory
router.put('/api/:id', ensureAuth, async (req, res) => {
  try {
    const { sourceWord, editedTranslation } = req.body;
    const edit = await UserTranslationEdit.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!edit) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }
    
    if (sourceWord) edit.sourceWord = sourceWord.trim();
    if (editedTranslation) edit.editedTranslation = editedTranslation.trim();
    
    await edit.save();
    res.json({ success: true, item: edit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Delete a memory
router.delete('/api/:id', ensureAuth, async (req, res) => {
  try {
    const deleted = await UserTranslationEdit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }
    res.json({ success: true, ...toSyncPayload([deleted]) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Bulk delete
router.post('/api/bulk-delete', ensureAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, error: 'No IDs provided' });
    }
    const matches = await UserTranslationEdit.find({ _id: { $in: ids }, user: req.user._id }).select('_id');
    if (!matches.length) {
      return res.status(404).json({ success: false, error: 'No matching memories found' });
    }
    const matchIds = matches.map(m => m._id);
    const result = await UserTranslationEdit.deleteMany({ _id: { $in: matchIds }, user: req.user._id });
    if (result.deletedCount !== matchIds.length) {
      return res.status(409).json({
        success: false,
        error: 'Deletion out of sync',
        deletedCount: result.deletedCount,
        expectedCount: matchIds.length
      });
    }
    res.json({ success: true, deletedCount: result.deletedCount, ...toSyncPayload(matches) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
