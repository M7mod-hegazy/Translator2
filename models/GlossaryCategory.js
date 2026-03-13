const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: ''
  },
  order: {
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

// Virtual for term count
CategorySchema.virtual('termCount', {
  ref: 'GlossaryTerm',
  localField: '_id',
  foreignField: 'category',
  count: true
});

module.exports = mongoose.model('GlossaryCategory', CategorySchema);
