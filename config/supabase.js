const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase Client Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase clients
// สำหรับ Client-side operations (ใช้ anon key)
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// สำหรับ Server-side operations (ใช้ service role key)
// ⚠️ สำคัญ: Service Role Key จะ bypass RLS (Row Level Security)
// ถ้าไม่มี service role key จะ fallback เป็น anon key (อาจถูก RLS บล็อก)
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': 'backend-service'
      }
    }
  }
);

// ตรวจสอบว่า service role key ถูกตั้งค่าหรือไม่
if (!supabaseServiceRoleKey) {
  console.warn('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is not set!');
  console.warn('⚠️  Using ANON_KEY instead - RLS policies may block operations!');
  console.warn('⚠️  Please set SUPABASE_SERVICE_ROLE_KEY in .env file');
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY is configured');
}

module.exports = {
  supabaseClient,
  supabaseAdmin,
  supabaseUrl
};
