const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();

// Get data from table
router.get('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const { data, error, count } = await supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

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

module.exports = router;
