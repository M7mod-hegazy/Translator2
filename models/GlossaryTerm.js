const mongoose = require('mongoose');

const GlossaryTermSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlossaryCategory',
    required: true
  },
  termEn: {
    type: String,
    maxlength: 500,
    default: ''
  },
  termAr: {
    type: String,
    maxlength: 500,
    default: ''
  },
  termEs: {
    type: String,
    maxlength: 500,
    default: ''
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Method to get term by language code
GlossaryTermSchema.methods.getTerm = function(langCode) {
  const mapping = { en: this.termEn, ar: this.termAr, es: this.termEs };
  return mapping[langCode] || '';
};

// Method to get translation between languages
GlossaryTermSchema.methods.getTranslation = function(fromLang, toLang) {
  const source = this.getTerm(fromLang);
  const target = this.getTerm(toLang);
  return (source && target) ? target : null;
};

module.exports = mongoose.model('GlossaryTerm', GlossaryTermSchema);
