const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  originalFile: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['docx', 'xlsx', 'pptx', 'pdf', 'html', 'xml', 'txt'],
    required: true
  },
  filename: {
    type: String,
    required: true,
    maxlength: 255
  },
  status: {
    type: String,
    enum: ['uploaded', 'segmented', 'in_progress', 'translated', 'reviewed'],
    default: 'uploaded'
  },
  wordCount: {
    type: Number,
    default: 0
  },
  formattingMap: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Virtual for segments
DocumentSchema.virtual('segments', {
  ref: 'Segment',
  localField: '_id',
  foreignField: 'document'
});

// Method to update word count
DocumentSchema.methods.updateWordCount = async function() {
  const Segment = require('./Segment');
  const segments = await Segment.find({ document: this._id });
  const count = segments.reduce((sum, seg) => sum + seg.sourceText.split(/\s+/).length, 0);
  this.wordCount = count;
  await this.save();
  return count;
};

module.exports = mongoose.model('Document', DocumentSchema);
