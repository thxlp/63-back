const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { logTransaction } = require('../utils/transactionLogger');
const { normalizeUserId, checkUserExists } = require('../utils/userHelper');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Data
 *   description: การจัดการข้อมูลทั่วไปและ Calorie Logs
 */

/**
 * @swagger
 * /api/data/calorie_logs:
 *   post:
 *     summary: บันทึกข้อมูลแคลอรี่รายวัน
 *     tags: [Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - date
 *             properties:
 *               user_id:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *               total_calories:
 *                 type: number
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: บันทึกสำเร็จ
 */
// Helper function สำหรับบันทึกข้อมูลแคลอรี่ (ใช้ร่วมกันได้)
async function handleCalorieLog(req, res) {
  try {
    const {
      user_id,
      date,
      total_calories,
      target_calories,
      total_fat,
      total_carbs,
      total_protein,
      items
    } = req.body;

    console.log('[DATA /calorie_logs] Request:', {
      has_user_id: !!user_id,
      has_date: !!date,
      has_items: !!items
    });

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id',
        message: 'user_id is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ date',
        message: 'date is required (format: YYYY-MM-DD)'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบวันที่ไม่ถูกต้อง',
        message: 'date must be in format YYYY-MM-DD'
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

    // Prepare data for insert/update (ใช้ normalizedId)
    const calorieData = {
      user_id: String(normalizedId), // ใช้ normalizedId
      date: date,
      total_calories: total_calories ? parseFloat(total_calories) : null,
      target_calories: target_calories ? parseInt(target_calories) : null,
      total_fat: total_fat ? parseFloat(total_fat) : null,
      total_carbs: total_carbs ? parseFloat(total_carbs) : null,
      total_protein: total_protein ? parseFloat(total_protein) : null,
      items: items && Array.isArray(items) ? items : null
    };

    // ตรวจสอบว่ามี log ของ user_id และ date เดียวกันแล้วหรือไม่ (ใช้ normalizedId)
    const { data: existingLog, error: checkError } = await supabaseAdmin
      .from('calorie_logs')
      .select('id')
      .eq('user_id', normalizedId)
      .eq('date', date)
      .single();

    let result;
    let isUpdate = false;

    if (existingLog && !checkError) {
      // Update existing record
      console.log('[DATA /calorie_logs] Updating existing log:', existingLog.id);
      isUpdate = true;

      const { data, error } = await supabaseAdmin
        .from('calorie_logs')
        .update(calorieData)
        .eq('id', existingLog.id)
        .select();

      if (error) {
        console.error('[DATA /calorie_logs] Update error:', error);
        return res.status(400).json({
          success: false,
          error: error.message,
          message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
        });
      }

      result = data[0];
    } else {
      // Insert new record
      console.log('[DATA /calorie_logs] Inserting new log');
      isUpdate = false;

      const { data, error } = await supabaseAdmin
        .from('calorie_logs')
        .insert([calorieData])
        .select();

      if (error) {
        console.error('[DATA /calorie_logs] Insert error:', error);

        // ถ้าเป็น unique constraint error แสดงว่ามี log อยู่แล้ว (race condition)
        if (error.code === '23505' || error.message.includes('unique')) {
          // ลอง update แทน (ใช้ normalizedId)
          const { data: existingLog2 } = await supabaseAdmin
            .from('calorie_logs')
            .select('id')
            .eq('user_id', normalizedId)
            .eq('date', date)
            .single();

          if (existingLog2) {
            const { data: updateData, error: updateError } = await supabaseAdmin
              .from('calorie_logs')
              .update(calorieData)
              .eq('id', existingLog2.id)
              .select();

            if (updateError) {
              return res.status(400).json({
                success: false,
                error: updateError.message,
                message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
              });
            }

            result = updateData[0];
            isUpdate = true;
          } else {
            return res.status(400).json({
              success: false,
              error: error.message,
              message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            error: error.message,
            message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
          });
        }
      } else {
        result = data[0];
      }
    }

    // บันทึกประวัติการทำรายการ (ใช้ normalizedId)
    logTransaction({
      user_id: normalizedId,
      transaction_type: 'calorie_log',
      action: isUpdate ? 'อัปเดตบันทึกแคลอรี่' : 'บันทึกแคลอรี่',
      description: `บันทึกแคลอรี่สำหรับวันที่ ${date}: ${calorieData.total_calories || 0} kcal`,
      metadata: {
        date: date,
        total_calories: calorieData.total_calories,
        target_calories: calorieData.target_calories,
        items_count: items?.length || 0,
        is_update: isUpdate
      },
      status: 'completed',
      req: req
    }).catch(err =>
      console.error('[DATA /calorie_logs] Error logging transaction:', err)
    );

    console.log('[DATA /calorie_logs] ✅ Success:', {
      id: result.id,
      is_update: isUpdate
    });

    res.status(200).json({
      success: true,
      message: 'บันทึกข้อมูลสำเร็จ',
      id: result.id
    });

  } catch (error) {
    console.error('[DATA /calorie_logs] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      message: 'เกิดข้อผิดพลาดจาก server'
    });
  }
}

/**
 * บันทึกข้อมูลแคลอรี่รายวัน
 * POST /api/data/calorie_logs
 * Alternative endpoints:
 * - POST /api/calorie_logs
 * - POST /api/data/daily_logs
 * 
 * Request Body:
 * {
 *   "user_id": "uuid-string",
 *   "date": "2024-01-15",
 *   "total_calories": "500.5",
 *   "target_calories": "2000",
 *   "total_fat": "25.3",
 *   "total_carbs": "60.2",
 *   "total_protein": "30.1",
 *   "items": [
 *     {
 *       "id": "product-123",
 *       "name": "Pancakes",
 *       "brand": "Recipe",
 *       "calories": "250.5"
 *     }
 *   ]
 * }
 */
// Main endpoint
router.post('/calorie_logs', handleCalorieLog);

// Alternative endpoint
router.post('/daily_logs', handleCalorieLog);

/**
 * Alternative endpoint สำหรับบันทึกข้อมูลแคลอรี่
 * POST /api/data/daily_logs
 */
router.post('/daily_logs', async (req, res) => {
  // Forward ไปยัง calorie_logs handler
  req.url = '/calorie_logs';
  req.path = '/calorie_logs';
  return router.handle(req, res);
});

// Get data from table
router.get('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit = 10, offset = 0, order_by, order } = req.query;

    let query = supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact' });

    // เพิ่ม order by ถ้ามี (รองรับ bmi_records ที่ไม่มี date/created_at)
    if (order_by) {
      query = query.order(order_by, { ascending: order !== 'desc' });
    } else {
      // Default: order by id (รองรับทุกตาราง)
      query = query.order('id', { ascending: false });
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single record
router.get('/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Insert data
router.post('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const newRecord = req.body;

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .insert([newRecord])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update data
router.put('/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete data
router.delete('/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;

    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export handler function สำหรับใช้ใน alternative endpoints
module.exports = router;
module.exports.handleCalorieLog = handleCalorieLog;
