const express = require('express');
const axios = require('axios');
const { logTransaction } = require('../utils/transactionLogger');
const router = express.Router();

// Spoonacular API Configuration
const SPOONACULAR_API = 'https://api.spoonacular.com';
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || ''; // ต้องตั้งค่าใน .env

// Configure axios with timeout
const axiosConfig = {
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * ค้นหาสูตรอาหาร
 * GET /api/recipes/search?q=cake&number=20
 * หรือ
 * GET /api/recipes/search?query=cake&number=20
 */
router.get('/search', async (req, res) => {
  try {
    // รองรับทั้ง q และ query parameter
    const query = req.query.q || req.query.query || '';
    const { number = 20, offset = 0, user_id = null } = req.query;

    console.log('[RECIPES /search] Request:', { 
      q: req.query.q, 
      query: req.query.query,
      finalQuery: query,
      number, 
      offset 
    });

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุคำค้นหา',
        message: 'q หรือ query parameter is required',
        received: {
          q: req.query.q,
          query: req.query.query,
          all_params: req.query
        }
      });
    }

    // ตรวจสอบ API key
    if (!SPOONACULAR_API_KEY) {
      console.error('[RECIPES /search] ❌ Spoonacular API key not configured');
      return res.status(503).json({
        success: false,
        error: 'Spoonacular API key ไม่ได้ตั้งค่า',
        message: 'กรุณาติดต่อผู้ดูแลระบบ',
        suggestion: 'Backend ต้องตั้งค่า SPOONACULAR_API_KEY ใน environment variables'
      });
    }

    console.log('[RECIPES /search] Calling Spoonacular API...');

    // เรียก Spoonacular API
    const response = await axios.get(`${SPOONACULAR_API}/recipes/complexSearch`, {
      ...axiosConfig,
      params: {
        query: query.trim(),
        number: Math.min(parseInt(number) || 20, 100), // จำกัดสูงสุด 100
        offset: Math.max(parseInt(offset) || 0, 0),
        apiKey: SPOONACULAR_API_KEY
      }
    });

    console.log('[RECIPES /search] ✅ API response received');
    console.log('[RECIPES /search] Recipes count:', response.data?.results?.length || 0);

    // Return response ในรูปแบบเดียวกับ Spoonacular API โดยตรง
    // เพื่อให้ frontend ใช้งานได้ง่าย (ไม่ต้อง format ใหม่)
    const spoonacularResponse = response.data;

    // บันทึกประวัติการทำรายการ
    if (user_id) {
      logTransaction({
        user_id: user_id,
        transaction_type: 'recipe_search',
        action: 'ค้นหาสูตรอาหาร',
        description: `ค้นหาสูตรอาหาร: "${query}" - พบ ${spoonacularResponse?.results?.length || 0} รายการ`,
        metadata: {
          query: query,
          count: spoonacularResponse?.results?.length || 0,
          total: spoonacularResponse?.totalResults || 0
        },
        status: 'completed',
        req: req
      }).catch(err =>
        console.error('[RECIPES /search] Error logging transaction:', err)
      );
    }

    // Return response แบบเดียวกับ Spoonacular API
    res.json(spoonacularResponse);
  } catch (error) {
    console.error('[RECIPES /search] ❌ Error:', error.message);
    console.error('[RECIPES /search] Error code:', error.code);
    console.error('[RECIPES /search] Error response:', error.response?.status, error.response?.statusText);
    console.error('[RECIPES /search] Error response data:', error.response?.data);

    // Handle 402 Payment Required
    if (error.response && error.response.status === 402) {
      console.error('[RECIPES /search] 💳 402 Payment Required');
      
      // บันทึกประวัติการทำรายการที่ล้มเหลว
      const userId = req.query?.user_id || null;
      if (userId) {
        logTransaction({
          user_id: userId,
          transaction_type: 'recipe_search',
          action: 'ค้นหาสูตรอาหาร',
          description: `ค้นหาสูตรอาหาร: "${req.query.q || req.query.query}" - HTTP 402`,
          metadata: {
            query: req.query.q || req.query.query,
            error: 'HTTP 402 Payment Required',
            error_code: error.response?.status
          },
          status: 'failed',
          req: req
        }).catch(err =>
          console.error('[RECIPES /search] Error logging failed transaction:', err)
        );
      }
      
      return res.status(402).json({
        success: false,
        error: 'Spoonacular API ต้องการการชำระเงิน',
        message: 'Spoonacular API key หมดอายุหรือ quota หมด กรุณาติดต่อผู้ดูแลระบบ',
        details: 'API key อาจหมดอายุหรือ quota ถูกใช้หมดแล้ว',
        suggestion: 'กรุณาติดต่อผู้ดูแลระบบเพื่อต่ออายุ API key หรือเพิ่ม quota'
      });
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'Spoonacular API timeout - กรุณาลองใหม่อีกครั้ง',
        details: 'การเชื่อมต่อกับ Spoonacular ใช้เวลานานเกินไป (30 วินาที)'
      });
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'ไม่สามารถเชื่อมต่อกับ Spoonacular API ได้',
        details: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ'
      });
    }

    // Handle 401 Unauthorized (Invalid API key)
    if (error.response && error.response.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Spoonacular API key ไม่ถูกต้อง',
        message: 'API key ที่ใช้ไม่ถูกต้องหรือหมดอายุ',
        suggestion: 'กรุณาติดต่อผู้ดูแลระบบ'
      });
    }

    // Handle 429 Too Many Requests
    if (error.response && error.response.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'ส่งคำขอมากเกินไป',
        details: 'Spoonacular API จำกัดจำนวนคำขอ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
        suggestion: 'กรุณารอ 1-2 นาทีแล้วลองใหม่อีกครั้ง'
      });
    }

    // Generic error
    const statusCode = error.response?.status || 500;
    
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการค้นหาสูตรอาหาร',
        details: error.response?.data?.message || error.message,
        status: statusCode,
        recipes: []
      });
    }

    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการค้นหาสูตรอาหาร',
      details: error.response?.data?.message || error.message
    });
  }
});

/**
 * ดึงรายละเอียดสูตรอาหาร
 * GET /api/recipes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id = null } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ recipe ID'
      });
    }

    // ตรวจสอบ API key
    if (!SPOONACULAR_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Spoonacular API key ไม่ได้ตั้งค่า',
        message: 'กรุณาติดต่อผู้ดูแลระบบ'
      });
    }

    const response = await axios.get(`${SPOONACULAR_API}/recipes/${id}/information`, {
      ...axiosConfig,
      params: {
        apiKey: SPOONACULAR_API_KEY
      }
    });

    res.json({
      success: true,
      recipe: response.data
    });
  } catch (error) {
    console.error('[RECIPES /:id] Error:', error.message);

    // Handle 402 Payment Required
    if (error.response && error.response.status === 402) {
      return res.status(402).json({
        success: false,
        error: 'Spoonacular API ต้องการการชำระเงิน',
        message: 'Spoonacular API key หมดอายุหรือ quota หมด'
      });
    }

    // Handle 404 Not Found
    if (error.response && error.response.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสูตรอาหารที่ระบุ'
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสูตรอาหาร',
      details: error.response?.data?.message || error.message
    });
  }
});

module.exports = router;

