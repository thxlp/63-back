-- ==========================================
-- ADD CREATED_AT COLUMN TO BMI_RECORDS - เพิ่ม column created_at
-- ==========================================
-- ใช้ใน Supabase SQL Editor
-- ==========================================
-- Script นี้จะเพิ่ม column created_at ถ้ายังไม่มี
-- และอัปเดตข้อมูลเก่าให้มี created_at จาก date หรือ NOW()
-- ==========================================

-- 1. ตรวจสอบว่า column created_at มีอยู่หรือไม่
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bmi_records'
    AND column_name = 'created_at'
  ) THEN
    -- เพิ่ม column created_at
    ALTER TABLE bmi_records
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- อัปเดตข้อมูลเก่าให้มี created_at เป็น NOW()
    -- (ไม่ใช้ date เพราะอาจไม่มี column นี้)
    UPDATE bmi_records
    SET created_at = NOW()
    WHERE created_at IS NULL;

    -- สร้าง index สำหรับ created_at
    CREATE INDEX IF NOT EXISTS idx_bmi_records_created_at ON bmi_records(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bmi_records_user_created_at ON bmi_records(user_id, created_at DESC);

    RAISE NOTICE '✅ Column created_at added successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Column created_at already exists';
  END IF;
END $$;

-- 2. ตรวจสอบ columns ทั้งหมดใน table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'bmi_records'
ORDER BY ordinal_position;

-- 3. ตรวจสอบว่า created_at มีข้อมูลครบหรือไม่
SELECT 
  COUNT(*) as total_records,
  COUNT(created_at) as records_with_created_at
FROM bmi_records;

