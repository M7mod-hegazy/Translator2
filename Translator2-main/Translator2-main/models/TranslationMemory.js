const mongoose = require('mongoose');

const TranslationMemorySchema = new mongoose.Schema({
  sourceLanguage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: true
  },
  targetLanguage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: true
  },
  sourceText: {
    type: String,
    required: true
  },
  targetText: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    default: 'general'
  },
  usageCount: {
    type: Number,
    default: 1
  },
  qualityScore: {
    type: Number,
    default: 0.5
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  projectOrigin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }
}, {
  timestamps: true
});

// Indexes for faster lookups
TranslationMemorySchema.index({ sourceLanguage: 1, targetLanguage: 1 });
TranslationMemorySchema.index({ domain: 1 });

module.exports = mongoose.model('TranslationMemory', TranslationMemorySchema);
