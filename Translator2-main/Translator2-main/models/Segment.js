const mongoose = require('mongoose');

const SegmentSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  sourceText: {
    type: String,
    required: true
  },
  targetText: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['untranslated', 'draft', 'translated', 'reviewed', 'approved'],
    default: 'untranslated'
  },
  locked: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: mongoose.Schema.Types.Mixed
  }],
  contextBefore: {
    type: String,
    default: ''
  },
  contextAfter: {
    type: String,
    default: ''
  },
  mtSuggestion: {
    type: String,
    default: ''
  },
  translatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique document+index
SegmentSchema.index({ document: 1, index: 1 }, { unique: true });

// Virtual for word count
SegmentSchema.virtual('wordCount').get(function() {
  return this.sourceText.split(/\s+/).length;
});

// Virtual for QA issues
SegmentSchema.virtual('qaIssues', {
  ref: 'QAIssue',
  localField: '_id',
  foreignField: 'segment'
});

// Virtual for notes
SegmentSchema.virtual('notes', {
  ref: 'SegmentNote',
  localField: '_id',
  foreignField: 'segment'
});

module.exports = mongoose.model('Segment', SegmentSchema);
