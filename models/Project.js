const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String,
    default: ''
  },
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
  domain: {
    type: String,
    enum: ['general', 'legal', 'medical', 'technical', 'political', 'literary', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'review', 'completed'],
    default: 'draft'
  },
  pricePerWord: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for total words
ProjectSchema.virtual('totalWords', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'project',
  options: { sum: true }
});

// Virtual for documents
ProjectSchema.virtual('documents', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'project'
});

// Method to calculate progress
ProjectSchema.methods.getProgress = async function() {
  const Document = require('./Document');
  const Segment = require('./Segment');
  
  const documents = await Document.find({ project: this._id });
  const docIds = documents.map(d => d._id);
  
  const total = await Segment.countDocuments({ document: { $in: docIds } });
  if (total === 0) return 0;
  
  const translated = await Segment.countDocuments({
    document: { $in: docIds },
    status: { $in: ['translated', 'reviewed', 'approved'] }
  });
  
  return Math.round((translated / total) * 100);
};

module.exports = mongoose.model('Project', ProjectSchema);
