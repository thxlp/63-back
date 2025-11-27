const express = require('express');
const router = express.Router();

/**
 * Alternative endpoint สำหรับบันทึกข้อมูลแคลอรี่
 * POST /api/calorie_logs
 * 
 * ใช้ logic เดียวกับ /api/data/calorie_logs
 * โดยเรียกใช้ handler function จาก data.js
 */
router.post('/', async (req, res) => {
  // Import handler function จาก data.js
  const { handleCalorieLog } = require('./data');
  return handleCalorieLog(req, res);
});

module.exports = router;

