const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '/');
    const dest = path.join(uploadDir, yearMonth);
    
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

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

// Document parser
async function parseDocument(filePath, fileType) {
  const content = fs.readFileSync(filePath, 'utf8');
  
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
      const result = await mammoth.extractRawText({ path: filePath });
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
  parseDocument,
  uploadDir
};
