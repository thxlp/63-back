const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { logTransaction } = require('../utils/transactionLogger');
const { normalizeUserId, checkUserExists, decodeUserId } = require('../utils/userHelper');
const router = express.Router();

/**
 * บันทึกประวัติตะกร้าสินค้า
 * POST /api/cart/save
 * 
 * Request Body:
 * {
 *   "user_id": "uuid-string",
 *   "items": [
 *     {
 *       "id": "product-123",
 *       "name": "Pancakes",
 *       "brand": "Recipe",
 *       "calories": "250.5",
 *       "quantity": 1
 *     }
 *   ],
 *   "total_calories": "500.5"
 * }
 */
router.post('/save', async (req, res) => {
  try {
    const {
      user_id,
      items,
      total_calories
    } = req.body;

    console.log('[CART /save] Request:', {
      has_user_id: !!user_id,
      has_items: !!items,
      items_count: items?.length || 0
    });

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id',
        message: 'user_id is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ items',
        message: 'items must be a non-empty array'
      });
    }

    // Normalize user_id (รองรับทั้ง UUID และ integer)
    const { normalizedId } = normalizeUserId(user_id);
    
    // ตรวจสอบว่า user_id มีอยู่จริง
    const userCheck = await checkUserExists(normalizedId);
    
    if (!userCheck.exists) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบผู้ใช้',
        message: `User with id ${user_id} does not exist`
      });
    }

    // คำนวณ total_items
    const totalItems = items.length;

    // คำนวณ total_calories ถ้าไม่ได้ส่งมา
    let calculatedCalories = total_calories;
    if (!calculatedCalories) {
      calculatedCalories = items.reduce((sum, item) => {
        const itemCalories = parseFloat(item.calories) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return sum + (itemCalories * quantity);
      }, 0);
    } else {
      calculatedCalories = parseFloat(calculatedCalories);
    }

    // Prepare data for insert (ใช้ normalizedId)
    const cartData = {
      user_id: String(normalizedId), // ใช้ normalizedId
      items: items,
      total_items: totalItems,
      total_calories: calculatedCalories || null,
      status: 'active'
    };

    console.log('[CART /save] Inserting cart data:', {
      user_id,
      total_items: totalItems,
      total_calories: calculatedCalories
    });

    // Insert cart history
    const { data, error } = await supabaseAdmin
      .from('cart_history')
      .insert([cartData])
      .select();

    if (error) {
      console.error('[CART /save] Insert error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลตะกร้า'
      });
    }

    // บันทึกประวัติการทำรายการ
    logTransaction({
      user_id: user_id,
      transaction_type: 'cart_save',
      action: 'บันทึกประวัติตะกร้า',
      description: `บันทึกตะกร้าสินค้า: ${totalItems} รายการ, ${calculatedCalories || 0} kcal`,
      metadata: {
        total_items: totalItems,
        total_calories: calculatedCalories,
        items_count: items.length
      },
      status: 'completed',
      req: req
    }).catch(err => 
      console.error('[CART /save] Error logging transaction:', err)
    );

    console.log('[CART /save] ✅ Success:', {
      id: data[0]?.id
    });

    res.status(200).json({
      success: true,
      message: 'บันทึกประวัติตะกร้าเรียบร้อยแล้ว',
      id: data[0]?.id
    });

  } catch (error) {
    console.error('[CART /save] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      message: 'เกิดข้อผิดพลาดจาก server'
    });
  }
});

/**
 * ดึงประวัติตะกร้าสินค้าของ user
 * GET /api/cart/history?user_id=xxx&limit=10&offset=0
 */
router.get('/history', async (req, res) => {
  try {
    let { 
      user_id, 
      limit = 20, 
      offset = 0,
      status = 'active'
    } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id'
      });
    }

    // URL decode user_id
    user_id = decodeUserId(user_id);
    
    // Normalize user_id (รองรับทั้ง UUID และ integer)
    const { normalizedId } = normalizeUserId(user_id);
    
    // ตรวจสอบว่า user_id มีอยู่จริง
    const userCheck = await checkUserExists(normalizedId);
    
    if (!userCheck.exists) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบผู้ใช้',
        message: `User with id ${user_id} does not exist`
      });
    }

    // Build query (ใช้ normalizedId)
    let query = supabaseAdmin
      .from('cart_history')
      .select('*', { count: 'exact' })
      .eq('user_id', normalizedId);

    // Filter by status (optional)
    if (status) {
      query = query.eq('status', status);
    }

    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const limitNum = Math.min(parseInt(limit) || 20, 100); // Max 100
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[CART /history] Error fetching cart history:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      total: count || 0,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('[CART /history] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ดึงตะกร้าล่าสุดของ user
 * GET /api/cart/latest?user_id=xxx
 */
router.get('/latest', async (req, res) => {
  try {
    let { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id'
      });
    }

    // URL decode user_id
    user_id = decodeUserId(user_id);
    
    // Normalize user_id (รองรับทั้ง UUID และ integer)
    const { normalizedId } = normalizeUserId(user_id);
    
    // ตรวจสอบว่า user_id มีอยู่จริง
    const userCheck = await checkUserExists(normalizedId);
    
    if (!userCheck.exists) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบผู้ใช้',
        message: `User with id ${user_id} does not exist`
      });
    }

    const { data, error } = await supabaseAdmin
      .from('cart_history')
      .select('*')
      .eq('user_id', normalizedId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบตะกร้าสินค้า'
        });
      }
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('[CART /latest] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * อัปเดตสถานะตะกร้า
 * PUT /api/cart/:id
 * Body: { "status": "completed" | "cancelled" }
 */
/**
 * ลบประวัติตะกร้า
 * DELETE /api/cart/:id
 * Body: { "user_id": "uuid-string" | integer }
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id'
      });
    }

    // Normalize user_id
    const { normalizedId } = normalizeUserId(user_id);
    
    // ตรวจสอบว่า cart นี้เป็นของ user นี้จริงๆ
    const { data: cartData, error: fetchError } = await supabaseAdmin
      .from('cart_history')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !cartData) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบตะกร้าสินค้า'
      });
    }

    // ตรวจสอบว่า cart เป็นของ user นี้
    if (String(cartData.user_id) !== String(normalizedId)) {
      return res.status(403).json({
        success: false,
        error: 'ไม่มีสิทธิ์ลบตะกร้านี้'
      });
    }

    // ลบ cart
    const { error: deleteError } = await supabaseAdmin
      .from('cart_history')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(400).json({
        success: false,
        error: deleteError.message
      });
    }

    res.json({
      success: true,
      message: 'ลบตะกร้าสินค้าสำเร็จ'
    });
  } catch (error) {
    console.error('[CART DELETE /:id] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * อัปเดตสถานะตะกร้า
 * PUT /api/cart/:id
 * Body: { "status": "completed" | "cancelled" }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ status'
      });
    }

    const validStatuses = ['active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status ต้องเป็นหนึ่งใน: ${validStatuses.join(', ')}`
      });
    }

    const { data, error } = await supabaseAdmin
      .from('cart_history')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบตะกร้าสินค้า'
      });
    }

    res.json({
      success: true,
      data: data[0]
    });
  } catch (error) {
    console.error('[CART /:id] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

