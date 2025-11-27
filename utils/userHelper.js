const { supabaseAdmin } = require('../config/supabase');

/**
 * ตรวจสอบว่า user_id เป็น UUID หรือ integer
 * @param {string|number} user_id 
 * @returns {Object} { isUUID: boolean, isInteger: boolean, normalizedId: string|number }
 */
function normalizeUserId(user_id) {
  if (!user_id) {
    return { isUUID: false, isInteger: false, normalizedId: null };
  }

  // ถ้าเป็น number หรือ string ที่เป็นตัวเลข
  if (typeof user_id === 'number' || (typeof user_id === 'string' && /^\d+$/.test(user_id))) {
    return {
      isUUID: false,
      isInteger: true,
      normalizedId: typeof user_id === 'number' ? user_id : parseInt(user_id)
    };
  }

  // ถ้าเป็น string ที่มีรูปแบบ UUID (มี -)
  if (typeof user_id === 'string' && user_id.includes('-')) {
    return {
      isUUID: true,
      isInteger: false,
      normalizedId: user_id
    };
  }

  // Default: ถือว่าเป็น string (อาจเป็น UUID ที่ไม่มี - หรือเป็น string อื่น)
  return {
    isUUID: false,
    isInteger: false,
    normalizedId: String(user_id)
  };
}

/**
 * ตรวจสอบว่า user_id มีอยู่จริงใน database
 * @param {string|number} user_id 
 * @returns {Promise<{exists: boolean, user: any, error: any}>}
 */
async function checkUserExists(user_id) {
  try {
    const { isUUID, isInteger, normalizedId } = normalizeUserId(user_id);

    // ลองตรวจสอบใน users table ก่อน
    let query = supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', normalizedId);

    const { data: userData, error: userError } = await query.single();

    if (userData && !userError) {
      return {
        exists: true,
        user: userData,
        error: null
      };
    }

    // ถ้าไม่พบใน users table และเป็น UUID ลองตรวจสอบใน auth.users
    if (isUUID) {
      try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(normalizedId);
        
        if (user && !authError) {
          return {
            exists: true,
            user: { id: user.id },
            error: null
          };
        }
      } catch (authError) {
        // Ignore auth error
      }
    }

    // ถ้าไม่พบทั้งใน users และ auth.users
    return {
      exists: false,
      user: null,
      error: userError || { message: 'User not found' }
    };
  } catch (error) {
    console.error('[userHelper] Error checking user:', error);
    return {
      exists: false,
      user: null,
      error: error
    };
  }
}

/**
 * URL decode user_id จาก query parameter
 * @param {string} user_id 
 * @returns {string}
 */
function decodeUserId(user_id) {
  if (!user_id) return null;
  
  try {
    return decodeURIComponent(String(user_id));
  } catch (error) {
    // ถ้า decode ไม่ได้ ให้ใช้ค่าเดิม
    return String(user_id);
  }
}

module.exports = {
  normalizeUserId,
  checkUserExists,
  decodeUserId
};


