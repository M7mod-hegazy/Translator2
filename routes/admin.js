const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../middleware/auth');
const Category = require('../models/GlossaryCategory');
const GlossaryTerm = require('../models/GlossaryTerm');
const User = require('../models/User');

// Admin dashboard home
router.get('/', ensureAdmin, async (req, res) => {
  try {
    const [userCount, categoryCount, termCount] = await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      GlossaryTerm.countDocuments()
    ]);
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.user,
      stats: { userCount, categoryCount, termCount }
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('errors/500', { error: err });
  }
});

// Glossary management
router.get('/glossary', ensureAdmin, async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 }).lean();
    
    // Get term count for each category
    const termCounts = await GlossaryTerm.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    termCounts.forEach(tc => { countMap[tc._id.toString()] = tc.count; });
    
    // Add termCount to each category
    categories.forEach(cat => {
      cat.termCount = countMap[cat._id.toString()] || 0;
    });
    
    res.render('admin/glossary', {
      title: 'Manage Glossary',
      user: req.user,
      categories
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('errors/500', { error: err });
  }
});

// Add category
router.post('/categories', ensureAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const category = new Category({ name });
    await category.save();
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update category
router.put('/categories/:id', ensureAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete category
router.delete('/categories/:id', ensureAdmin, async (req, res) => {
  try {
    await GlossaryTerm.deleteMany({ category: req.params.id });
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add term
router.post('/terms', ensureAdmin, async (req, res) => {
  try {
    const { category, term_en, term_ar, term_es } = req.body;
    const newTerm = new GlossaryTerm({ 
      category, 
      termEn: term_en, 
      termAr: term_ar, 
      termEs: term_es 
    });
    await newTerm.save();
    res.json({ success: true, term: newTerm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update term
router.put('/terms/:id', ensureAdmin, async (req, res) => {
  try {
    const { category, term_en, term_ar, term_es } = req.body;
    console.log('[Admin] Updating term:', req.params.id, 'with data:', { category, term_en, term_ar, term_es });
    
    const updated = await GlossaryTerm.findByIdAndUpdate(
      req.params.id,
      { 
        category, 
        termEn: term_en, 
        termAr: term_ar, 
        termEs: term_es 
      },
      { new: true }
    );
    console.log('[Admin] Updated term:', updated);
    res.json({ success: true, term: updated });
  } catch (err) {
    console.error('[Admin] Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete term
router.delete('/terms/:id', ensureAdmin, async (req, res) => {
  try {
    await GlossaryTerm.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users list
router.get('/users', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin/users', {
      title: 'Manage Users',
      user: req.user,
      users
    });
  } catch (err) {
    res.status(500).render('errors/500', { error: err });
  }
});

// Update user role
router.put('/users/:id/role', ensureAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
