-- ==========================================
-- FIX BMI_RECORDS TABLE - แก้ไขปัญหา RLS และ Table
-- ==========================================
-- ใช้ใน Supabase SQL Editor
-- ==========================================

-- 1. ตรวจสอบว่า table มีอยู่หรือไม่
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'bmi_records'
  ) THEN
    -- สร้าง table ถ้ายังไม่มี
    CREATE TABLE bmi_records (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      weight NUMERIC(5, 2) NOT NULL CHECK (weight > 0),
      height NUMERIC(5, 2) NOT NULL CHECK (height > 0),
      bmi NUMERIC(4, 2) NOT NULL,
      category VARCHAR(20) NOT NULL CHECK (category IN ('underweight', 'normal', 'overweight', 'obese')),
      calories NUMERIC(7, 2) CHECK (calories >= 0),
      date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- สร้าง indexes
    CREATE INDEX IF NOT EXISTS idx_bmi_records_user_id ON bmi_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_bmi_records_date ON bmi_records(date DESC);
    CREATE INDEX IF NOT EXISTS idx_bmi_records_user_date ON bmi_records(user_id, date DESC);

    RAISE NOTICE '✅ Table bmi_records created successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Table bmi_records already exists';
  END IF;
END $$;

-- 2. ลบ RLS policies เก่าทั้งหมด (ถ้ามี)
DROP POLICY IF EXISTS "Users can view their own BMI records" ON bmi_records;
DROP POLICY IF EXISTS "Users can insert their own BMI records" ON bmi_records;
DROP POLICY IF EXISTS "Users can update their own BMI records" ON bmi_records;
DROP POLICY IF EXISTS "Users can delete their own BMI records" ON bmi_records;

-- 3. ปิด RLS ชั่วคราวเพื่อให้ service role key ทำงานได้
-- ⚠️ วิธีนี้จะให้ทุกคน (รวมถึง service role) เข้าถึงได้โดยไม่ผ่าน RLS
ALTER TABLE bmi_records DISABLE ROW LEVEL SECURITY;

-- 4. หรือถ้าต้องการใช้ RLS ควรสร้าง policies ใหม่ที่รองรับ service role:
-- Enable RLS
-- ALTER TABLE bmi_records ENABLE ROW LEVEL SECURITY;

-- Policy: ให้ service role (authenticator role) เข้าถึงได้ทั้งหมด
-- DROP POLICY IF EXISTS "Service role can access all BMI records" ON bmi_records;
-- CREATE POLICY "Service role can access all BMI records"
--   ON bmi_records
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- Policy: ให้ authenticated users เข้าถึงเฉพาะข้อมูลของตัวเอง
-- DROP POLICY IF EXISTS "Authenticated users can access own BMI records" ON bmi_records;
-- CREATE POLICY "Authenticated users can access own BMI records"
--   ON bmi_records
--   FOR ALL
--   TO authenticated
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- 5. ตรวจสอบ table structure
DO $$
DECLARE
  table_exists BOOLEAN;
  column_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'bmi_records'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bmi_records';

    RAISE NOTICE '✅ Table bmi_records exists with % columns', column_count;
  ELSE
    RAISE EXCEPTION '❌ Table bmi_records does not exist!';
  END IF;
END $$;

-- 6. สร้าง function สำหรับ update updated_at (ถ้ายังไม่มี)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. สร้าง trigger สำหรับ update updated_at (ถ้ายังไม่มี)
DROP TRIGGER IF EXISTS update_bmi_records_updated_at ON bmi_records;
CREATE TRIGGER update_bmi_records_updated_at
  BEFORE UPDATE ON bmi_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. ทดสอบ insert ข้อมูล (optional - comment out ถ้าไม่ต้องการ)
-- INSERT INTO bmi_records (user_id, weight, height, bmi, category, calories)
-- VALUES (
--   gen_random_uuid(),
--   70.5,
--   175.0,
--   23.02,
--   'normal',
--   2000
-- );

-- 9. ตรวจสอบ RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'bmi_records';

-- 10. ตรวจสอบ policies (ถ้า RLS เปิดอยู่)
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename = 'bmi_records';

-- ==========================================
-- สรุปการแก้ไข:
-- ==========================================
-- 1. ✅ สร้าง table (ถ้ายังไม่มี)
-- 2. ✅ ลบ RLS policies เก่า
-- 3. ✅ ปิด RLS เพื่อให้ service role key ทำงานได้
-- 4. ✅ สร้าง function และ trigger สำหรับ updated_at
-- 5. ✅ ตรวจสอบ table structure และ RLS status
-- ==========================================
-- ⚠️ หมายเหตุ:
-- - การปิด RLS จะทำให้ทุกคนเข้าถึง table ได้
-- - ถ้าต้องการความปลอดภัย ควรเปิด RLS และสร้าง policies ที่รองรับ service role
-- - Service role key จะ bypass RLS อยู่แล้ว แต่ต้องแน่ใจว่าใช้ service role key ใน backend
-- ==========================================

