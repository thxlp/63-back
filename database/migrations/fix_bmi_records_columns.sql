-- ==========================================
-- FIX BMI_RECORDS COLUMNS - แก้ไขและเพิ่ม columns ที่จำเป็น
-- ==========================================
-- ใช้ใน Supabase SQL Editor
-- ==========================================
-- Script นี้จะ:
-- 1. เพิ่ม column created_at ถ้ายังไม่มี
-- 2. เพิ่ม column date ถ้ายังไม่มี
-- 3. อัปเดตข้อมูลให้ครบถ้วน
-- ==========================================

-- 1. เพิ่ม column created_at ถ้ายังไม่มี
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bmi_records'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE bmi_records
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- อัปเดตข้อมูลเก่าให้มี created_at เป็น NOW()
    UPDATE bmi_records
    SET created_at = NOW()
    WHERE created_at IS NULL;

    RAISE NOTICE '✅ Column created_at added successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Column created_at already exists';
  END IF;
END $$;

-- 2. เพิ่ม column date ถ้ายังไม่มี
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bmi_records'
    AND column_name = 'date'
  ) THEN
    ALTER TABLE bmi_records
    ADD COLUMN date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- อัปเดตข้อมูลเก่าให้มี date จาก created_at (ถ้ามี) หรือ NOW()
    UPDATE bmi_records
    SET date = COALESCE(created_at, NOW())
    WHERE date IS NULL;

    RAISE NOTICE '✅ Column date added successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Column date already exists';
  END IF;
END $$;

-- 3. อัปเดตข้อมูลที่ยังไม่มี created_at หรือ date
UPDATE bmi_records
SET 
  created_at = COALESCE(created_at, NOW()),
  date = COALESCE(date, created_at, NOW())
WHERE created_at IS NULL OR date IS NULL;

-- 4. สร้าง indexes สำหรับ created_at (ถ้ายังไม่มี)
CREATE INDEX IF NOT EXISTS idx_bmi_records_created_at ON bmi_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bmi_records_user_created_at ON bmi_records(user_id, created_at DESC);

-- 5. ตรวจสอบ columns ทั้งหมดใน table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'bmi_records'
ORDER BY ordinal_position;

-- 6. ตรวจสอบข้อมูล
SELECT 
  COUNT(*) as total_records,
  COUNT(created_at) as records_with_created_at,
  COUNT(date) as records_with_date
FROM bmi_records;

-- ==========================================
-- สรุป:
-- ==========================================
-- ✅ เพิ่ม column created_at (ถ้ายังไม่มี)
-- ✅ เพิ่ม column date (ถ้ายังไม่มี)
-- ✅ อัปเดตข้อมูลให้ครบถ้วน
-- ✅ สร้าง indexes
-- ==========================================


