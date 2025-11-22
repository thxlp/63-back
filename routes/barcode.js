const express = require('express');
const multer = require('multer');
const { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } = require('@zxing/library');
const axios = require('axios');
const router = express.Router();

// สำหรับ Jimp เวอร์ชัน 1.6.0 ต้องใช้ Jimp.Jimp เป็น constructor
const Jimp = require('jimp');

// Helper function สำหรับอ่านรูปภาพด้วย Jimp
async function readImageWithJimp(buffer) {
  const imageBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  
  // สำหรับ Jimp 1.6.0 ใช้ Jimp.Jimp.read() โดยตรง
  if (typeof Jimp.Jimp === 'function' && typeof Jimp.Jimp.read === 'function') {
    return await Jimp.Jimp.read(imageBuffer);
  }
  
  // ลองใช้ Jimp.read() สำหรับเวอร์ชันเก่า
  if (typeof Jimp.read === 'function') {
    return await Jimp.read(imageBuffer);
  }
  
  // ถ้ายังไม่ได้ ให้ลองใช้ constructor โดยตรง
  if (typeof Jimp === 'function') {
    return await Jimp(imageBuffer);
  }
  
  // ถ้ายังไม่ได้ ให้ลองใช้ Jimp.default
  if (Jimp.default) {
    if (typeof Jimp.default.read === 'function') {
      return await Jimp.default.read(imageBuffer);
    }
    if (typeof Jimp.default === 'function') {
      return await Jimp.default(imageBuffer);
    }
  }
  
  throw new Error('Cannot read image with Jimp. Jimp version may not be compatible.');
}

// ตั้งค่า multer สำหรับรับไฟล์
const storage = multer.memoryStorage(); // เก็บไฟล์ใน memory
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // จำกัดขนาดไฟล์ 50MB
  },
  fileFilter: (req, file, cb) => {
    // รับเฉพาะไฟล์รูปภาพ
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น'), false);
    }
  }
});

// Base URL for OpenFoodFacts API
const OPENFOODFACTS_API = 'https://world.openfoodfacts.org';

/**
 * อ่านบาร์โค้ดจากรูปภาพ
 * POST /api/barcode/scan
 * Content-Type: multipart/form-data
 * Body: file (รูปภาพ)
 */
