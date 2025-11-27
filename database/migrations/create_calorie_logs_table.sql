-- ==========================================
-- CREATE CALORIE LOGS TABLE - ตารางเก็บบันทึกแคลอรี่รายวัน
-- ==========================================
-- ใช้ใน Supabase SQL Editor
-- ==========================================
-- ตารางนี้ใช้เก็บบันทึกแคลอรี่รายวันของผู้ใช้
-- รองรับการบันทึกข้อมูลโภชนาการและรายการอาหารที่รับประทาน
-- ==========================================

-- 1. ตรวจสอบว่า table มีอยู่หรือไม่
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'calorie_logs'
  ) THEN
    -- สร้าง table ถ้ายังไม่มี
    CREATE TABLE calorie_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      date DATE NOT NULL,
      total_calories NUMERIC(10, 1),
      target_calories INTEGER,
      total_fat NUMERIC(10, 1),
      total_carbs NUMERIC(10, 1),
      total_protein NUMERIC(10, 1),
      items JSONB, -- เก็บ array ของ items ในรูปแบบ JSON
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Constraint: แต่ละ user สามารถมี log ได้เพียง 1 รายการต่อวัน
      CONSTRAINT unique_user_date UNIQUE (user_id, date)
    );

    -- สร้าง indexes สำหรับการค้นหาที่รวดเร็ว
    CREATE INDEX IF NOT EXISTS idx_calorie_logs_user_id ON calorie_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_calorie_logs_date ON calorie_logs(date DESC);
    CREATE INDEX IF NOT EXISTS idx_calorie_logs_user_date ON calorie_logs(user_id, date DESC);
    
    -- สร้าง index สำหรับ JSONB items (สำหรับการค้นหาใน JSON)
    CREATE INDEX IF NOT EXISTS idx_calorie_logs_items ON calorie_logs USING GIN (items);

    RAISE NOTICE '✅ Table calorie_logs created successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Table calorie_logs already exists';
  END IF;
END $$;

-- 2. ลบ RLS policies เก่าทั้งหมด (ถ้ามี)
DROP POLICY IF EXISTS "Users can view their own calorie logs" ON calorie_logs;
DROP POLICY IF EXISTS "Users can insert their own calorie logs" ON calorie_logs;
DROP POLICY IF EXISTS "Users can update their own calorie logs" ON calorie_logs;
DROP POLICY IF EXISTS "Users can delete their own calorie logs" ON calorie_logs;

-- 3. ปิด RLS ชั่วคราวเพื่อให้ service role key ทำงานได้
-- ⚠️ วิธีนี้จะให้ทุกคน (รวมถึง service role) เข้าถึงได้โดยไม่ผ่าน RLS
ALTER TABLE calorie_logs DISABLE ROW LEVEL SECURITY;

-- 4. หรือถ้าต้องการใช้ RLS ควรสร้าง policies ใหม่ที่รองรับ service role:
-- Enable RLS
-- ALTER TABLE calorie_logs ENABLE ROW LEVEL SECURITY;

-- Policy: ให้ service role (authenticator role) เข้าถึงได้ทั้งหมด
-- DROP POLICY IF EXISTS "Service role can access all calorie logs" ON calorie_logs;
-- CREATE POLICY "Service role can access all calorie logs"
--   ON calorie_logs
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- Policy: ให้ authenticated users เข้าถึงเฉพาะข้อมูลของตัวเอง
-- DROP POLICY IF EXISTS "Authenticated users can access own calorie logs" ON calorie_logs;
-- CREATE POLICY "Authenticated users can access own calorie logs"
--   ON calorie_logs
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
    AND table_name = 'calorie_logs'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'calorie_logs';

    RAISE NOTICE '✅ Table calorie_logs exists with % columns', column_count;
  ELSE
    RAISE EXCEPTION '❌ Table calorie_logs does not exist!';
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

-- 7. สร้าง trigger สำหรับ update updated_at
DROP TRIGGER IF EXISTS update_calorie_logs_updated_at ON calorie_logs;
CREATE TRIGGER update_calorie_logs_updated_at
  BEFORE UPDATE ON calorie_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. เพิ่ม comments เพื่ออธิบาย table และ columns
COMMENT ON TABLE calorie_logs IS 'Stores daily calorie logs for users';
COMMENT ON COLUMN calorie_logs.user_id IS 'Reference to the user who owns this calorie log';
COMMENT ON COLUMN calorie_logs.date IS 'Date of the calorie log (YYYY-MM-DD)';
COMMENT ON COLUMN calorie_logs.total_calories IS 'Total calories consumed on this date';
COMMENT ON COLUMN calorie_logs.target_calories IS 'Target calories for this date';
COMMENT ON COLUMN calorie_logs.total_fat IS 'Total fat consumed (grams)';
COMMENT ON COLUMN calorie_logs.total_carbs IS 'Total carbohydrates consumed (grams)';
COMMENT ON COLUMN calorie_logs.total_protein IS 'Total protein consumed (grams)';
COMMENT ON COLUMN calorie_logs.items IS 'Array of food items consumed (JSON format)';

-- 9. ตรวจสอบ RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'calorie_logs';

-- ==========================================
-- สรุปการสร้างตาราง:
-- ==========================================
-- 1. ✅ สร้าง table calorie_logs
-- 2. ✅ สร้าง unique constraint (user_id, date) เพื่อป้องกัน duplicate
-- 3. ✅ สร้าง indexes สำหรับการค้นหาที่รวดเร็ว
-- 4. ✅ ปิด RLS เพื่อให้ service role key ทำงานได้
-- 5. ✅ สร้าง function และ trigger สำหรับ updated_at
-- 6. ✅ เพิ่ม comments อธิบาย table และ columns
-- ==========================================
-- ⚠️ หมายเหตุ:
-- - การปิด RLS จะทำให้ทุกคนเข้าถึง table ได้
-- - ถ้าต้องการความปลอดภัย ควรเปิด RLS และสร้าง policies ที่รองรับ service role
-- - Service role key จะ bypass RLS อยู่แล้ว แต่ต้องแน่ใจว่าใช้ service role key ใน backend
-- - Unique constraint (user_id, date) จะทำให้แต่ละ user มี log ได้เพียง 1 รายการต่อวัน
-- ==========================================


