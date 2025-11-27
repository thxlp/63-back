const { supabaseAdmin } = require('../config/supabase');

/**
 * Helper function สำหรับบันทึกประวัติการทำรายการ
 * @param {Object} options - ข้อมูลการทำรายการ
 * @param {string} options.user_id - ID ของผู้ใช้
 * @param {string} options.transaction_type - ประเภทการทำรายการ (bmi_record, barcode_scan, food_search, etc.)
 * @param {string} options.action - คำอธิบายการกระทำ
 * @param {string} options.description - รายละเอียดเพิ่มเติม (optional)
 * @param {Object} options.metadata - ข้อมูลเพิ่มเติมในรูปแบบ JSON (optional)
 * @param {string} options.status - สถานะ (pending, completed, failed, cancelled) - default: 'completed'
 * @param {Object} options.req - Express request object (optional) - สำหรับดึง IP และ User Agent
 * @returns {Promise<Object|null>} - ข้อมูล transaction ที่บันทึก หรือ null ถ้าเกิดข้อผิดพลาด
 */
async function logTransaction({
  user_id,
  transaction_type,
  action,
  description = null,
  metadata = null,
  status = 'completed',
  req = null
}) {
  try {
    // Validate required fields
    if (!user_id || !transaction_type || !action) {
      console.error('[TRANSACTION_LOGGER] Missing required fields:', {
        has_user_id: !!user_id,
        has_transaction_type: !!transaction_type,
        has_action: !!action
      });
      return null;
    }

    // Get IP address and user agent from request if provided
    let ip_address = null;
    let user_agent = null;
    
    if (req) {
      ip_address = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || null;
      user_agent = req.headers['user-agent'] || null;
    }

    // Prepare transaction data
    const transactionData = {
      user_id: String(user_id),
      transaction_type: String(transaction_type),
      action: String(action),
      description: description ? String(description) : null,
      metadata: metadata || null,
      status: String(status),
      ip_address: ip_address ? String(ip_address) : null,
      user_agent: user_agent ? String(user_agent) : null
    };

    console.log('[TRANSACTION_LOGGER] Logging transaction:', {
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
      console.error('[TRANSACTION_LOGGER] Error logging transaction:', error);
      return null;
    }

    console.log('[TRANSACTION_LOGGER] ✅ Transaction logged:', data[0]?.id);
    return data[0];
  } catch (error) {
    console.error('[TRANSACTION_LOGGER] Exception:', error);
    return null;
  }
}

/**
 * บันทึกประวัติการบันทึก BMI
 */
async function logBMIRecord(user_id, bmiData, req = null) {
  return await logTransaction({
    user_id,
    transaction_type: 'bmi_record',
    action: 'บันทึกข้อมูล BMI',
    description: `บันทึกข้อมูล BMI: ${bmiData.bmi} (${bmiData.category})`,
    metadata: {
      weight: bmiData.weight,
      height: bmiData.height,
      bmi: bmiData.bmi,
      category: bmiData.category,
      calories: bmiData.calories || null
    },
    status: 'completed',
    req
  });
}

/**
 * บันทึกประวัติการสแกนบาร์โค้ด
 */
async function logBarcodeScan(user_id, barcode, productData = null, req = null) {
  return await logTransaction({
    user_id,
    transaction_type: 'barcode_scan',
    action: 'สแกนบาร์โค้ด',
    description: productData 
      ? `สแกนบาร์โค้ด: ${barcode} - ${productData.name || 'ไม่พบชื่อสินค้า'}`
      : `สแกนบาร์โค้ด: ${barcode}`,
    metadata: {
      barcode: barcode,
      product_id: productData?.id || null,
      product_name: productData?.name || null,
      found: !!productData
    },
    status: productData ? 'completed' : 'failed',
    req
  });
}

/**
 * บันทึกประวัติการค้นหาอาหาร
 */
async function logFoodSearch(user_id, query, resultCount = 0, req = null) {
  return await logTransaction({
    user_id,
    transaction_type: 'food_search',
    action: 'ค้นหาอาหาร',
    description: `ค้นหาอาหาร: "${query}" - พบ ${resultCount} รายการ`,
    metadata: {
      query: query,
      result_count: resultCount
    },
    status: 'completed',
    req
  });
}

/**
 * บันทึกประวัติการอัปเดตโปรไฟล์
 */
async function logProfileUpdate(user_id, updateData, req = null) {
  return await logTransaction({
    user_id,
    transaction_type: 'profile_update',
    action: 'อัปเดตโปรไฟล์',
    description: 'อัปเดตข้อมูลโปรไฟล์ผู้ใช้',
    metadata: updateData,
    status: 'completed',
    req
  });
}

/**
 * บันทึกประวัติการเข้าสู่ระบบ
 */
async function logSignIn(user_id, req = null) {
  return await logTransaction({
    user_id,
    transaction_type: 'sign_in',
    action: 'เข้าสู่ระบบ',
    description: 'ผู้ใช้เข้าสู่ระบบสำเร็จ',
    metadata: null,
    status: 'completed',
    req
  });
}

/**
 * บันทึกประวัติการสมัครสมาชิก
 */
async function logSignUp(user_id, req = null) {
  return await logTransaction({
    user_id,
    transaction_type: 'sign_up',
    action: 'สมัครสมาชิก',
    description: 'ผู้ใช้สมัครสมาชิกสำเร็จ',
    metadata: null,
    status: 'completed',
    req
  });
}

module.exports = {
  logTransaction,
  logBMIRecord,
  logBarcodeScan,
  logFoodSearch,
  logProfileUpdate,
  logSignIn,
  logSignUp
};