router.post('/scan', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      // จัดการ multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'ไฟล์มีขนาดใหญ่เกินไป',
          details: 'ขนาดไฟล์สูงสุดที่อนุญาต: 50MB'
        });
      }
      if (err.message?.includes('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น')) {
        return res.status(400).json({ 
          error: 'รูปแบบไฟล์ไม่ถูกต้อง',
          details: err.message
        });
      }
      return next(err);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'กรุณาอัปโหลดไฟล์รูปภาพ',
        details: 'ไม่พบไฟล์ใน request'
      });
    }

    // ตรวจสอบขนาดไฟล์
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ 
        error: 'ไฟล์ว่างเปล่า',
        details: 'กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง'
      });
    }

    // ตรวจสอบ MIME type และไฟล์ header
    const mimeType = req.file.mimetype;
    const buffer = req.file.buffer;
    const fileSize = buffer.length;
    
    console.log('File info:', {
      mimetype: mimeType,
      size: fileSize,
      originalname: req.file.originalname,
      bufferLength: buffer.length
    });

    // ตรวจสอบไฟล์ header เพื่อยืนยันว่าเป็นรูปภาพจริงๆ
    const isJPEG = buffer.length >= 4 && 
                   buffer[0] === 0xFF && buffer[1] === 0xD8 && 
                   (buffer[2] === 0xFF || buffer[3] === 0xE0 || buffer[3] === 0xE1 || buffer[3] === 0xDB);
    const isPNG = buffer.length >= 4 && 
                  buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isGIF = buffer.length >= 4 && 
                  buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    const isWebP = buffer.length >= 12 && 
                   buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                   buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    
    const isImage = isJPEG || isPNG || isGIF || isWebP;

    console.log('File header check:', {
      isJPEG,
      isPNG,
      isGIF,
      isWebP,
      isImage,
      firstBytes: buffer.slice(0, 12).toString('hex')
    });

    // ถ้า MIME type เป็น image/ แต่ header ไม่ตรง ให้แจ้งเตือนแต่ยังลองอ่านต่อ
    if (!isImage && !mimeType.startsWith('image/')) {
      console.warn('File may not be a valid image:', {
        mimetype: mimeType,
        firstBytes: buffer.slice(0, 12).toString('hex')
      });
      // ไม่ return error ทันที เพราะ Jimp อาจจะอ่านได้
    }

    // อ่านรูปภาพจาก buffer
    let image;
    try {
      image = await readImageWithJimp(buffer);
      console.log('Image read successfully:', {
        width: image.bitmap.width,
        height: image.bitmap.height,
        format: image.getExtension ? image.getExtension() : 'unknown'
      });
    } catch (jimpError) {
      console.error('Jimp read error:', jimpError);
      console.error('Error message:', jimpError.message);
      console.error('Error stack:', jimpError.stack);
      
      // ตรวจสอบ error type
      let errorDetails = 'กรุณาตรวจสอบว่าไฟล์เป็นรูปภาพที่ถูกต้อง (JPG, PNG, GIF, WebP)';
      
      if (jimpError.message?.includes('Unsupported MIME type')) {
        errorDetails = `Jimp ไม่รองรับรูปแบบไฟล์: ${mimeType}. กรุณาลองแปลงไฟล์เป็น PNG หรือ JPG มาตรฐาน`;
      } else if (jimpError.message?.includes('Could not find MIME')) {
        errorDetails = 'ไม่สามารถระบุรูปแบบไฟล์ได้ กรุณาตรวจสอบว่าไฟล์ไม่เสียหาย';
      } else if (jimpError.message?.includes('Invalid') || jimpError.message?.includes('corrupt')) {
        errorDetails = 'ไฟล์รูปภาพเสียหายหรือไม่ถูกต้อง กรุณาลองใช้ไฟล์อื่น';
      } else if (jimpError.message?.includes('unsupported') || jimpError.message?.includes('format')) {
        errorDetails = `รูปแบบไฟล์ไม่รองรับ: ${mimeType}. กรุณาลองแปลงไฟล์เป็น JPG หรือ PNG`;
      } else if (jimpError.message?.includes('is not a function')) {
        errorDetails = 'เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาลอง restart server หรือติดตั้ง jimp ใหม่: npm install jimp';
      }
      
      return res.status(400).json({ 
        error: 'ไม่สามารถอ่านไฟล์รูปภาพได้',
        details: errorDetails,
        debug: process.env.NODE_ENV === 'development' ? {
          mimetype: mimeType,
          errorMessage: jimpError.message,
          fileSize: fileSize,
          firstBytes: buffer.slice(0, 20).toString('hex')
        } : undefined
      });
    }
    
    // แปลงเป็น RGBA format และปรับขนาดถ้าจำเป็น (ZXing ทำงานได้ดีกับรูปขนาดเล็ก)
    const maxWidth = 1200;
    if (image.bitmap.width > maxWidth) {
      // สำหรับ Jimp 1.6.0 ต้องใช้ object แทน number
      // คำนวณ height ใหม่ตามอัตราส่วน
      const newHeight = Math.round((image.bitmap.height * maxWidth) / image.bitmap.width);
      
      // ลองใช้ object format ก่อน
      try {
        image = image.resize({ width: maxWidth, height: newHeight });
      } catch (err) {
        // ถ้าไม่ได้ ให้ลองใช้ w, h
        try {
          image = image.resize({ w: maxWidth, h: newHeight });
        } catch (err2) {
          // ถ้ายังไม่ได้ ให้ลองใช้แบบเดิม (สำหรับเวอร์ชันเก่า)
          try {
            image = image.resize(maxWidth, newHeight);
          } catch (err3) {
            console.error('Resize error:', err3);
            // ถ้า resize ไม่ได้ ให้ใช้รูปเดิม
          }
        }
      }
    }

    // แปลงเป็น grayscale และปรับ contrast เพื่อให้อ่านบาร์โค้ดได้ดีขึ้น
    image = image.greyscale().contrast(0.3).normalize();

    // แปลงเป็น luminance data สำหรับ ZXing
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const luminanceData = new Uint8ClampedArray(width * height);
    
    // แปลง RGBA เป็น grayscale luminance
    for (let i = 0; i < image.bitmap.data.length; i += 4) {
      const r = image.bitmap.data[i];
      const g = image.bitmap.data[i + 1];
      const b = image.bitmap.data[i + 2];
      // ใช้สูตร luminance standard
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      luminanceData[i / 4] = luminance;
    }

    // สร้าง RGBLuminanceSource และ BinaryBitmap
    const luminanceSource = new RGBLuminanceSource(luminanceData, width, height);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    // ตั้งค่า hints สำหรับอ่านบาร์โค้ด
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    // อ่านบาร์โค้ดด้วย ZXing
    const reader = new MultiFormatReader();
    reader.setHints(hints);
    
    let barcode = null;
    try {
      const result = reader.decode(binaryBitmap);
      barcode = result.getText();
    } catch (decodeError) {
      // ถ้าอ่านไม่ได้ ลองปรับรูปภาพอีกครั้ง
      try {
        image = image.contrast(0.5).brightness(0.1);
        
        // สร้าง luminance data ใหม่
        const newLuminanceData = new Uint8ClampedArray(width * height);
        for (let i = 0; i < image.bitmap.data.length; i += 4) {
          const r = image.bitmap.data[i];
          const g = image.bitmap.data[i + 1];
          const b = image.bitmap.data[i + 2];
          const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          newLuminanceData[i / 4] = luminance;
        }
        
        const newLuminanceSource = new RGBLuminanceSource(newLuminanceData, width, height);
        const newBinaryBitmap = new BinaryBitmap(new HybridBinarizer(newLuminanceSource));
        
        const result = reader.decode(newBinaryBitmap);
        barcode = result.getText();
      } catch (retryError) {
        return res.status(400).json({ 
          error: 'ไม่สามารถอ่านบาร์โค้ดจากรูปภาพได้',
          details: 'กรุณาตรวจสอบว่ารูปภาพมีบาร์โค้ดที่ชัดเจนและแสงสว่างเพียงพอ'
        });
      }
    }

    if (!barcode) {
      return res.status(400).json({ 
        error: 'ไม่พบบาร์โค้ดในรูปภาพ' 
      });
    }

    // ดึงข้อมูลสินค้าจาก OpenFoodFacts
    try {
      const response = await axios.get(
        `${OPENFOODFACTS_API}/api/v0/product/${barcode}.json`
      );

      if (response.data.status === 0) {
        return res.json({
          success: true,
          barcode: barcode,
          product: null,
          message: 'อ่านบาร์โค้ดได้แล้ว แต่ไม่พบข้อมูลสินค้าใน OpenFoodFacts'
        });
      }

      const product = response.data.product;

      // จัดรูปแบบข้อมูลสินค้า
      const formattedProduct = {
        id: product.code,
        name: product.product_name || product.product_name_en || 'ไม่ระบุชื่อ',
        name_th: product.product_name_th || null,
        name_en: product.product_name_en || null,
        generic_name: product.generic_name || null,
        brand: product.brands || null,
        brands_tags: product.brands_tags || [],
        categories: product.categories || null,
        categories_tags: product.categories_tags || [],
        image_url: product.image_url || product.image_front_url || null,
        image_front_url: product.image_front_url || null,
        image_ingredients_url: product.image_ingredients_url || null,
        image_nutrition_url: product.image_nutrition_url || null,
        nutriscore_grade: product.nutriscore_grade || null,
        nutriscore_score: product.nutriscore_score || null,
        ecoscore_grade: product.ecoscore_grade || null,
        ecoscore_score: product.ecoscore_score || null,
        ingredients_text: product.ingredients_text || null,
        ingredients_text_th: product.ingredients_text_th || null,
        ingredients: product.ingredients || [],
        allergens: product.allergens || null,
        allergens_tags: product.allergens_tags || [],
        traces: product.traces || null,
        traces_tags: product.traces_tags || [],
        nutrition: {
          energy: product.nutriments?.energy || null,
          energy_unit: product.nutriments?.energy_unit || 'kcal',
          fat: product.nutriments?.fat || null,
          fat_unit: product.nutriments?.fat_unit || 'g',
          saturated_fat: product.nutriments?.['saturated-fat'] || null,
          saturated_fat_unit: product.nutriments?.['saturated-fat_unit'] || 'g',
          carbohydrates: product.nutriments?.carbohydrates || null,
          carbohydrates_unit: product.nutriments?.carbohydrates_unit || 'g',
          sugars: product.nutriments?.sugars || null,
          sugars_unit: product.nutriments?.sugars_unit || 'g',
          fiber: product.nutriments?.fiber || null,
          fiber_unit: product.nutriments?.fiber_unit || 'g',
          proteins: product.nutriments?.proteins || null,
          proteins_unit: product.nutriments?.proteins_unit || 'g',
          salt: product.nutriments?.salt || null,
          salt_unit: product.nutriments?.salt_unit || 'g',
          sodium: product.nutriments?.sodium || null,
          sodium_unit: product.nutriments?.sodium_unit || 'g',
        },
        serving_size: product.serving_size || null,
        quantity: product.quantity || null,
        packaging: product.packaging || null,
        packaging_tags: product.packaging_tags || [],
        labels: product.labels || null,
        labels_tags: product.labels_tags || [],
        stores: product.stores || null,
        stores_tags: product.stores_tags || [],
        countries: product.countries || null,
        countries_tags: product.countries_tags || [],
        manufacturing_places: product.manufacturing_places || null,
        origins: product.origins || null,
        origins_tags: product.origins_tags || [],
        url: product.url || null,
        last_modified: product.last_modified_t || null,
        created: product.created_t || null,
        creator: product.creator || null,
        data_quality_tags: product.data_quality_tags || []
      };

      res.json({
        success: true,
        barcode: barcode,
        product: formattedProduct
      });

    } catch (apiError) {
      // ถ้าไม่พบข้อมูลใน OpenFoodFacts แต่อ่านบาร์โค้ดได้
      res.json({
        success: true,
        barcode: barcode,
        product: null,
        message: 'อ่านบาร์โค้ดได้แล้ว แต่ไม่พบข้อมูลสินค้าใน OpenFoodFacts'
      });
    }

  } catch (error) {
    console.error('Error scanning barcode:', error);
    console.error('Error stack:', error.stack);
    
    // จัดการ error แต่ละประเภท
    if (error.message?.includes('Cannot read')) {
      return res.status(400).json({ 
        error: 'ไม่สามารถอ่านไฟล์ได้',
        details: 'กรุณาตรวจสอบว่าไฟล์เป็นรูปภาพที่ถูกต้อง'
      });
    }
    
    if (error.message?.includes('Invalid')) {
      return res.status(400).json({ 
        error: 'ไฟล์ไม่ถูกต้อง',
        details: 'กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง'
      });
    }
    
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการอ่านบาร์โค้ด',
      details: error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    });
  }
});

