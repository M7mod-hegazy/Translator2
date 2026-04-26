const mongoose = require('mongoose');

const QAIssueSchema = new mongoose.Schema({
  segment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Segment',
    required: true
  },
  issueType: {
    type: String,
    enum: ['missing_number', 'untranslated', 'term_mismatch', 'punctuation', 
           'tag_error', 'empty_target', 'length_ratio', 'double_space', 'custom'],
    required: true
  },
  severity: {
    type: String,
    enum: ['warning', 'error', 'critical'],
    default: 'warning'
  },
  message: {
    type: String,
    required: true
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('QAIssue', QAIssueSchema);
