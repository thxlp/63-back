-- ==========================================
-- CREATE CART HISTORY TABLE - ตารางเก็บประวัติตะกร้าสินค้า
-- ==========================================
-- ใช้ใน Supabase SQL Editor
-- ==========================================
-- ตารางนี้ใช้เก็บประวัติตะกร้าสินค้าของผู้ใช้
-- รองรับการบันทึกสินค้าที่ผู้ใช้เพิ่มลงตะกร้า
-- ==========================================

-- 1. ตรวจสอบว่า table มีอยู่หรือไม่
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cart_history'
  ) THEN
    -- สร้าง table ถ้ายังไม่มี
    CREATE TABLE cart_history (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      items JSONB NOT NULL, -- เก็บ array ของสินค้าในตะกร้า
      total_items INTEGER DEFAULT 0, -- จำนวนสินค้าทั้งหมด
      total_calories NUMERIC(10, 1), -- แคลอรี่รวม
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')), -- สถานะตะกร้า
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- สร้าง indexes สำหรับการค้นหาที่รวดเร็ว
    CREATE INDEX IF NOT EXISTS idx_cart_history_user_id ON cart_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_cart_history_status ON cart_history(status);
    CREATE INDEX IF NOT EXISTS idx_cart_history_created_at ON cart_history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cart_history_user_created ON cart_history(user_id, created_at DESC);
    
    -- สร้าง index สำหรับ JSONB items (สำหรับการค้นหาใน JSON)
    CREATE INDEX IF NOT EXISTS idx_cart_history_items ON cart_history USING GIN (items);

    RAISE NOTICE '✅ Table cart_history created successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Table cart_history already exists';
  END IF;
END $$;

-- 2. ลบ RLS policies เก่าทั้งหมด (ถ้ามี)
DROP POLICY IF EXISTS "Users can view their own cart history" ON cart_history;
DROP POLICY IF EXISTS "Users can insert their own cart history" ON cart_history;
DROP POLICY IF EXISTS "Users can update their own cart history" ON cart_history;
DROP POLICY IF EXISTS "Users can delete their own cart history" ON cart_history;

-- 3. ปิด RLS ชั่วคราวเพื่อให้ service role key ทำงานได้
-- ⚠️ วิธีนี้จะให้ทุกคน (รวมถึง service role) เข้าถึงได้โดยไม่ผ่าน RLS
ALTER TABLE cart_history DISABLE ROW LEVEL SECURITY;

-- 4. หรือถ้าต้องการใช้ RLS ควรสร้าง policies ใหม่ที่รองรับ service role:
-- Enable RLS
-- ALTER TABLE cart_history ENABLE ROW LEVEL SECURITY;

-- Policy: ให้ service role (authenticator role) เข้าถึงได้ทั้งหมด
-- DROP POLICY IF EXISTS "Service role can access all cart history" ON cart_history;
-- CREATE POLICY "Service role can access all cart history"
--   ON cart_history
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- Policy: ให้ authenticated users เข้าถึงเฉพาะข้อมูลของตัวเอง
-- DROP POLICY IF EXISTS "Authenticated users can access own cart history" ON cart_history;
-- CREATE POLICY "Authenticated users can access own cart history"
--   ON cart_history
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
    AND table_name = 'cart_history'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cart_history';

    RAISE NOTICE '✅ Table cart_history exists with % columns', column_count;
  ELSE
    RAISE EXCEPTION '❌ Table cart_history does not exist!';
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
DROP TRIGGER IF EXISTS update_cart_history_updated_at ON cart_history;
CREATE TRIGGER update_cart_history_updated_at
  BEFORE UPDATE ON cart_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. เพิ่ม comments เพื่ออธิบาย table และ columns
COMMENT ON TABLE cart_history IS 'Stores cart history for users';
COMMENT ON COLUMN cart_history.user_id IS 'Reference to the user who owns this cart';
COMMENT ON COLUMN cart_history.items IS 'Array of items in the cart (JSON format)';
COMMENT ON COLUMN cart_history.total_items IS 'Total number of items in the cart';
COMMENT ON COLUMN cart_history.total_calories IS 'Total calories of all items in the cart';
COMMENT ON COLUMN cart_history.status IS 'Cart status: active, completed, cancelled';

-- 9. ตรวจสอบ RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'cart_history';

-- ==========================================
-- สรุปการสร้างตาราง:
-- ==========================================
-- 1. ✅ สร้าง table cart_history
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


