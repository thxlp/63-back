const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();

/**
 * บันทึกประวัติการทำรายการ
 * POST /api/transactions
 * Body: {
 *   user_id: UUID,
 *   transaction_type: string (bmi_record, barcode_scan, food_search, profile_update, etc.),
 *   action: string,
 *   description: string (optional),
 *   metadata: object (optional),
 *   status: string (optional, default: 'completed')
 * }
 */
/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: การบันทึกและจัดการประวัติการทำรายการ
 */

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: บันทึกประวัติการทำรายการ
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - transaction_type
 *               - action
 *             properties:
 *               user_id:
 *                 type: string
 *               transaction_type:
 *                 type: string
 *                 description: ประเภทของธุรกรรม (เช่น bmi_record, barcode_scan)
 *               action:
 *                 type: string
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *               status:
 *                 type: string
 *                 default: completed
 *     responses:
 *       201:
 *         description: บันทึกสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบถ้วน
 */
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      transaction_type,
      action,
      description,
      metadata,
      status = 'completed'
    } = req.body;

    // Validate required fields
    if (!user_id || !transaction_type || !action) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id, transaction_type และ action'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status ต้องเป็นหนึ่งใน: ${validStatuses.join(', ')}`
      });
    }

    // Get IP address and user agent from request
    const ip_address = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || null;
    const user_agent = req.headers['user-agent'] || null;

    // Prepare transaction data
    const transactionData = {
      user_id,
      transaction_type: String(transaction_type),
      action: String(action),
      description: description ? String(description) : null,
      metadata: metadata ? metadata : null,
      status: String(status),
      ip_address: ip_address ? String(ip_address) : null,
      user_agent: user_agent ? String(user_agent) : null
    };

    console.log('[TRANSACTIONS] Creating transaction:', {
      user_id,
      transaction_type,
      action,
      status
    });

    // Insert transaction history
    const { data, error } = await supabaseAdmin
      .from('transaction_history')
      .insert([transactionData])
      .select();

    if (error) {
      console.error('[TRANSACTIONS] Error creating transaction:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    console.log('[TRANSACTIONS] ✅ Transaction created:', data[0]?.id);

    res.status(201).json({
      success: true,
      data: data[0]
    });
  } catch (error) {
    console.error('[TRANSACTIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ดึงประวัติการทำรายการทั้งหมดของ user
 * GET /api/transactions?user_id=xxx&type=xxx&status=xxx&limit=10&offset=0
 */
/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: ดึงประวัติการทำรายการทั้งหมดของ user
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: transaction_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: รายการประวัติ
 */
router.get('/', async (req, res) => {
  try {
    const {
      user_id,
      transaction_type,
      status,
      limit = 50,
      offset = 0,
      start_date,
      end_date
    } = req.query;

    // Build query
    let query = supabaseAdmin
      .from('transaction_history')
      .select('*', { count: 'exact' });

    // Filter by user_id (required)
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id'
      });
    }
    query = query.eq('user_id', user_id);

    // Filter by transaction_type (optional)
    if (transaction_type) {
      query = query.eq('transaction_type', transaction_type);
    }

    // Filter by status (optional)
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by date range (optional)
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[TRANSACTIONS] Error fetching transactions:', error);
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
    console.error('[TRANSACTIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ดึงประวัติการทำรายการตาม ID
 * GET /api/transactions/:id
 */
/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: ดึงประวัติการทำรายการตาม ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: รายละเอียดประวัติ
 *       404:
 *         description: ไม่พบข้อมูล
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('transaction_history')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบประวัติการทำรายการ'
        });
      }
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[TRANSACTIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * อัปเดตสถานะการทำรายการ
 * PUT /api/transactions/:id
 * Body: {
 *   status: string (pending, completed, failed, cancelled),
 *   description: string (optional),
 *   metadata: object (optional)
 * }
 */
/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: อัปเดตสถานะการทำรายการ
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed, cancelled]
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: อัปเดตสำเร็จ
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description, metadata } = req.body;

    const updateData = {};

    if (status) {
      const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `status ต้องเป็นหนึ่งใน: ${validStatuses.join(', ')}`
        });
      }
      updateData.status = status;
    }

    if (description !== undefined) {
      updateData.description = description ? String(description) : null;
    }

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุข้อมูลที่ต้องการอัปเดต'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('transaction_history')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[TRANSACTIONS] Error updating transaction:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบประวัติการทำรายการ'
      });
    }

    res.json({
      success: true,
      data: data[0]
    });
  } catch (error) {
    console.error('[TRANSACTIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ลบประวัติการทำรายการ
 * DELETE /api/transactions/:id
 */
/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: ลบประวัติการทำรายการ
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ลบสำเร็จ
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('transaction_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[TRANSACTIONS] Error deleting transaction:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'ลบประวัติการทำรายการสำเร็จ'
    });
  } catch (error) {
    console.error('[TRANSACTIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ดึงสถิติการทำรายการของ user
 * GET /api/transactions/stats/:user_id?start_date=xxx&end_date=xxx
 */
/**
 * @swagger
 * /api/transactions/stats/{user_id}:
 *   get:
 *     summary: ดึงสถิติการทำรายการของ user
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: สถิติการทำรายการ
 */
router.get('/stats/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('transaction_history')
      .select('transaction_type, status, created_at');

    query = query.eq('user_id', user_id);

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TRANSACTIONS] Error fetching stats:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Calculate statistics
    const stats = {
      total: data?.length || 0,
      by_type: {},
      by_status: {
        pending: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      },
      by_date: {}
    };

    data?.forEach(transaction => {
      // Count by type
      const type = transaction.transaction_type;
      stats.by_type[type] = (stats.by_type[type] || 0) + 1;

      // Count by status
      const status = transaction.status;
      if (stats.by_status[status] !== undefined) {
        stats.by_status[status]++;
      }

      // Count by date
      const date = new Date(transaction.created_at).toISOString().split('T')[0];
      stats.by_date[date] = (stats.by_date[date] || 0) + 1;
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[TRANSACTIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


