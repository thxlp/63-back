const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// CORS Configuration - รองรับ credentials และ headers ที่จำเป็น
app.use(cors({
  origin: true, // อนุญาตทุก origin (หรือระบุ origin ที่เฉพาะเจาะจง)
  credentials: true, // รองรับ cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// เพิ่มขนาด limit สำหรับ request entity (50MB)
// ใช้ express.json() เฉพาะกับ content-type ที่เป็น JSON เท่านั้น (ไม่รวม multipart/form-data)
app.use(express.json({ 
  type: ['application/json', 'text/json'],
  limit: '50mb' 
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import routes
try {
  console.log('Loading routes...');
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const dataRoutes = require('./routes/data');
  const openfoodfactsRoutes = require('./routes/openfoodfacts');
  const barcodeRoutes = require('./routes/barcode');
  console.log('✅ All routes loaded successfully');

  // API Routes (ต้องอยู่ก่อน static files)
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/data', dataRoutes);
  app.use('/api/openfoodfacts', openfoodfactsRoutes);
  app.use('/api/barcode', barcodeRoutes);
  console.log('✅ All routes mounted successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    port: PORT,
    services: {
      auth: '/api/auth',
      users: '/api/users',
      data: '/api/data',
      openfoodfacts: '/api/openfoodfacts',
      barcode: '/api/barcode'
    }
  });
});

// Serve static files from public directory (ต้องอยู่หลัง API routes)
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  // จัดการ multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      error: 'ไฟล์มีขนาดใหญ่เกินไป',
      details: 'ขนาดไฟล์สูงสุดที่อนุญาต: 50MB'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ 
      error: 'อัปโหลดไฟล์ไม่ถูกต้อง',
      details: 'กรุณาตรวจสอบชื่อ field ที่ใช้ในการอัปโหลด'
    });
  }
  
  // จัดการ multer file filter errors
  if (err.message?.includes('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น')) {
    return res.status(400).json({ 
      error: 'รูปแบบไฟล์ไม่ถูกต้อง',
      details: err.message
    });
  }
  
  // จัดการ request entity too large
  if (err.type === 'entity.too.large' || err.message?.includes('entity too large')) {
    return res.status(413).json({ 
      error: 'ไฟล์มีขนาดใหญ่เกินไป',
      details: 'ขนาดไฟล์สูงสุดที่อนุญาต: 50MB'
    });
  }
  
  // จัดการ multer errors อื่นๆ
  if (err.name === 'MulterError') {
    return res.status(400).json({ 
      error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      details: err.message
    });
  }
  
  res.status(500).json({ 
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.path,
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/signup',
      'GET /api/auth/signup?user_id=...',
      'GET /api/auth/check-table (ตรวจสอบ bmi_records table)',
      'POST /api/auth/signin',
      'POST /api/auth/signout',
      'GET /api/auth/me (Bearer Token required)',
      'GET /api/auth/profile (Bearer Token หรือ user_id)',
      'GET /api/auth/user (Bearer Token หรือ user_id)',
      'POST /api/auth/profile',
      'GET /api/users/profile?user_id=...',
      'POST /api/users/profile',
      'GET /api/users',
      'GET /api/data/:tableName',
      'GET /api/openfoodfacts/search',
      'GET /api/openfoodfacts/product/:barcode',
      'GET /api/openfoodfacts/random',
      'POST /api/barcode/scan',
      'POST /api/barcode/read',
      'GET /example.html',
      'GET /barcode-scanner.html'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Server Running`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   Routes:`);
  console.log(`   - /api/auth (Login/Register with BMI)`);
  console.log(`   - /api/users (User Management)`);
  console.log(`   - /api/data (Data Operations)`);
  console.log(`   - /api/openfoodfacts (OpenFoodFacts API)`);
  console.log(`   - /api/barcode (Barcode Scanning)`);
  console.log(`   - /example.html (OpenFoodFacts Example)`);
  console.log(`   - /barcode-scanner.html (Barcode Scanner)`);
  console.log(`========================================`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
    console.error(`   Please stop the process using port ${PORT} or change the PORT in .env file\n`);
    console.error(`   To find and kill the process:`);
    console.error(`   Windows: netstat -ano | findstr :${PORT}`);
    console.error(`   Then: taskkill /PID <PID> /F\n`);
  } else {
    console.error(`\n❌ ERROR: Failed to start server:`, err.message);
  }
  process.exit(1);
});
