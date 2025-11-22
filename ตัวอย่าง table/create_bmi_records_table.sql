-- Drop table if exists (for recreation)
DROP TABLE IF EXISTS bmi_records CASCADE;

-- Create bmi_records table for storing BMI data
-- Note: user_id references auth.users(id) but we don't enforce foreign key constraint
-- because auth.users is managed by Supabase Auth and may not always be accessible
CREATE TABLE bmi_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight DECIMAL(5, 2) NOT NULL CHECK (weight > 0),
  height DECIMAL(5, 2) NOT NULL CHECK (height > 0),
  bmi DECIMAL(4, 2) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('underweight', 'normal', 'overweight', 'obese')),
  calories DECIMAL(7, 2) CHECK (calories >= 0),
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_bmi_records_user_id ON bmi_records(user_id);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_bmi_records_date ON bmi_records(date DESC);

-- Create index for faster queries by user_id and date
CREATE INDEX IF NOT EXISTS idx_bmi_records_user_date ON bmi_records(user_id, date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE bmi_records ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own BMI records
CREATE POLICY "Users can view their own BMI records"
  ON bmi_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own BMI records
CREATE POLICY "Users can insert their own BMI records"
  ON bmi_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own BMI records
CREATE POLICY "Users can update their own BMI records"
  ON bmi_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own BMI records
CREATE POLICY "Users can delete their own BMI records"
  ON bmi_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bmi_records_updated_at
  BEFORE UPDATE ON bmi_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE bmi_records IS 'Stores BMI (Body Mass Index) records for users';
COMMENT ON COLUMN bmi_records.user_id IS 'Reference to the user who owns this BMI record';
COMMENT ON COLUMN bmi_records.weight IS 'Weight in kilograms';
COMMENT ON COLUMN bmi_records.height IS 'Height in centimeters';
COMMENT ON COLUMN bmi_records.bmi IS 'Calculated BMI value';
COMMENT ON COLUMN bmi_records.category IS 'BMI category: underweight, normal, overweight, or obese';
COMMENT ON COLUMN bmi_records.calories IS 'Daily calories intake in kcal';
COMMENT ON COLUMN bmi_records.date IS 'Date when the BMI measurement was taken';

