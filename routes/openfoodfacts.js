const express = require('express');
const axios = require('axios');
const { logFoodSearch } = require('../utils/transactionLogger');
const router = express.Router();

// Base URL for OpenFoodFacts API
const OPENFOODFACTS_API = 'https://world.openfoodfacts.org';

// Configure axios with timeout
const axiosConfig = {
  timeout: 30000, // 30 seconds timeout (เพิ่มจาก 15 เป็น 30 วินาที)
  headers: {
    'User-Agent': 'TCX-Backend/1.0'
  }
};

// Helper function สำหรับ retry request
async function retryRequest(requestFn, maxRetries = 2, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      // ถ้าเป็น timeout และยังมี retry อยู่ ให้ลองใหม่
      if ((error.code === 'ECONNABORTED' || error.message.includes('timeout')) && i < maxRetries - 1) {
        console.log(`[OPENFOODFACTS] Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

/**
 * ค้นหาสินค้าจาก OpenFoodFacts
 * GET /api/openfoodfacts/search?q=ชื่อสินค้า&page=1&page_size=20
 */
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, page_size = 20 } = req.query;

    console.log('[OPENFOODFACTS /search] Request:', { q, page, page_size });

    if (!q || q.trim() === '') {
      console.log('[OPENFOODFACTS /search] ❌ Missing search query');
      return res.status(400).json({ 
        success: false,
        error: 'กรุณาระบุคำค้นหา',
        message: 'q parameter is required'
      });
    }

    console.log('[OPENFOODFACTS /search] Searching for:', q);
    console.log('[OPENFOODFACTS /search] Calling OpenFoodFacts API...');

    // ใช้ retry logic สำหรับการเรียก API
    const response = await retryRequest(() => 
      axios.get(`${OPENFOODFACTS_API}/cgi/search.pl`, {
        ...axiosConfig,
        params: {
          search_terms: q.trim(),
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: Math.min(parseInt(page_size) || 20, 100), // จำกัดสูงสุด 100
          page: Math.max(parseInt(page) || 1, 1) // อย่างน้อยหน้า 1
        }
      })
    );

    console.log('[OPENFOODFACTS /search] ✅ API response received');
    console.log('[OPENFOODFACTS /search] Response status:', response.status);
    console.log('[OPENFOODFACTS /search] Products count:', response.data?.products?.length || 0);

    const products = response.data?.products || [];
    
    // จัดรูปแบบข้อมูลให้ง่ายต่อการใช้งาน
    const formattedProducts = products
      .filter(product => product.code && (product.product_name || product.product_name_en)) // กรองเฉพาะที่มีข้อมูลครบ
      .map(product => ({
        id: product.code,
        barcode: product.code,
        name: product.product_name || product.product_name_en || 'ไม่ระบุชื่อ',
        name_en: product.product_name_en || null,
        name_th: product.product_name_th || null,
        brand: product.brands || null,
        brands_tags: product.brands_tags || [],
        categories: product.categories || null,
        categories_tags: product.categories_tags || [],
        image_url: product.image_url || product.image_front_url || product.image_front_small_url || null,
        image_front_url: product.image_front_url || null,
        image_small_url: product.image_front_small_url || null,
        nutriscore_grade: product.nutriscore_grade || null,
        nutriscore_score: product.nutriscore_score || null,
        ecoscore_grade: product.ecoscore_grade || null,
        ecoscore_score: product.ecoscore_score || null,
        ingredients_text: product.ingredients_text || null,
        ingredients_text_th: product.ingredients_text_th || null,
        allergens: product.allergens || null,
        allergens_tags: product.allergens_tags || [],
        nutrition: {
          energy: product.nutriments?.energy || null,
          energy_unit: product.nutriments?.energy_unit || 'kcal',
          energy_kcal: product.nutriments?.['energy-kcal'] || product.nutriments?.['energy-kcal_100g'] || null,
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
        url: product.url || null,
        last_modified: product.last_modified_t || null
      }));

    const result = {
      success: true,
      count: formattedProducts.length,
      page: parseInt(page) || 1,
      page_size: parseInt(page_size) || 20,
      total_products: response.data?.count || 0,
      products: formattedProducts
    };

    console.log('[OPENFOODFACTS /search] ✅ Sending response:', {
      count: result.count,
      total: result.total_products,
      page: result.page
    });

    // บันทึกประวัติการทำรายการ (ไม่รอผลลัพธ์เพื่อไม่ให้ชะลอ response)
    const userId = req.query?.user_id || req.body?.user_id || null;
    if (userId) {
      logFoodSearch(userId, q, result.count, req).catch(err => 
        console.error('[OPENFOODFACTS /search] Error logging transaction:', err)
      );
    }

    res.json(result);
  } catch (error) {
    console.error('[OPENFOODFACTS /search] ❌ Error:', error.message);
    console.error('[OPENFOODFACTS /search] Error code:', error.code);
    console.error('[OPENFOODFACTS /search] Error response:', error.response?.status, error.response?.statusText);
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('[OPENFOODFACTS /search] ⏱️  Timeout error');
      
      // บันทึกประวัติการทำรายการที่ล้มเหลว
      const userId = req.query?.user_id || req.body?.user_id || null;
      if (userId) {
        const { logTransaction } = require('../utils/transactionLogger');
        logTransaction({
          user_id: userId,
          transaction_type: 'food_search',
          action: 'ค้นหาอาหาร',
          description: `ค้นหาอาหาร: "${q}" - Timeout`,
          metadata: {
            query: q,
            error: 'timeout',
            error_code: error.code
          },
          status: 'failed',
          req: req
        }).catch(err => 
          console.error('[OPENFOODFACTS /search] Error logging failed transaction:', err)
        );
      }
      
      return res.status(504).json({ 
        success: false,
        error: 'OpenFoodFacts API timeout - กรุณาลองใหม่อีกครั้ง',
        details: 'การเชื่อมต่อกับ OpenFoodFacts ใช้เวลานานเกินไป (30 วินาที)',
        suggestion: 'กรุณาลองใหม่อีกครั้งในภายหลัง หรือลองค้นหาด้วยคำอื่น',
        retry_suggestion: 'ระบบจะลองใหม่อัตโนมัติ 2 ครั้ง หากยังไม่สำเร็จกรุณาลองใหม่ภายหลัง'
      });
    }
    
    // Handle 504 Gateway Timeout from OpenFoodFacts
    if (error.response && error.response.status === 504) {
      console.error('[OPENFOODFACTS /search] 🔴 504 Gateway Timeout from OpenFoodFacts');
      return res.status(504).json({ 
        success: false,
        error: 'OpenFoodFacts API ไม่สามารถตอบสนองได้ในขณะนี้',
        details: 'OpenFoodFacts server กำลังมีปัญหา กรุณาลองใหม่อีกครั้งในภายหลัง',
        suggestion: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
      });
    }
    
    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('[OPENFOODFACTS /search] 🌐 Network error');
      return res.status(503).json({ 
        success: false,
        error: 'ไม่สามารถเชื่อมต่อกับ OpenFoodFacts API ได้',
        details: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ',
        suggestion: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง'
      });
    }
    
    // Handle 402 Payment Required (อาจมาจาก OpenFoodFacts หรือ proxy)
    if (error.response && error.response.status === 402) {
      console.error('[OPENFOODFACTS /search] 💳 402 Payment Required');
      return res.status(402).json({ 
        success: false,
        error: 'OpenFoodFacts API ต้องการการชำระเงิน',
        details: 'OpenFoodFacts API อาจจำกัดการใช้งาน กรุณาลองใหม่อีกครั้งในภายหลัง',
        suggestion: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง หรือลองค้นหาด้วยคำอื่น',
        products: []
      });
    }
    
    // Handle 404 Not Found
    if (error.response && error.response.status === 404) {
      console.error('[OPENFOODFACTS /search] 🔍 404 Not Found');
      return res.status(404).json({ 
        success: false,
        error: 'ไม่พบข้อมูลที่ค้นหา',
        details: 'ลองค้นหาด้วยคำอื่น',
        products: []
      });
    }
    
    // Handle 422 Unprocessable Entity
    if (error.response && error.response.status === 422) {
      console.error('[OPENFOODFACTS /search] 📝 422 Unprocessable Entity');
      return res.status(422).json({ 
        success: false,
        error: 'คำค้นหาไม่ถูกต้อง',
        details: 'กรุณาตรวจสอบคำค้นหาและลองใหม่อีกครั้ง',
        products: []
      });
    }
    
    // Handle 429 Too Many Requests (Rate Limiting)
    if (error.response && error.response.status === 429) {
      console.error('[OPENFOODFACTS /search] ⚡ 429 Too Many Requests');
      return res.status(429).json({ 
        success: false,
        error: 'ส่งคำขอมากเกินไป',
        details: 'OpenFoodFacts API จำกัดจำนวนคำขอ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
        suggestion: 'กรุณารอ 1-2 นาทีแล้วลองใหม่อีกครั้ง',
        products: []
      });
    }
    
    // Generic error
    console.error('[OPENFOODFACTS /search] ❌ Generic error:', error);
    console.error('[OPENFOODFACTS /search] Error response status:', error.response?.status);
    console.error('[OPENFOODFACTS /search] Error response data:', error.response?.data);
    
    // บันทึกประวัติการทำรายการที่ล้มเหลว
    const userId = req.query?.user_id || req.body?.user_id || null;
    if (userId) {
      const { logTransaction } = require('../utils/transactionLogger');
      logTransaction({
        user_id: userId,
        transaction_type: 'food_search',
        action: 'ค้นหาอาหาร',
        description: `ค้นหาอาหาร: "${q}" - Error: ${error.message}`,
        metadata: {
          query: q,
          error: error.message,
          error_code: error.code,
          status_code: error.response?.status
        },
        status: 'failed',
        req: req
      }).catch(err => 
        console.error('[OPENFOODFACTS /search] Error logging failed transaction:', err)
      );
    }
    
    // ตรวจสอบ status code จาก OpenFoodFacts
    const statusCode = error.response?.status || 500;
    
    // ถ้าเป็น 402 ให้ return 402 (ไม่แปลงเป็น 500)
    if (statusCode === 402) {
      return res.status(402).json({ 
        success: false,
        error: 'OpenFoodFacts API ต้องการการชำระเงิน',
        details: 'OpenFoodFacts API อาจจำกัดการใช้งาน กรุณาลองใหม่อีกครั้งในภายหลัง',
        suggestion: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
        products: []
      });
    }
    
    // สำหรับ status codes อื่นๆ ที่ไม่ใช่ 2xx, 3xx
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({ 
        success: false,
        error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล',
        details: error.response?.data?.message || error.message,
        status: statusCode,
        products: []
      });
    }
    
    // สำหรับ 5xx หรือ error อื่นๆ
    res.status(500).json({ 
      success: false,
      error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล',
      details: error.response?.data?.message || error.message,
      status: statusCode
    });
  }
});

/**
 * ดึงข้อมูลสินค้าตาม Barcode (EAN-13)
 * GET /api/openfoodfacts/product/:barcode
 */
router.get('/product/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      return res.status(400).json({ 
        error: 'กรุณาระบุ Barcode' 
      });
    }

    const response = await axios.get(
      `${OPENFOODFACTS_API}/api/v0/product/${barcode}.json`,
      axiosConfig
    );

    if (response.data.status === 0) {
      return res.status(404).json({ 
        error: 'ไม่พบสินค้าที่ระบุ',
        barcode: barcode
      });
    }

    const product = response.data.product;

    // จัดรูปแบบข้อมูลให้ง่ายต่อการใช้งาน
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
      product: formattedProduct
    });
  } catch (error) {
    console.error('Error fetching product from OpenFoodFacts:', error.message);
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: 'OpenFoodFacts API timeout - กรุณาลองใหม่อีกครั้ง',
        details: 'การเชื่อมต่อกับ OpenFoodFacts ใช้เวลานานเกินไป'
      });
    }
    
    // Handle 504 Gateway Timeout
    if (error.response && error.response.status === 504) {
      return res.status(504).json({ 
        error: 'OpenFoodFacts API ไม่สามารถตอบสนองได้ในขณะนี้',
        details: 'OpenFoodFacts server กำลังมีปัญหา กรุณาลองใหม่อีกครั้งในภายหลัง'
      });
    }
    
    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'ไม่สามารถเชื่อมต่อกับ OpenFoodFacts API ได้',
        details: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ'
      });
    }
    
    // Handle 402 Payment Required
    if (error.response && error.response.status === 402) {
      return res.status(402).json({ 
        error: 'OpenFoodFacts API ต้องการการชำระเงิน',
        details: 'OpenFoodFacts API อาจจำกัดการใช้งาน กรุณาลองใหม่อีกครั้งในภายหลัง'
      });
    }
    
    // ตรวจสอบ status code จาก OpenFoodFacts
    const statusCode = error.response?.status || 500;
    
    // ถ้าเป็น 4xx ให้ return status code นั้น
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({ 
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
        details: error.response?.data?.message || error.message,
        status: statusCode
      });
    }
    
    // สำหรับ 5xx หรือ error อื่นๆ
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
      details: error.response?.data?.message || error.message
    });
  }
});

/**
 * ดึงข้อมูลสินค้าแบบสุ่ม
 * GET /api/openfoodfacts/random?count=5
 */
router.get('/random', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 5;

    // ใช้การค้นหาแบบสุ่มโดยใช้คำค้นหาที่หลากหลาย
    const randomTerms = ['food', 'drink', 'snack', 'beverage', 'product'];
    const randomTerm = randomTerms[Math.floor(Math.random() * randomTerms.length)];

    const response = await axios.get(`${OPENFOODFACTS_API}/cgi/search.pl`, {
      ...axiosConfig,
      params: {
        search_terms: randomTerm,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: count,
        page: Math.floor(Math.random() * 10) + 1 // หน้าแบบสุ่ม
      }
    });

    const products = response.data.products || [];
    
    const formattedProducts = products
      .filter(p => p.code && p.product_name) // กรองเฉพาะที่มีข้อมูลครบ
      .slice(0, count)
      .map(product => ({
        id: product.code,
        name: product.product_name || product.product_name_en || 'ไม่ระบุชื่อ',
        brand: product.brands || null,
        image_url: product.image_url || product.image_front_url || null,
        nutriscore_grade: product.nutriscore_grade || null,
        url: product.url || null
      }));

    res.json({
      success: true,
      count: formattedProducts.length,
      products: formattedProducts
    });
  } catch (error) {
    console.error('Error fetching random products:', error.message);
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: 'OpenFoodFacts API timeout - กรุณาลองใหม่อีกครั้ง',
        details: 'การเชื่อมต่อกับ OpenFoodFacts ใช้เวลานานเกินไป'
      });
    }
    
    // Handle 504 Gateway Timeout
    if (error.response && error.response.status === 504) {
      return res.status(504).json({ 
        error: 'OpenFoodFacts API ไม่สามารถตอบสนองได้ในขณะนี้',
        details: 'OpenFoodFacts server กำลังมีปัญหา กรุณาลองใหม่อีกครั้งในภายหลัง'
      });
    }
    
    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'ไม่สามารถเชื่อมต่อกับ OpenFoodFacts API ได้',
        details: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ'
      });
    }
    
    // Handle 402 Payment Required
    if (error.response && error.response.status === 402) {
      return res.status(402).json({ 
        error: 'OpenFoodFacts API ต้องการการชำระเงิน',
        details: 'OpenFoodFacts API อาจจำกัดการใช้งาน กรุณาลองใหม่อีกครั้งในภายหลัง'
      });
    }
    
    // ตรวจสอบ status code จาก OpenFoodFacts
    const statusCode = error.response?.status || 500;
    
    // ถ้าเป็น 4xx ให้ return status code นั้น
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({ 
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้าแบบสุ่ม',
        details: error.response?.data?.message || error.message,
        status: statusCode
      });
    }
    
    // สำหรับ 5xx หรือ error อื่นๆ
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้าแบบสุ่ม',
      details: error.response?.data?.message || error.message
    });
  }
});

module.exports = router;