/**
 * อ่านบาร์โค้ดจากรูปภาพ (เฉพาะบาร์โค้ด ไม่ดึงข้อมูลสินค้า)
 * POST /api/barcode/read
 * Content-Type: multipart/form-data
 * Body: file (รูปภาพ)
 */
router.post('/read', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      // จัดการ multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'ไฟล์มีขนาดใหญ่เกินไป',
          details: 'ขนาดไฟล์สูงสุดที่อนุญาต: 50MB'
        });
      }
      if (err.message?.includes('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น')) {
        return res.status(400).json({ 
          error: 'รูปแบบไฟล์ไม่ถูกต้อง',
          details: err.message
        });
      }
      return next(err);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'กรุณาอัปโหลดไฟล์รูปภาพ' 
      });
    }

    // ตรวจสอบ MIME type และไฟล์ header
    const mimeType = req.file.mimetype;
    const buffer = req.file.buffer;
    const fileSize = buffer.length;
    
    console.log('File info (read):', {
      mimetype: mimeType,
      size: fileSize,
      originalname: req.file.originalname
    });

    // อ่านรูปภาพจาก buffer
    let image;
    try {
      image = await readImageWithJimp(buffer);
      console.log('Image read successfully (read):', {
        width: image.bitmap.width,
        height: image.bitmap.height
      });
    } catch (jimpError) {
      console.error('Jimp read error (read):', jimpError);
      return res.status(400).json({ 
        error: 'ไม่สามารถอ่านไฟล์รูปภาพได้',
        details: jimpError.message || 'กรุณาตรวจสอบว่าไฟล์เป็นรูปภาพที่ถูกต้อง (JPG, PNG, GIF, WebP)'
      });
    }
    
    // แปลงเป็น RGBA format และปรับขนาดถ้าจำเป็น
    const maxWidth = 1200;
    if (image.bitmap.width > maxWidth) {
      // สำหรับ Jimp 1.6.0 ต้องใช้ object แทน number
      // คำนวณ height ใหม่ตามอัตราส่วน
      const newHeight = Math.round((image.bitmap.height * maxWidth) / image.bitmap.width);
      
      // ลองใช้ object format ก่อน
      try {
        image = image.resize({ width: maxWidth, height: newHeight });
      } catch (err) {
        // ถ้าไม่ได้ ให้ลองใช้ w, h
        try {
          image = image.resize({ w: maxWidth, h: newHeight });
        } catch (err2) {
          // ถ้ายังไม่ได้ ให้ลองใช้แบบเดิม (สำหรับเวอร์ชันเก่า)
          try {
            image = image.resize(maxWidth, newHeight);
          } catch (err3) {
            console.error('Resize error:', err3);
            // ถ้า resize ไม่ได้ ให้ใช้รูปเดิม
          }
        }
      }
    }

    // แปลงเป็น grayscale และปรับ contrast
    image = image.greyscale().contrast(0.3).normalize();

    // แปลงเป็น luminance data สำหรับ ZXing
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const luminanceData = new Uint8ClampedArray(width * height);
    
    for (let i = 0; i < image.bitmap.data.length; i += 4) {
      const r = image.bitmap.data[i];
      const g = image.bitmap.data[i + 1];
      const b = image.bitmap.data[i + 2];
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      luminanceData[i / 4] = luminance;
    }

    // สร้าง RGBLuminanceSource และ BinaryBitmap
    const luminanceSource = new RGBLuminanceSource(luminanceData, width, height);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    // ตั้งค่า hints
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    // อ่านบาร์โค้ดด้วย ZXing
    const reader = new MultiFormatReader();
    reader.setHints(hints);
    
    let barcode = null;
    try {
      const result = reader.decode(binaryBitmap);
      barcode = result.getText();
    } catch (decodeError) {
      // ลองปรับรูปภาพอีกครั้ง
      try {
        image = image.contrast(0.5).brightness(0.1);
        
        const newLuminanceData = new Uint8ClampedArray(width * height);
        for (let i = 0; i < image.bitmap.data.length; i += 4) {
          const r = image.bitmap.data[i];
          const g = image.bitmap.data[i + 1];
          const b = image.bitmap.data[i + 2];
          const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          newLuminanceData[i / 4] = luminance;
        }
        
        const newLuminanceSource = new RGBLuminanceSource(newLuminanceData, width, height);
        const newBinaryBitmap = new BinaryBitmap(new HybridBinarizer(newLuminanceSource));
        
        const result = reader.decode(newBinaryBitmap);
        barcode = result.getText();
      } catch (retryError) {
        return res.status(400).json({ 
          error: 'ไม่สามารถอ่านบาร์โค้ดจากรูปภาพได้',
          details: 'กรุณาตรวจสอบว่ารูปภาพมีบาร์โค้ดที่ชัดเจนและแสงสว่างเพียงพอ'
        });
      }
    }

    if (!barcode) {
      return res.status(400).json({ 
        error: 'ไม่พบบาร์โค้ดในรูปภาพ' 
      });
    }

    res.json({
      success: true,
      barcode: barcode
    });

  } catch (error) {
    console.error('Error reading barcode:', error);
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการอ่านบาร์โค้ด',
      details: error.message 
    });
  }
});

module.exports = router;

