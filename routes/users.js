const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/profile', async (req, res) => {
  try {
    const { user_id } = req.query;

    // Log เพื่อ debug
    console.log('[USERS /profile] Request:', {
      hasUserId: !!user_id,
      query: req.query
    });

    if (!user_id) {
      console.log('[USERS /profile] Missing user_id');
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id ใน query parameter',
        example: '/api/users/profile?user_id=your-user-id'
      });
    }

    // ดึงข้อมูล user จาก users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    // ดึงข้อมูล BMI ทั้งหมดของ user
    const { data: bmiRecords, error: bmiError } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', user_id)
      .order('id', { ascending: false }); // ใช้ id แทน created_at (รองรับทุกกรณี)

    // Format response - Format 1: ส่งข้อมูลโดยตรง (ตรงตามข้อกำหนด)
    const latestBmi = bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null;

    // Format 1: ส่งข้อมูลโดยตรง (ตรงตามข้อกำหนด)
    // เพิ่ม user_id และ id เพื่อให้ frontend เข้าถึงได้ง่าย
    const response = {
      id: user_id, // เพิ่ม id (สำหรับ frontend)
      user_id: user_id, // เพิ่ม user_id (สำหรับ frontend)
      username: userData?.email || null,
      email: userData?.email || null,
      weight: latestBmi?.weight ? Number(latestBmi.weight) : null,
      height: latestBmi?.height ? Number(latestBmi.height) : null,
      bmi: latestBmi?.bmi ? Number(latestBmi.bmi) : null,
      calories: latestBmi?.calories ? Number(latestBmi.calories) : null
    };

    console.log('[USERS /profile] Response:', {
      userId: user_id,
      hasEmail: !!response.email,
      hasBmi: !!latestBmi,
      hasWeight: !!response.weight
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in /user/profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user profile (POST method)
router.post('/profile', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ user_id'
      });
    }

    // ดึงข้อมูล user จาก users table
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    // ดึงข้อมูล BMI ทั้งหมดของ user
    const { data: bmiRecords } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', user_id)
      .order('id', { ascending: false }); // ใช้ id แทน created_at (รองรับทุกกรณี)

    const latestBmi = bmiRecords && bmiRecords.length > 0 ? bmiRecords[0] : null;

    const response = {
      success: true,
      user: userData || {
        id: user_id,
        email: null,
        full_name: null,
        avatar_url: null
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
    };

    res.json(response);
  } catch (error) {
    console.error('Error in POST /user/profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/', async (req, res) => {
  try {
    const { id, email, full_name, avatar_url } = req.body;

    if (!id || !email) {
      return res.status(400).json({ error: 'ID and email are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{
        id,
        email,
        full_name,
        avatar_url
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabaseAdmin
      .from('users')
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


router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
