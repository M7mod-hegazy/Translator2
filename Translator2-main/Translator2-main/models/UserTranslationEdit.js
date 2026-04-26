const mongoose = require('mongoose');

const UserTranslationEditSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sourceWord: {
    type: String,
    required: true,
    trim: true
  },
  sourceLanguage: {
    type: String,
    required: true
  },
  originalTranslation: {
    type: String,
    default: ''
  },
  editedTranslation: {
    type: String,
    required: true,
    trim: true
  },
  targetLanguage: {
    type: String,
    required: true
  },
  usageCount: {
    type: Number,
    default: 1
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Unique compound: one edit per word per direction per user
UserTranslationEditSchema.index(
  { user: 1, sourceWord: 1, sourceLanguage: 1, targetLanguage: 1 },
  { unique: true }
);

// Fast lookup during translation
UserTranslationEditSchema.index({ user: 1, sourceLanguage: 1, targetLanguage: 1 });

module.exports = mongoose.model('UserTranslationEdit', UserTranslationEditSchema);
