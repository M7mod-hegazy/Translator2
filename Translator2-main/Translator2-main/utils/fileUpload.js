const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Use memory storage for serverless (Vercel has read-only filesystem)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/pdf',
    'text/html',
    'application/xml',
    'text/plain'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const allowedExts = ['docx', 'xlsx', 'pptx', 'pdf', 'html', 'xml', 'txt'];
  
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Document parser (works with buffer from memory storage)
async function parseDocument(buffer, fileType) {
  const content = buffer.toString('utf8');
  
  switch (fileType) {
    case 'txt':
      return { text: content, segments: splitIntoSegments(content) };
    
    case 'html':
      // Simple HTML text extraction
      const text = content.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
      return { text, segments: splitIntoSegments(text) };
    
    case 'docx':
      // Use mammoth for docx
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, segments: splitIntoSegments(result.value) };
    
    default:
      return { text: content, segments: splitIntoSegments(content) };
  }
}

// Split text into segments (sentences/paragraphs)
function splitIntoSegments(text) {
  // Simple sentence splitting - can be enhanced with proper NLP
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter(s => s.trim().length > 0);
  
  return sentences.map((sentence, index) => ({
    index,
    sourceText: sentence.trim(),
    targetText: '',
    status: 'untranslated'
  }));
}

module.exports = {
  upload,
  parseDocument
};
