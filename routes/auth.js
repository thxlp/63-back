const express = require('express');
const { supabaseClient, supabaseAdmin } = require('../config/supabase');
const { logBMIRecord, logSignUp, logSignIn } = require('../utils/transactionLogger');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and User Management
 */

// Helper function to calculate BMI
function calculateBMI(weight, height) {
  // height should be in meters, weight in kg
  // If height is in cm, convert to meters
  const heightInMeters = height > 10 ? height / 100 : height;
  const bmi = weight / (heightInMeters * heightInMeters);
  return parseFloat(bmi.toFixed(2));
}

// Helper function to get BMI category
function getBMICategory(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

// Get BMI data by user_id (GET method)
/**
 * @swagger
 * /api/auth/signup:
 *   get:
 *     summary: Get user BMI data by user_id
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to fetch BMI data for
 *     responses:
 *       200:
 *         description: User BMI data retrieved successfully
 *       400:
 *         description: Missing user_id
 *       500:
 *         description: Server error
 */
router.get('/signup', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id ใน query parameter',
        example: '/api/auth/signup?user_id=your-user-id'
      });
    }

    // ดึงข้อมูล user จาก users table (ถ้ามี)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    // ดึงข้อมูล BMI ทั้งหมดของ user
    // ใช้ date แทน created_at ถ้า created_at ไม่มี (รองรับทั้งสองกรณี)
    const { data: bmiRecords, error: bmiError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', user_id)
      .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี) // ใช้ date แทน created_at

    if (bmiError) {
      console.error('Error fetching BMI:', bmiError);
    }

    // Format response สำหรับหน้าบ้าน
    const latestBmi = bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null;

    return res.json({
      success: true,
      user: {
        id: user_id,
        email: userData?.email || null,
        username: userData?.email || null,
        full_name: userData?.full_name || null,
        avatar_url: userData?.avatar_url || null
      },
      profile: {
        weight: latestBmi?.weight || null,
        height: latestBmi?.height || null,
        bmi: latestBmi?.bmi || null,
        category: latestBmi?.category || null,
        calories: latestBmi?.calories || null
      },
      bmi_history: {
        latest: latestBmi,
        all: bmiRecords || [],
        count: bmiRecords?.length || 0
      }
    });
  } catch (error) {
    console.error('Error getting BMI:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check bmi_records table status
/**
 * @swagger
 * /api/auth/check-table:
 *   get:
 *     summary: Check if BMI table exists (Admin Utility)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Table status
 *       500:
 *         description: Server error
 */
router.get('/check-table', async (req, res) => {
  try {
    console.log('[AUTH /check-table] Checking bmi_records table...');

    // ลอง query table เพื่อดูว่ามีอยู่หรือไม่
    const { data, error } = await supabaseAdmin
      .from('bmi_records')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('[AUTH /check-table] ❌ Table error:', error);
      return res.status(500).json({
        success: false,
        error: 'Table check failed',
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    console.log('[AUTH /check-table] ✅ Table exists');

    // ลอง query ข้อมูลจริง
    const { data: records, error: recordsError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .limit(1);

    return res.json({
      success: true,
      table_exists: true,
      message: 'bmi_records table exists and accessible',
      sample_count: data?.length || 0,
      sample_record: records?.[0] || null
    });
  } catch (error) {
    console.error('[AUTH /check-table] ❌ Exception:', error);
    return res.status(500).json({
      success: false,
      error: 'Exception occurred',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Sign Up with BMI registration and Get BMI data
// สามารถใช้สำหรับ signup หรือดึงข้อมูล BMI ของ user ที่มีอยู่แล้ว
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user with BMI data
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - weight
 *               - height
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               weight:
 *                 type: number
 *               height:
 *                 type: number
 *               calories:
 *                 type: number
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input or missing fields
 *       500:
 *         description: Server error
 */
router.post('/signup', async (req, res) => {
  try {
    console.log('[AUTH /signup] Signup request:', {
      hasEmail: !!req.body.email,
      hasPassword: !!req.body.password,
      hasWeight: !!req.body.weight,
      hasHeight: !!req.body.height,
      hasCalories: !!req.body.calories
    });

    const { email, password, weight, height, calories, user_id, action } = req.body;

    // ถ้ามี user_id และ action = 'get' หรือ 'get_bmi' → ดึงข้อมูล BMI
    if (user_id && (action === 'get' || action === 'get_bmi')) {
      const { data: bmiRecords, error: bmiError } = await supabaseAdmin
        .from('bmi_records')
        .select('*')
        .eq('user_id', user_id)
        .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

      if (bmiError) {
        return res.status(400).json({
          success: false,
          error: bmiError.message
        });
      }

      return res.json({
        success: true,
        user_id: user_id,
        bmi: {
          latest: bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null,
          all: bmiRecords || [],
          count: bmiRecords?.length || 0
        }
      });
    }

    // Validate required fields for signup
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Sign up user
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // If BMI data is provided, register it
    if (data.user && (weight || height)) {
      console.log('[AUTH /signup] BMI data provided:', { weight, height, calories });

      // Validate BMI required fields
      if (!weight || !height) {
        console.log('[AUTH /signup] Missing weight or height');
        return res.status(400).json({
          success: false,
          error: 'กรุณากรอกข้อมูล weight และ height ให้ครบถ้วน',
          user: data.user
        });
      }

      // Validate data types
      const weightNum = parseFloat(weight);
      const heightNum = parseFloat(height);

      if (isNaN(weightNum) || weightNum <= 0) {
        console.log('[AUTH /signup] Invalid weight:', weight);
        return res.status(400).json({
          success: false,
          error: 'น้ำหนักต้องเป็นตัวเลขที่มากกว่า 0'
        });
      }

      if (isNaN(heightNum) || heightNum <= 0) {
        console.log('[AUTH /signup] Invalid height:', height);
        return res.status(400).json({
          success: false,
          error: 'ส่วนสูงต้องเป็นตัวเลขที่มากกว่า 0'
        });
      }

      // Validate calories if provided
      let caloriesNum = null;
      if (calories !== undefined && calories !== null) {
        caloriesNum = parseFloat(calories);
        if (isNaN(caloriesNum) || caloriesNum < 0) {
          console.log('[AUTH /signup] Invalid calories:', calories);
          return res.status(400).json({
            success: false,
            error: 'แคลอรี่ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0'
          });
        }
      }

      // Calculate BMI
      const bmi = calculateBMI(weightNum, heightNum);
      const category = getBMICategory(bmi);

      console.log('[AUTH /signup] Calculated BMI:', { bmi, category });

      // Prepare BMI data for insertion
      // ตรวจสอบ data types ให้แน่ใจว่าเป็น number ไม่ใช่ string
      // ไม่ส่ง date เพราะ table มี default NOW() หรือใช้ created_at แทน
      const bmiData = {
        user_id: data.user.id,
        weight: Number(weightNum),
        height: Number(heightNum),
        bmi: Number(bmi),
        category: String(category)
        // ไม่ส่ง date - table จะใช้ default NOW() หรือ created_at
      };

      // Add calories if provided (ต้องเป็น number หรือ null)
      if (caloriesNum !== null && caloriesNum !== undefined) {
        bmiData.calories = Number(caloriesNum);
      }

      console.log('[AUTH /signup] Inserting BMI data:', JSON.stringify(bmiData, null, 2));
      console.log('[AUTH /signup] User ID:', data.user.id);
      console.log('[AUTH /signup] BMI Data Types:', {
        user_id: typeof bmiData.user_id,
        weight: typeof bmiData.weight,
        height: typeof bmiData.height,
        bmi: typeof bmiData.bmi,
        category: typeof bmiData.category,
        calories: typeof bmiData.calories
      });

      // Insert BMI record into Supabase
      // ใช้ supabaseAdmin (service role key) เพื่อ bypass RLS
      console.log('[AUTH /signup] Attempting to insert BMI data:', JSON.stringify(bmiData, null, 2));
      console.log('[AUTH /signup] Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

      // ตรวจสอบว่า table มีอยู่จริงก่อน insert
      const { data: tableCheck, error: tableCheckError } = await supabaseAdmin
        .from('bmi_records')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        console.error('[AUTH /signup] ❌ Cannot access bmi_records table:', tableCheckError);
        console.error('[AUTH /signup] Error Code:', tableCheckError.code);
        console.error('[AUTH /signup] Error Message:', tableCheckError.message);

        if (tableCheckError.code === 'PGRST205') {
          return res.status(500).json({
            success: false,
            message: 'Table bmi_records does not exist',
            error: 'Please create the table first by running fix_bmi_records_table.sql in Supabase SQL Editor',
            table_error: tableCheckError.message
          });
        }
      } else {
        console.log('[AUTH /signup] ✅ Table bmi_records is accessible');
      }

      const { data: bmiRecord, error: bmiError } = await supabaseAdmin
        .from('bmi_records')
        .insert([bmiData])
        .select();

      if (bmiError) {
        console.error('[AUTH /signup] ❌ BMI Insert Error:', JSON.stringify(bmiError, null, 2));
        console.error('[AUTH /signup] Error Code:', bmiError.code);
        console.error('[AUTH /signup] Error Message:', bmiError.message);
        console.error('[AUTH /signup] Error Details:', bmiError.details);
        console.error('[AUTH /signup] Error Hint:', bmiError.hint);

        // ลองตรวจสอบ table ก่อน
        const { data: tableCheck, error: tableError } = await supabaseAdmin
          .from('bmi_records')
          .select('id')
          .limit(1);

        if (tableError) {
          console.error('[AUTH /signup] ❌ Table access error:', tableError);
          return res.status(500).json({
            success: false,
            message: 'User created successfully, but BMI table is not accessible',
            user: data.user,
            table_error: tableError.message,
            table_error_code: tableError.code,
            suggestion: 'กรุณาตรวจสอบว่า table bmi_records มีอยู่และสามารถเข้าถึงได้'
          });
        }

        // Return user data even if BMI registration fails
        return res.status(201).json({
          success: true,
          message: 'User created successfully, but BMI registration failed',
          user: data.user,
          bmi_error: bmiError.message,
          bmi_error_code: bmiError.code,
          bmi_error_details: bmiError.details,
          bmi_error_hint: bmiError.hint,
          suggestion: 'กรุณาตรวจสอบ logs สำหรับรายละเอียดเพิ่มเติม'
        });
      }

      if (!bmiRecord || bmiRecord.length === 0) {
        console.error('[AUTH /signup] ❌ BMI record was not returned after insert');
        return res.status(201).json({
          success: true,
          message: 'User created successfully, but BMI record confirmation failed',
          user: data.user,
          warning: 'BMI data may have been inserted but could not be verified'
        });
      }

      console.log('[AUTH /signup] ✅ BMI data inserted successfully:', bmiRecord[0]?.id);
      console.log('[AUTH /signup] ✅ BMI record:', JSON.stringify(bmiRecord[0], null, 2));

      // ดึงข้อมูล BMI ทั้งหมดของ user (รวมถึงที่เพิ่งสร้าง)
      console.log('[AUTH /signup] Fetching all BMI records for user:', data.user.id);
      const { data: allBmiRecords, error: fetchBmiError } = await supabaseAdmin
        .from('bmi_records')
        .select('*')
        .eq('user_id', data.user.id)
        .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

      if (fetchBmiError) {
        console.error('[AUTH /signup] Error fetching BMI records:', fetchBmiError);
      } else {
        console.log('[AUTH /signup] Found BMI records:', allBmiRecords?.length || 0);
      }

      // ดึงข้อมูล user จาก users table (ถ้ามี)
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const latestBmi = bmiRecord[0];

      // Format response สำหรับหน้าบ้าน
      // เพิ่ม id และ user_id ใน top level เพื่อให้ frontend เข้าถึงได้ง่าย
      const response = {
        success: true,
        message: 'User created successfully with BMI data',
        // เพิ่ม id และ user_id ใน top level
        id: data.user.id,
        user_id: data.user.id,
        user: {
          id: data.user.id,
          user_id: data.user.id,
          email: data.user.email,
          username: data.user.email,
          full_name: userData?.full_name || null,
          avatar_url: userData?.avatar_url || null,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at
        },
        profile: {
          weight: latestBmi.weight,
          height: latestBmi.height,
          bmi: latestBmi.bmi,
          category: latestBmi.category,
          calories: latestBmi.calories || null
        },
        // เพิ่มข้อมูล profile ใน top level
        weight: latestBmi.weight,
        height: latestBmi.height,
        bmi: latestBmi.bmi,
        calories: latestBmi.calories || null,
        bmi_history: {
          latest: latestBmi,
          all: allBmiRecords || [latestBmi],
          count: allBmiRecords?.length || 1
        }
      };

      console.log('[AUTH /signup] ✅ Sending response with user_id:', data.user.id);

      // บันทึกประวัติการทำรายการ
      await logSignUp(data.user.id, req);
      await logBMIRecord(data.user.id, latestBmi, req);

      return res.status(201).json(response);
    }

    // ถ้าไม่มีการส่ง BMI data แต่ user มี BMI records อยู่แล้ว ให้ดึงมาแสดงด้วย
    if (data.user) {
      const { data: existingBmiRecords } = await supabaseAdmin
        .from('bmi_records')
        .select('*')
        .eq('user_id', data.user.id)
        .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

      // ดึงข้อมูล user จาก users table (ถ้ามี)
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const latestBmi = existingBmiRecords && existingBmiRecords.length > 0 ? existingBmiRecords[0] : null;

      // Format response สำหรับหน้าบ้าน
      const response = {
        success: true,
        message: 'User created successfully',
        // เพิ่ม id และ user_id ใน top level
        id: data.user.id,
        user_id: data.user.id,
        user: {
          id: data.user.id,
          user_id: data.user.id,
          email: data.user.email,
          username: data.user.email,
          full_name: userData?.full_name || null,
          avatar_url: userData?.avatar_url || null,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at
        },
        profile: {
          weight: latestBmi?.weight || null,
          height: latestBmi?.height || null,
          bmi: latestBmi?.bmi || null,
          category: latestBmi?.category || null,
          calories: latestBmi?.calories || null
        },
        // เพิ่มข้อมูล profile ใน top level
        weight: latestBmi?.weight || null,
        height: latestBmi?.height || null,
        bmi: latestBmi?.bmi || null,
        calories: latestBmi?.calories || null,
        bmi_history: {
          latest: latestBmi,
          all: existingBmiRecords || [],
          count: existingBmiRecords?.length || 0
        }
      };

      // บันทึกประวัติการทำรายการ (ไม่รอผลลัพธ์เพื่อไม่ให้ชะลอ response)
      logSignUp(data.user.id, req).catch(err => console.error('[AUTH /signup] Error logging signup:', err));

      return res.status(201).json(response);
    }

    // Format response สำหรับหน้าบ้าน
    const response = {
      success: true,
      message: 'User created successfully',
      // เพิ่ม id และ user_id ใน top level
      id: data.user.id,
      user_id: data.user.id,
      user: {
        id: data.user.id,
        user_id: data.user.id,
        email: data.user.email,
        username: data.user.email,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at
      },
      profile: {
        weight: null,
        height: null,
        bmi: null,
        category: null,
        calories: null
      },
      // เพิ่มข้อมูล profile ใน top level
      weight: null,
      height: null,
      bmi: null,
      calories: null,
      bmi_history: {
        latest: null,
        all: [],
        count: 0
      }
    };

    // บันทึกประวัติการทำรายการ (ไม่รอผลลัพธ์เพื่อไม่ให้ชะลอ response)
    logSignUp(data.user.id, req).catch(err => console.error('[AUTH /signup] Error logging signup:', err));

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sign In with BMI data
/**
 * @swagger
 * /api/auth/signin:
 *   post:
 *     summary: Sign in user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 session:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/signin', async (req, res) => {
  try {
    // Debug: log request body และ headers
    console.log('[AUTH /signin] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[AUTH /signin] Content-Type:', req.headers['content-type']);
    console.log('[AUTH /signin] Body keys:', Object.keys(req.body || {}));

    // รองรับทั้ง email, username, Email, Username field (case insensitive)
    const email = req.body?.email || req.body?.username || req.body?.Email || req.body?.Username || req.body?.user;
    const password = req.body?.password || req.body?.Password || req.body?.pass;

    // Trim และ validate
    const emailValue = email ? String(email).trim() : null;
    const passwordValue = password ? String(password) : null;

    if (!emailValue || !passwordValue) {
      console.log('[AUTH /signin] Missing fields - email:', !!emailValue, 'password:', !!passwordValue);
      console.log('[AUTH /signin] Received body:', req.body);
      console.log('[AUTH /signin] Received body keys:', Object.keys(req.body || {}));

      return res.status(400).json({
        success: false,
        error: 'Email และ Password จำเป็นต้องมี',
        error_en: 'Email and password are required',
        received: {
          has_email: !!emailValue,
          has_password: !!passwordValue,
          body_keys: Object.keys(req.body || {}),
          body_sample: req.body ? {
            first_key: Object.keys(req.body)[0],
            first_value: req.body[Object.keys(req.body)[0]]
          } : null
        },
        expected_format: {
          email: 'string',
          password: 'string'
        },
        example: {
          email: 'user@example.com',
          password: 'yourpassword'
        }
      });
    }

    // Normalize email และ password
    const normalizedEmail = emailValue.toLowerCase();
    const normalizedPassword = passwordValue;

    console.log('[AUTH /signin] Attempting login for:', normalizedEmail);

    // ลองใช้ supabaseClient ก่อน (ปกติ)
    let { data, error } = await supabaseClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword
    });

    // ถ้ามีปัญหาเรื่อง email confirmation ให้ลอง bypass ด้วย admin client
    if (error) {
      console.log('[AUTH /signin] Initial signin error:', error.message);
      console.log('[AUTH /signin] Error code:', error.status);

      // ถ้าเป็น email not confirmed หรือ invalid credentials ให้ลอง bypass
      if (error.message && (error.message.includes('Email not confirmed') ||
        error.message.includes('Invalid login credentials') ||
        error.message.includes('invalid_credentials'))) {

        // ตรวจสอบว่า user มีอยู่ใน database หรือไม่
        try {
          console.log('[AUTH /signin] Checking user in database...');
          const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

          if (listError) {
            console.error('[AUTH /signin] Error listing users:', listError);
          } else {
            const existingUser = authUsers?.users?.find(u =>
              u.email?.toLowerCase() === normalizedEmail
            );

            if (existingUser) {
              console.log('[AUTH /signin] User found in database:', existingUser.id, existingUser.email);
              console.log('[AUTH /signin] Email confirmed:', !!existingUser.email_confirmed_at);

              // ถ้า email ยังไม่ confirm ให้ bypass confirmation
              if (!existingUser.email_confirmed_at) {
                console.log('[AUTH /signin] Email not confirmed, attempting to update user...');
                try {
                  // Update user to mark as confirmed
                  const updateResult = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                    email_confirm: true
                  });
                  console.log('[AUTH /signin] User email confirmed via admin:', updateResult.data?.user?.id);
                } catch (updateError) {
                  console.error('[AUTH /signin] Failed to confirm email:', updateError);
                }
              }

              // ลอง signin ด้วย admin client
              console.log('[AUTH /signin] Attempting signin with admin client...');
              const signInResult = await supabaseAdmin.auth.signInWithPassword({
                email: normalizedEmail,
                password: normalizedPassword
              });

              if (!signInResult.error && signInResult.data) {
                data = signInResult.data;
                error = null;
                console.log('[AUTH /signin] ✅ Signin successful with admin bypass');
              } else {
                console.error('[AUTH /signin] Admin signin also failed:', signInResult.error?.message);
              }
            } else {
              console.log('[AUTH /signin] User not found in auth.users');
            }
          }
        } catch (adminError) {
          console.error('[AUTH /signin] Admin operations failed:', adminError);
        }
      }
    }

    if (error) {
      console.error('Signin error:', error);

      // Handle specific errors
      let errorMessage = error.message;
      let errorCode = error.status || 400;

      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
        errorCode = 403;
      } else if (error.message.includes('User not found')) {
        errorMessage = 'ไม่พบผู้ใช้งานในระบบ';
      }

      return res.status(errorCode).json({
        success: false,
        error: errorMessage,
        error_code: error.status,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // ตรวจสอบว่า user และ session มีอยู่จริง
    if (!data || !data.user || !data.session) {
      return res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ - ไม่ได้รับข้อมูล user หรือ session'
      });
    }

    console.log('User signed in successfully:', data.user.id, data.user.email);

    // ดึงข้อมูล BMI ทั้งหมดของ user
    console.log('[AUTH /signin] Fetching BMI records for user:', data.user.id);
    const { data: bmiRecords, error: bmiError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', data.user.id)
      .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

    if (bmiError) {
      console.error('[AUTH /signin] Error fetching BMI records:', bmiError);
      console.error('[AUTH /signin] BMI Error code:', bmiError.code);
      console.error('[AUTH /signin] BMI Error message:', bmiError.message);
    } else {
      console.log('[AUTH /signin] Found BMI records:', bmiRecords?.length || 0);
    }

    // ดึงข้อมูล user จาก users table (ถ้ามี)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Format response สำหรับหน้าบ้าน - รวมข้อมูลทั้งหมดในระดับ top level
    const latestBmi = bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null;

    // สร้าง response หลายรูปแบบเพื่อรองรับการเข้าถึงข้อมูล
    const response = {
      success: true,
      message: 'Sign in successful',

      // User data (top level - สำหรับ localStorage)
      // รวมข้อมูล weight, height, bmi, calories ใน user object เพื่อให้เข้าถึงง่าย
      user: {
        id: data.user.id,
        email: data.user.email,
        username: data.user.email, // สำหรับหน้าบ้าน
        full_name: userData?.full_name || null,
        avatar_url: userData?.avatar_url || null,
        // เพิ่มข้อมูล BMI ใน user object เพื่อให้เข้าถึงได้ง่าย
        weight: latestBmi?.weight || null,
        height: latestBmi?.height || null,
        bmi: latestBmi?.bmi || null,
        bmi_category: latestBmi?.category || null,
        category: latestBmi?.category || null,
        calories: latestBmi?.calories || null,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at
      },

      // สำหรับ backward compatibility - ให้เข้าถึงได้หลายแบบ
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          username: data.user.email,
          full_name: userData?.full_name || null,
          avatar_url: userData?.avatar_url || null,
          weight: latestBmi?.weight || null,
          height: latestBmi?.height || null,
          bmi: latestBmi?.bmi || null,
          category: latestBmi?.category || null,
          calories: latestBmi?.calories || null
        }
      },

      // Profile data (top level - สำหรับเข้าถึงง่าย)
      profile: {
        weight: latestBmi?.weight || null,
        height: latestBmi?.height || null,
        bmi: latestBmi?.bmi || null,
        category: latestBmi?.category || null,
        calories: latestBmi?.calories || null
      },

      // Session data
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type
      },

      // BMI history
      bmi_history: {
        latest: latestBmi,
        all: bmiRecords || [],
        count: bmiRecords?.length || 0
      },

      // สำหรับ backward compatibility
      bmi: {
        latest: latestBmi,
        all: bmiRecords || [],
        count: bmiRecords?.length || 0
      }
    };

    // เพิ่มข้อมูล weight, height, bmi, calories ในระดับ top level (สำหรับเข้าถึงง่าย)
    response.weight = latestBmi?.weight || null;
    response.height = latestBmi?.height || null;
    response.bmi_value = latestBmi?.bmi || null;
    response.bmi_category = latestBmi?.category || null;
    response.calories = latestBmi?.calories || null;

    // เพิ่ม user_id และ id ในระดับ top level (สำคัญสำหรับ frontend)
    // เพื่อให้ frontend สามารถเข้าถึงได้ง่าย: response.id หรือ response.user_id
    response.id = data.user.id;
    response.user_id = data.user.id;

    // เพิ่ม user_id ใน user object (backward compatibility)
    if (response.user && !response.user.user_id) {
      response.user.user_id = data.user.id;
    }

    // เพิ่ม user_id ใน data.user object (backward compatibility)
    if (response.data && response.data.user && !response.data.user.user_id) {
      response.data.user.user_id = data.user.id;
    }

    // บันทึกประวัติการทำรายการ
    await logSignIn(data.user.id, req);

    res.json(response);
  } catch (error) {
    console.error('Error in signin:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sign Out
/**
 * @swagger
 * /api/auth/signout:
 *   post:
 *     summary: Sign out user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sign out successful
 *       400:
 *         description: Sign out failed
 *       500:
 *         description: Server error
 */
router.post('/signout', async (req, res) => {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Sign out successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User Profile - รองรับ Bearer Token หรือ user_id (GET method)
// Format 1: ส่งข้อมูลโดยตรง (แนะนำ)
/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile and BMI (Support Bearer Token or Query Param)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: Optional user_id if not using Bearer Token
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/profile', async (req, res) => {
  try {
    let userId = null;

    // Option A: ตรวจสอบ Bearer Token (แนะนำ)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
        if (!userError && user) {
          userId = user.id;
          console.log('[AUTH /profile] Authenticated via Bearer Token:', userId);
        } else {
          // Token ไม่ถูกต้อง แต่ยังไม่ return error ตอนนี้ (ให้ลอง user_id แทน)
          console.log('[AUTH /profile] Invalid token, trying user_id fallback');
        }
      } catch (tokenError) {
        console.log('[AUTH /profile] Token verification failed, trying user_id fallback');
      }
    }

    // Option B: ใช้ user_id จาก query parameter (backward compatibility)
    if (!userId) {
      userId = req.query.user_id;
      if (!userId) {
        // ถ้าไม่มีทั้ง token และ user_id ให้ลองดึงจาก body หรือ return 401 พร้อม hint
        userId = req.body?.user_id;
        if (!userId) {
          // Log เพื่อ debug
          console.log('[AUTH /profile] No authentication - missing token and user_id');
          console.log('[AUTH /profile] Headers:', req.headers.authorization ? 'Has Authorization header' : 'No Authorization header');
          console.log('[AUTH /profile] Query:', req.query);
          console.log('[AUTH /profile] Body:', req.body);

          return res.status(401).json({
            error: 'Unauthorized',
            message: 'กรุณาระบุ Bearer Token หรือ user_id ใน query parameter',
            hint: 'ตรวจสอบว่า token ถูกต้องหรือไม่',
            example: '/api/auth/profile?user_id=your-user-id',
            suggestion: 'อาจต้อง login ใหม่'
          });
        }
      }
      console.log('[AUTH /profile] Using user_id:', userId);
    }

    // ดึงข้อมูล user จาก users table (ถ้ามี)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // ดึงข้อมูล user จาก auth.users (ถ้าไม่มีใน users table)
    let authUser = null;
    if (!userData) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
        authUser = user;
      } catch (e) {
        // ไม่พบ user ใน auth.users
      }
    }

    // ดึงข้อมูล BMI ล่าสุดของ user
    const { data: bmiRecords, error: bmiError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

    if (bmiError) {
      console.error('Error fetching BMI:', bmiError);
    }

    // Format response - Format 1: ส่งข้อมูลโดยตรง (แนะนำ)
    const latestBmi = bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null;

    // ดึง email จาก users table หรือ auth.users
    const email = userData?.email || authUser?.email || null;
    const username = userData?.email || authUser?.email || email || null;

    // Format 1: ส่งข้อมูลโดยตรง (ตรงตามข้อกำหนด)
    // ส่งข้อมูลแม้ว่าจะไม่มี BMI data ก็ตาม
    // เพิ่ม user_id และ id เพื่อให้ frontend เข้าถึงได้ง่าย
    const response = {
      id: userId, // เพิ่ม id (สำหรับ frontend)
      user_id: userId, // เพิ่ม user_id (สำหรับ frontend)
      username: username || null,
      email: email || null,
      weight: latestBmi?.weight ? Number(latestBmi.weight) : null,
      height: latestBmi?.height ? Number(latestBmi.height) : null,
      bmi: latestBmi?.bmi ? Number(latestBmi.bmi) : null,
      calories: latestBmi?.calories ? Number(latestBmi.calories) : null
    };

    // Log เพื่อ debug
    console.log('[AUTH /profile] Response:', {
      userId: userId,
      hasEmail: !!email,
      hasBmi: !!latestBmi,
      hasWeight: !!response.weight,
      hasHeight: !!response.height
    });

    // ตั้งค่า Content-Type header เป็น application/json
    res.setHeader('Content-Type', 'application/json');

    // ส่ง HTTP Status 200 OK
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in GET /profile:', error);
    console.error('Error stack:', error.stack);

    // ส่ง error response ที่เป็นมิตรกับ frontend
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'เกิดข้อผิดพลาดจาก server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get User Profile by user_id (POST method)
// Format 1: ส่งข้อมูลโดยตรง (ตรงตามข้อกำหนด)
/**
 * @swagger
 * /api/auth/profile:
 *   post:
 *     summary: Get user profile by user_id (POST method)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile data
 *       400:
 *         description: Missing user_id
 *       500:
 *         description: Server error
 */
router.post('/profile', async (req, res) => {
  try {
    let userId = req.body?.user_id || req.query?.user_id;

    // Log เพื่อ debug
    console.log('[AUTH POST /profile] Request body:', req.body);
    console.log('[AUTH POST /profile] Query:', req.query);

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'กรุณาระบุ user_id'
      });
    }

    // ดึงข้อมูล user จาก users table (ถ้ามี)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // ดึงข้อมูล user จาก auth.users (ถ้าไม่มีใน users table)
    let authUser = null;
    if (!userData) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
        authUser = user;
      } catch (e) {
        console.log('[AUTH POST /profile] User not found in auth.users:', e.message);
      }
    }

    // ดึงข้อมูล BMI ล่าสุดของ user
    const { data: bmiRecords, error: bmiError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

    if (bmiError) {
      console.error('[AUTH POST /profile] Error fetching BMI:', bmiError);
    }

    // Format response - Format 1: ส่งข้อมูลโดยตรง
    const latestBmi = bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null;
    const email = userData?.email || authUser?.email || null;
    const username = userData?.email || authUser?.email || email || null;

    // Format 1: ส่งข้อมูลโดยตรง (ตรงตามข้อกำหนด)
    // เพิ่ม user_id และ id เพื่อให้ frontend เข้าถึงได้ง่าย
    const response = {
      id: userId, // เพิ่ม id (สำหรับ frontend)
      user_id: userId, // เพิ่ม user_id (สำหรับ frontend)
      username: username || null,
      email: email || null,
      weight: latestBmi?.weight ? Number(latestBmi.weight) : null,
      height: latestBmi?.height ? Number(latestBmi.height) : null,
      bmi: latestBmi?.bmi ? Number(latestBmi.bmi) : null,
      calories: latestBmi?.calories ? Number(latestBmi.calories) : null
    };

    console.log('[AUTH POST /profile] Response:', {
      userId: userId,
      hasEmail: !!email,
      hasBmi: !!latestBmi,
      hasWeight: !!response.weight
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in POST /profile:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'เกิดข้อผิดพลาดจาก server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Current User with BMI data (requires Bearer token)
// Format 1: ส่งข้อมูลโดยตรง (แนะนำ)
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Log เพื่อ debug
      console.log('[AUTH /me] No authentication - missing Bearer token');
      console.log('[AUTH /me] Headers:', req.headers.authorization ? 'Has Authorization header' : 'No Authorization header');

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        hint: 'Please include: Authorization: Bearer YOUR_ACCESS_TOKEN',
        suggestion: 'อาจต้อง login ใหม่'
      });
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // ดึงข้อมูล BMI ล่าสุดของ user
    const { data: bmiRecords, error: bmiError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

    // ดึงข้อมูล user จาก users table (ถ้ามี)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (bmiError) {
      console.error('Error fetching BMI:', bmiError);
    }

    const latestBmi = bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null;
    const username = userData?.email || user.email || null;
    const email = user.email || null;

    // Format 1: ส่งข้อมูลโดยตรง (ตรงตามข้อกำหนด)
    // เพิ่ม user_id และ id เพื่อให้ frontend เข้าถึงได้ง่าย
    const response = {
      id: user.id, // เพิ่ม id (สำหรับ frontend)
      user_id: user.id, // เพิ่ม user_id (สำหรับ frontend)
      username: username,
      email: email,
      weight: latestBmi?.weight ? Number(latestBmi.weight) : null,
      height: latestBmi?.height ? Number(latestBmi.height) : null,
      bmi: latestBmi?.bmi ? Number(latestBmi.bmi) : null,
      calories: latestBmi?.calories ? Number(latestBmi.calories) : null
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in GET /me:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Get User Profile - Alternative endpoint (GET /api/auth/user)
// Format 1: ส่งข้อมูลโดยตรง - ใช้ logic เดียวกับ /profile
// รองรับ Bearer Token หรือ user_id
/**
 * @swagger
 * /api/auth/user:
 *   get:
 *     summary: Get user data (Alternative to /profile)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: Optional user_id
 *     responses:
 *       200:
 *         description: User data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/user', async (req, res) => {
  try {
    let userId = null;

    // Option A: ตรวจสอบ Bearer Token (แนะนำ)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
        if (!userError && user) {
          userId = user.id;
          console.log('[AUTH /user] Authenticated via Bearer Token:', userId);
        } else {
          console.log('[AUTH /user] Invalid token, trying user_id fallback');
        }
      } catch (tokenError) {
        console.log('[AUTH /user] Token verification failed, trying user_id fallback');
      }
    }

    // Option B: ใช้ user_id จาก query parameter (backward compatibility)
    if (!userId) {
      userId = req.query.user_id;
      if (!userId) {
        // ถ้าไม่มีทั้ง token และ user_id ให้ลองดึงจาก body หรือ return 401 พร้อม hint
        userId = req.body?.user_id;
        if (!userId) {
          // Log เพื่อ debug
          console.log('[AUTH /user] No authentication - missing token and user_id');
          console.log('[AUTH /user] Headers:', req.headers.authorization ? 'Has Authorization header' : 'No Authorization header');
          console.log('[AUTH /user] Query:', req.query);
          console.log('[AUTH /user] Body:', req.body);

          return res.status(401).json({
            error: 'Unauthorized',
            message: 'กรุณาระบุ Bearer Token หรือ user_id ใน query parameter',
            hint: 'ตรวจสอบว่า token ถูกต้องหรือไม่',
            example: '/api/auth/user?user_id=your-user-id',
            suggestion: 'อาจต้อง login ใหม่'
          });
        }
      }
      console.log('[AUTH /user] Using user_id:', userId);
    }

    // ดึงข้อมูล user จาก users table (ถ้ามี)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // ดึงข้อมูล user จาก auth.users (ถ้าไม่มีใน users table)
    let authUser = null;
    if (!userData) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
        authUser = user;
      } catch (e) {
        // ไม่พบ user
      }
    }

    // ดึงข้อมูล BMI ล่าสุดของ user
    const { data: bmiRecords, error: bmiError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

    if (bmiError) {
      console.error('Error fetching BMI:', bmiError);
    }

    // Format response - Format 1: ส่งข้อมูลโดยตรง
    const latestBmi = bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null;
    const email = userData?.email || authUser?.email || null;
    const username = userData?.email || authUser?.email || email || null;

    // Format 1: ส่งข้อมูลโดยตรง (ตรงตามข้อกำหนด)
    // เพิ่ม user_id และ id เพื่อให้ frontend เข้าถึงได้ง่าย
    const response = {
      id: userId, // เพิ่ม id (สำหรับ frontend)
      user_id: userId, // เพิ่ม user_id (สำหรับ frontend)
      username: username || null,
      email: email || null,
      weight: latestBmi?.weight ? Number(latestBmi.weight) : null,
      height: latestBmi?.height ? Number(latestBmi.height) : null,
      bmi: latestBmi?.bmi ? Number(latestBmi.bmi) : null,
      calories: latestBmi?.calories ? Number(latestBmi.calories) : null
    };

    // Log เพื่อ debug
    console.log('[AUTH /user] Response:', {
      userId: userId,
      hasEmail: !!email,
      hasBmi: !!latestBmi,
      hasWeight: !!response.weight,
      hasHeight: !!response.height
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in GET /user:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'เกิดข้อผิดพลาดจาก server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user data by user_id (alternative endpoint)
/**
 * @swagger
 * /api/auth/user/{userId}:
 *   get:
 *     summary: Get user data by ID path parameter
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User data
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // ดึงข้อมูล BMI โดยตรง (ไม่ต้องตรวจสอบ user ก่อน)
    const { data: bmiRecords, error: bmiError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

    // พยายามดึงข้อมูล user จาก users table (ถ้ามี)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return res.json({
      success: true,
      user: userData || {
        id: userId,
        note: 'User data not found in users table, but BMI records exist'
      },
      bmi: {
        latest: bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null,
        all: bmiRecords || [],
        count: bmiRecords?.length || 0
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user BMI data by user_id
/**
 * @swagger
 * /api/auth/bmi:
 *   post:
 *     summary: Fetch BMI records
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [get_all, get_latest]
 *                 default: get_all
 *     responses:
 *       200:
 *         description: BMI records
 *       400:
 *         description: Error
 *       500:
 *         description: Server error
 */
router.post('/bmi', async (req, res) => {
  try {
    const { user_id, action = 'get_all' } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'กรุณาระบุ user_id',
        success: false
      });
    }

    if (action === 'get_latest') {
      // ดึงข้อมูล BMI ล่าสุด
      const { data, error } = await supabaseAdmin
        .from('bmi_records')
        .select('*')
        .eq('user_id', user_id)
        .order('id', { ascending: false }) // ใช้ id แทน created_at (รองรับทุกกรณี)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'ไม่พบข้อมูล BMI สำหรับผู้ใช้รายนี้'
          });
        }
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      return res.json({
        success: true,
        data
      });
    } else {
      // ดึงข้อมูล BMI ทั้งหมด
      const { data, error, count } = await supabaseAdmin
        .from('bmi_records')
        .select('*', { count: 'exact' })
        .eq('user_id', user_id)
        .order('id', { ascending: false }); // ใช้ id แทน date/created_at (รองรับทุกกรณี)

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      return res.json({
        success: true,
        data: data || [],
        count: count || 0,
        latest: data && data.length > 0 ? data[0] : null
      });
    }
  } catch (error) {
    console.error('Error fetching BMI:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
