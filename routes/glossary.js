const express = require('express');
const router = express.Router();
const Category = require('../models/GlossaryCategory');
const GlossaryTerm = require('../models/GlossaryTerm');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// ── Glossary Index ──
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ order: 1, name: 1 });
    
    // Get term count for each category
    const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
      const count = await GlossaryTerm.countDocuments({ category: cat._id });
      return { ...cat.toObject(), termCount: count };
    }));
    
    res.render('glossary/glossary', {
      categories: categoriesWithCount,
      title: 'Glossary'
    });
  } catch (err) {
    console.error(err);
    res.render('glossary/glossary', {
      categories: [],
      title: 'Glossary'
    });
  }
});

// ── Global Search ──
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    
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
    })
      .populate('category')
      .limit(30);
    
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Category API ──

// List categories
router.get('/category', async (req, res) => {
  try {
    const cats = await Category.find()
      .sort({ order: 1, name: 1 })
      .select('id name description order');
    
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create category
router.post('/category', async (req, res) => {
  try {
    const { name, description, order } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required.' });
    }
    
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Category already exists.' });
    }
    
    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      order: order || 0
    });
    
    res.json({ success: true, category: { id: category._id, name: category.name } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update category
router.put('/category/:id', async (req, res) => {
  try {
    const { name, description, order } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (order !== undefined) category.order = order;
    
    await category.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete category
router.delete('/category/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    await GlossaryTerm.deleteMany({ category: category._id });
    await category.deleteOne();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Term API ──

// List terms
router.get('/term', async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let query = {};
    if (category_id) query.category = category_id;
    
    const terms = await GlossaryTerm.find(query)
      .select('id termEn termAr termEs notes category')
      .sort({ termEn: 1, termAr: 1 });
    
    res.json({
      success: true,
      terms: terms.map(t => ({
        id: t._id,
        term_en: t.termEn,
        term_ar: t.termAr,
        term_es: t.termEs,
        notes: t.notes,
        category_id: t.category
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create term
router.post('/term', async (req, res) => {
  try {
    const { category_id, term_en, term_ar, term_es, notes } = req.body;
    
    const en = (term_en || '').trim();
    const ar = (term_ar || '').trim();
    const es = (term_es || '').trim();
    
    const filled = [en, ar, es].filter(Boolean).length;
    if (filled < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 language fields are required.' });
    }
    
    if (!category_id) {
      return res.status(400).json({ success: false, error: 'Category is required.' });
    }
    
    const category = await Category.findById(category_id);
    if (!category) {
      return res.status(400).json({ success: false, error: 'Category not found.' });
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

// Update term
router.put('/term/:id', async (req, res) => {
  try {
    const { term_en, term_ar, term_es, notes } = req.body;
    
    const term = await GlossaryTerm.findById(req.params.id);
    if (!term) {
      return res.status(404).json({ success: false, error: 'Term not found' });
    }
    
    if (term_en !== undefined) term.termEn = term_en.trim();
    if (term_ar !== undefined) term.termAr = term_ar.trim();
    if (term_es !== undefined) term.termEs = term_es.trim();
    if (notes !== undefined) term.notes = notes;
    
    await term.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete term
router.delete('/term/:id', async (req, res) => {
  try {
    const term = await GlossaryTerm.findById(req.params.id);
    if (!term) {
      return res.status(404).json({ success: false, error: 'Term not found' });
    }
    
    await term.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Import/Export ──

// Import CSV
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const category_id = req.body.category_id;
    
    if (!file || !category_id) {
      return res.status(400).json({ success: false, error: 'File and category are required.' });
    }
    
    const fs = require('fs');
    const content = fs.readFileSync(file.path, 'utf-8');
    fs.unlinkSync(file.path); // cleanup
    
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV file is empty or has no header.' });
    }
    
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const enIdx = header.findIndex(h => h === 'english' || h === 'en' || h === 'term_en');
    const arIdx = header.findIndex(h => h === 'arabic' || h === 'ar' || h === 'term_ar');
    const esIdx = header.findIndex(h => h === 'spanish' || h === 'es' || h === 'term_es');
    const notesIdx = header.findIndex(h => h === 'notes');
    
    let created = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const en = (cols[enIdx] || '').trim();
      const ar = (cols[arIdx] || '').trim();
      const es = (cols[esIdx] || '').trim();
      const notes = (cols[notesIdx] || '').trim();
      
      const filled = [en, ar, es].filter(Boolean).length;
      if (filled < 2) continue;
      
      await GlossaryTerm.create({
        category: category_id,
        termEn: en,
        termAr: ar,
        termEs: es,
        notes
      });
      created++;
    }
    
    res.json({ success: true, imported: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Export CSV
router.get('/export', async (req, res) => {
  try {
    const terms = await GlossaryTerm.find()
      .populate('category')
      .sort({ termEn: 1 });
    
    const header = 'Category,English,Arabic,Spanish,Notes\n';
    const rows = terms.map(t => 
      `"${t.category?.name || ''}","${t.termEn || ''}","${t.termAr || ''}","${t.termEs || ''}","${t.notes || ''}"`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="glossary_export.csv"');
    res.send(header + rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
