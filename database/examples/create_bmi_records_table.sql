-- ==========================================
-- EXAMPLE: Create BMI Records Table
-- ==========================================
-- ไฟล์นี้เป็นตัวอย่างสำหรับอ้างอิงเท่านั้น
-- สำหรับการใช้งานจริง ควรใช้ migrations/fix_bmi_records_table.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS bmi_records (
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

-- สร้าง function และ trigger สำหรับ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bmi_records_updated_at
  BEFORE UPDATE ON bmi_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- เพิ่ม comment
COMMENT ON TABLE bmi_records IS 'Stores BMI (Body Mass Index) records for users';
COMMENT ON COLUMN bmi_records.user_id IS 'Reference to the user who owns this BMI record';
COMMENT ON COLUMN bmi_records.weight IS 'Weight in kilograms';
COMMENT ON COLUMN bmi_records.height IS 'Height in centimeters';
COMMENT ON COLUMN bmi_records.bmi IS 'Calculated BMI value';
COMMENT ON COLUMN bmi_records.category IS 'BMI category: underweight, normal, overweight, or obese';
COMMENT ON COLUMN bmi_records.calories IS 'Daily calories intake in kcal';
COMMENT ON COLUMN bmi_records.date IS 'Date when the BMI measurement was taken';

