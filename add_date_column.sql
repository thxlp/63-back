-- ==========================================
-- ADD DATE COLUMN - เพิ่ม column date ให้ table bmi_records
-- ==========================================
-- ใช้ใน Supabase SQL Editor
-- ==========================================
-- ⚠️ หมายเหตุ: Code ถูกแก้ไขให้ใช้ created_at แทน date แล้ว
-- แต่ถ้าต้องการใช้ date column ก็รัน script นี้ได้
-- ==========================================

-- ตรวจสอบว่า column date มีอยู่หรือไม่
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bmi_records'
    AND column_name = 'date'
  ) THEN
    -- เพิ่ม column date
    ALTER TABLE bmi_records
    ADD COLUMN date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- อัพเดทข้อมูลเก่าให้มี date จาก created_at
    UPDATE bmi_records
    SET date = created_at
    WHERE date IS NULL;

    -- สร้าง index สำหรับ date
    CREATE INDEX IF NOT EXISTS idx_bmi_records_date ON bmi_records(date DESC);
    CREATE INDEX IF NOT EXISTS idx_bmi_records_user_date ON bmi_records(user_id, date DESC);

    RAISE NOTICE '✅ Column date added successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Column date already exists';
  END IF;
END $$;

-- ตรวจสอบ columns ทั้งหมดใน table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'bmi_records'
ORDER BY ordinal_position;

