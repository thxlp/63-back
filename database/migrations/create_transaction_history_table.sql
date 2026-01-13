-- ==========================================
-- CREATE TRANSACTION HISTORY TABLE - ตารางเก็บประวัติการทำรายการ
-- ==========================================
-- ใช้ใน Supabase SQL Editor
-- ==========================================
-- ตารางนี้ใช้เก็บประวัติการทำรายการต่างๆ ของผู้ใช้ เช่น
-- - การบันทึก BMI
-- - การสแกนบาร์โค้ด
-- - การค้นหาอาหาร
-- - การทำรายการอื่นๆ
-- ==========================================

-- 1. ตรวจสอบว่า table มีอยู่หรือไม่
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transaction_history'
  ) THEN
    -- สร้าง table ถ้ายังไม่มี
    CREATE TABLE transaction_history (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      transaction_type VARCHAR(50) NOT NULL, -- เช่น 'bmi_record', 'barcode_scan', 'food_search', 'profile_update'
      action VARCHAR(100) NOT NULL, -- เช่น 'บันทึก BMI', 'สแกนบาร์โค้ด', 'ค้นหาอาหาร'
      description TEXT, -- รายละเอียดเพิ่มเติม
      metadata JSONB, -- เก็บข้อมูลเพิ่มเติมในรูปแบบ JSON
      status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
      ip_address VARCHAR(45), -- IP address ของผู้ใช้
      user_agent TEXT, -- User agent ของ browser/device
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- สร้าง indexes สำหรับการค้นหาที่รวดเร็ว
    CREATE INDEX IF NOT EXISTS idx_transaction_history_user_id ON transaction_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_history_type ON transaction_history(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_transaction_history_status ON transaction_history(status);
    CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at ON transaction_history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transaction_history_user_created ON transaction_history(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transaction_history_user_type ON transaction_history(user_id, transaction_type);

    -- สร้าง index สำหรับ JSONB metadata (สำหรับการค้นหาใน JSON)
    CREATE INDEX IF NOT EXISTS idx_transaction_history_metadata ON transaction_history USING GIN (metadata);

    RAISE NOTICE '✅ Table transaction_history created successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Table transaction_history already exists';
  END IF;
END $$;

-- 2. ลบ RLS policies เก่าทั้งหมด (ถ้ามี)
DROP POLICY IF EXISTS "Users can view their own transaction history" ON transaction_history;
DROP POLICY IF EXISTS "Users can insert their own transaction history" ON transaction_history;
DROP POLICY IF EXISTS "Users can update their own transaction history" ON transaction_history;
DROP POLICY IF EXISTS "Users can delete their own transaction history" ON transaction_history;

-- 3. ปิด RLS ชั่วคราวเพื่อให้ service role key ทำงานได้
-- ⚠️ วิธีนี้จะให้ทุกคน (รวมถึง service role) เข้าถึงได้โดยไม่ผ่าน RLS
ALTER TABLE transaction_history DISABLE ROW LEVEL SECURITY;

-- 4. หรือถ้าต้องการใช้ RLS ควรสร้าง policies ใหม่ที่รองรับ service role:
-- Enable RLS
-- ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

-- Policy: ให้ service role (authenticator role) เข้าถึงได้ทั้งหมด
-- DROP POLICY IF EXISTS "Service role can access all transaction history" ON transaction_history;
-- CREATE POLICY "Service role can access all transaction history"
--   ON transaction_history
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- Policy: ให้ authenticated users เข้าถึงเฉพาะข้อมูลของตัวเอง
-- DROP POLICY IF EXISTS "Authenticated users can access own transaction history" ON transaction_history;
-- CREATE POLICY "Authenticated users can access own transaction history"
--   ON transaction_history
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
    AND table_name = 'transaction_history'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transaction_history';

    RAISE NOTICE '✅ Table transaction_history exists with % columns', column_count;
  ELSE
    RAISE EXCEPTION '❌ Table transaction_history does not exist!';
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
DROP TRIGGER IF EXISTS update_transaction_history_updated_at ON transaction_history;
CREATE TRIGGER update_transaction_history_updated_at
  BEFORE UPDATE ON transaction_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. เพิ่ม comments เพื่ออธิบาย table และ columns
COMMENT ON TABLE transaction_history IS 'Stores transaction history/activity logs for users';
COMMENT ON COLUMN transaction_history.user_id IS 'Reference to the user who performed the transaction';
COMMENT ON COLUMN transaction_history.transaction_type IS 'Type of transaction: bmi_record, barcode_scan, food_search, profile_update, etc.';
COMMENT ON COLUMN transaction_history.action IS 'Action description in Thai or English';
COMMENT ON COLUMN transaction_history.description IS 'Detailed description of the transaction';
COMMENT ON COLUMN transaction_history.metadata IS 'Additional data in JSON format (e.g., barcode, product_id, search_query)';
COMMENT ON COLUMN transaction_history.status IS 'Transaction status: pending, completed, failed, cancelled';
COMMENT ON COLUMN transaction_history.ip_address IS 'IP address of the user when performing the transaction';
COMMENT ON COLUMN transaction_history.user_agent IS 'User agent string from the browser/device';

-- 9. ตรวจสอบ RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'transaction_history';

-- ==========================================
-- สรุปการสร้างตาราง:
-- ==========================================
-- 1. ✅ สร้าง table transaction_history
-- 2. ✅ สร้าง indexes สำหรับการค้นหาที่รวดเร็ว
-- 3. ✅ ปิด RLS เพื่อให้ service role key ทำงานได้
-- 4. ✅ สร้าง function และ trigger สำหรับ updated_at
-- 5. ✅ เพิ่ม comments อธิบาย table และ columns
-- ==========================================
-- ⚠️ หมายเหตุ:
-- - การปิด RLS จะทำให้ทุกคนเข้าถึง table ได้
-- - ถ้าต้องการความปลอดภัย ควรเปิด RLS และสร้าง policies ที่รองรับ service role
-- - Service role key จะ bypass RLS อยู่แล้ว แต่ต้องแน่ใจว่าใช้ service role key ใน backend
-- ==========================================


