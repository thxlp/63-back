// ==========================================
// TEST DATABASE CONNECTION - ทดสอบการเชื่อมต่อ Database
// ==========================================
// รัน: node test_database_connection.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('========================================');
console.log('🔍 Testing Database Connection');
console.log('========================================\n');

// ตรวจสอบ environment variables
console.log('1. Checking environment variables...');
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set!');
  process.exit(1);
}
if (!supabaseAnonKey) {
  console.error('❌ SUPABASE_ANON_KEY is not set!');
  process.exit(1);
}
if (!supabaseServiceRoleKey) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY is not set!');
  console.warn('⚠️  RLS policies may block operations!\n');
} else {
  console.log('✅ All environment variables are set\n');
}

// สร้าง clients
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('2. Testing table access...\n');

// ทดสอบการเข้าถึง table ด้วย anon key
async function testAnonKey() {
  console.log('📋 Testing with ANON_KEY...');
  try {
    const { data, error } = await supabaseClient
      .from('bmi_records')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ ANON_KEY Error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      return false;
    } else {
      console.log('✅ ANON_KEY: Can access table');
      console.log('   Records found:', data?.length || 0);
      return true;
    }
  } catch (err) {
    console.error('❌ ANON_KEY Exception:', err.message);
    return false;
  }
}

// ทดสอบการเข้าถึง table ด้วย service role key
async function testServiceRoleKey() {
  console.log('\n📋 Testing with SERVICE_ROLE_KEY...');
  try {
    const { data, error } = await supabaseAdmin
      .from('bmi_records')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ SERVICE_ROLE_KEY Error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      return false;
    } else {
      console.log('✅ SERVICE_ROLE_KEY: Can access table');
      console.log('   Records found:', data?.length || 0);
      return true;
    }
  } catch (err) {
    console.error('❌ SERVICE_ROLE_KEY Exception:', err.message);
    return false;
  }
}

// ทดสอบการ insert ข้อมูล
async function testInsert() {
  console.log('\n📋 Testing INSERT operation...');
  
  if (!supabaseServiceRoleKey) {
    console.warn('⚠️  Skipping INSERT test - SERVICE_ROLE_KEY not set');
    return false;
  }

  try {
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000', // test user_id
      weight: 70.5,
      height: 175.0,
      bmi: 23.02,
      category: 'normal',
      calories: 2000
    };

    console.log('   Attempting to insert test data...');
    const { data, error } = await supabaseAdmin
      .from('bmi_records')
      .insert([testData])
      .select();

    if (error) {
      console.error('❌ INSERT Error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        console.error('\n💡 Possible solutions:');
        console.error('   1. Check if RLS is enabled and blocking service role');
        console.error('   2. Run fix_bmi_records_table.sql in Supabase SQL Editor');
        console.error('   3. Verify SERVICE_ROLE_KEY is correct');
      }
      
      return false;
    } else {
      console.log('✅ INSERT: Success');
      console.log('   Inserted record ID:', data[0]?.id);
      
      // ลบข้อมูลทดสอบ
      if (data[0]?.id) {
        await supabaseAdmin
          .from('bmi_records')
          .delete()
          .eq('id', data[0].id);
        console.log('   Test record deleted');
      }
      
      return true;
    }
  } catch (err) {
    console.error('❌ INSERT Exception:', err.message);
    return false;
  }
}

// รันการทดสอบทั้งหมด
async function runTests() {
  const results = {
    anonKey: false,
    serviceRoleKey: false,
    insert: false
  };

  results.anonKey = await testAnonKey();
  results.serviceRoleKey = await testServiceRoleKey();
  results.insert = await testInsert();

  console.log('\n========================================');
  console.log('📊 Test Results Summary');
  console.log('========================================');
  console.log('ANON_KEY Access:', results.anonKey ? '✅ PASS' : '❌ FAIL');
  console.log('SERVICE_ROLE_KEY Access:', results.serviceRoleKey ? '✅ PASS' : '❌ FAIL');
  console.log('INSERT Operation:', results.insert ? '✅ PASS' : '❌ FAIL');
  console.log('========================================\n');

  if (!results.serviceRoleKey || !results.insert) {
    console.log('💡 Recommendations:');
    console.log('   1. Verify SUPABASE_SERVICE_ROLE_KEY in .env file');
    console.log('   2. Run fix_bmi_records_table.sql in Supabase SQL Editor');
    console.log('   3. Check Supabase Dashboard > Settings > API for correct keys');
    console.log('   4. Ensure RLS is disabled or policies allow service role access\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Database connection is working correctly.\n');
    process.exit(0);
  }
}

// เริ่มการทดสอบ
runTests().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

