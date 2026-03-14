const mongoose = require('mongoose');

const TranslationSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    maxlength: 255,
    default: ''
  },
  sourceText: {
    type: String,
    required: true
  },
  sourceLanguage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: true
  },
  translations: {
    type: Map,
    of: String,
    default: {}
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  glossaryWords: [{
    term_id: String,
    source: String,
    term_en: String,
    term_ar: String,
    term_es: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for preview
TranslationSessionSchema.virtual('preview').get(function() {
  const text = this.sourceText;
  return text.length > 120 ? text.substring(0, 120) + '...' : text;
});

// Virtual for word count
TranslationSessionSchema.virtual('wordCount').get(function() {
  return this.sourceText.split(/\s+/).length;
});

module.exports = mongoose.model('TranslationSession', TranslationSessionSchema);
