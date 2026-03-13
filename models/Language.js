const mongoose = require('mongoose');

const LanguageSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    maxlength: 5
  },
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  nativeName: {
    type: String,
    maxlength: 50
  },
  direction: {
    type: String,
    enum: ['ltr', 'rtl'],
    default: 'ltr'
  },
  segmentationRules: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Language', LanguageSchema);
