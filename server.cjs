const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { FilmScriptAnalyzer } = require('./lib/pdfscript.cjs');

const app = express();
const port = process.env.PORT || 3002;

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp to avoid filename conflicts
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000', 
      'http://localhost:3001', 
      'http://localhost:80',
      'http://localhost',
      'http://localhost:8080', 
      'http://localhost:8081', 
      'http://localhost:8082',
    'https://think-ai-rosy.vercel.app/',
    'https://think-ai-rosy.vercel.app'
    ];

// More permissive CORS for deployment troubleshooting
app.use(cors({
  origin: function (origin, callback) {
    console.log(`🌐 CORS check - Origin: ${origin}, Allowed: ${allowedOrigins.join(', ')}`);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS: Origin allowed');
      callback(null, true);
    } else {
      console.log('❌ CORS: Origin not allowed');
      // For deployment troubleshooting, allow all origins temporarily
      if (process.env.NODE_ENV === 'production') {
        console.log('⚠️ CORS: Allowing all origins in production for troubleshooting');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'User-Agent'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    server: 'Think.AI CJS API Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Think.AI CJS API Server',
    version: '1.0.0',
    description: 'Standalone CJS API server for PDF script analysis',
    endpoints: {
      health: 'GET /health',
      analyze: 'POST /api/analyze-pdf',
      info: 'GET /api/info'
    },
    maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
    supportedFormats: ['PDF']
  });
});

// Main PDF analysis endpoint
app.post('/api/analyze-pdf', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No PDF file uploaded. Please upload a valid PDF file.',
        code: 'NO_FILE'
      });
    }

    const pdfPath = req.file.path;
    const originalFilename = req.file.originalname;
    const projectId = req.body.projectId || 'unknown';
    const scriptName = originalFilename?.replace(/\.pdf$/i, '') || 'unknown_script';

    console.log(`📄 Processing PDF analysis:`);
    console.log(`   Original: ${originalFilename}`);
    console.log(`   Script: ${scriptName}`);
    console.log(`   Project: ${projectId}`);
    console.log(`   Size: ${(req.file.size / 1024).toFixed(2)} KB`);
    console.log(`   Path: ${pdfPath}`);

    // Initialize analyzer and run analysis
    const analyzer = new FilmScriptAnalyzer(pdfPath, scriptName);
    const analysisResult = await analyzer.runCompleteAnalysis();

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Clean up uploaded file
    try {
      fs.unlinkSync(pdfPath);
      console.log(`🗑️ Cleaned up temporary file: ${pdfPath}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to cleanup file: ${cleanupError.message}`);
    }

    // Add metadata to response
    const response = {
      success: true,
      data: {
        ...analysisResult,
        metadata: {
          processingTimeMs: processingTime,
          processingTimestamp: new Date().toISOString(),
          originalFilename,
          scriptName,
          projectId,
          fileSize: req.file.size,
          server: 'cjs-api'
        }
      },
      processing: {
        timeMs: processingTime,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ Analysis completed successfully:`);
    console.log(`   Scenes: ${analysisResult.totalScenes}`);
    console.log(`   Characters: ${analysisResult.totalCharacters}`);
    console.log(`   Dialogues: ${analysisResult.totalDialogues}`);
    console.log(`   Processing time: ${processingTime}ms`);

    res.json(response);

  } catch (error) {
    // Calculate processing time even for errors
    const processingTime = Date.now() - startTime;
    
    console.error('❌ PDF Analysis failed:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup file after error: ${cleanupError.message}`);
      }
    }

    // Return structured error response
    res.status(500).json({ 
      success: false, 
      error: error.message || 'PDF analysis failed',
      code: error.code || 'ANALYSIS_ERROR',
      processing: {
        timeMs: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Maximum size is 10MB.',
      code: 'FILE_TOO_LARGE'
    });
  }
  
  if (error.message === 'Only PDF files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only PDF files are accepted.',
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation. Origin not allowed.',
      code: 'CORS_ERROR'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    availableEndpoints: {
      health: 'GET /health',
      analyze: 'POST /api/analyze-pdf',
      info: 'GET /api/info'
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Think.AI CJS API Server running on port ${port}`);
  console.log(`📄 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${port}/health`);
  console.log(`📊 API info: http://localhost:${port}/api/info`);
  console.log(`📁 PDF Analysis: POST http://localhost:${port}/api/analyze-pdf`);
  console.log(`📂 Upload directory: ${uploadsDir}`);
  console.log(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
  console.log('✅ Server ready to accept connections');
});

module.exports = app;
