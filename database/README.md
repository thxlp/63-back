# 🗄️ Database

โฟลเดอร์นี้เก็บไฟล์ที่เกี่ยวข้องกับ database และ migrations

## 📂 โครงสร้าง

```
database/
├── migrations/      # SQL migration scripts
└── examples/        # Example SQL scripts
```

---

## 📋 Migrations

### `migrations/fix_bmi_records_table.sql`
**หน้าที่**: สร้างหรือแก้ไขตาราง `bmi_records`

**การใช้งาน**:
1. เปิด Supabase SQL Editor
2. Copy เนื้อหาจากไฟล์
3. Run ใน SQL Editor

**สิ่งที่ทำ**:
- สร้างตาราง `bmi_records` (ถ้ายังไม่มี)
- ตั้งค่า indexes
- สร้าง triggers สำหรับ `updated_at`
- จัดการ RLS policies

---

### `migrations/add_date_column.sql`
**หน้าที่**: เพิ่มคอลัมน์ `date` ในตาราง `bmi_records`

**การใช้งาน**: เหมือนกับ `fix_bmi_records_table.sql`

---

## 📚 Examples

### `examples/create_bmi_records_table.sql`
**หน้าที่**: ตัวอย่าง SQL script สำหรับสร้างตาราง `bmi_records`

**หมายเหตุ**: ใช้สำหรับอ้างอิงเท่านั้น ควรใช้ `migrations/fix_bmi_records_table.sql` แทน

---

## 🔄 การสร้าง Migration ใหม่

### ขั้นตอน

1. **สร้างไฟล์ใหม่** ใน `migrations/`
   - ตั้งชื่อตามรูปแบบ: `YYYYMMDD_description.sql`
   - ตัวอย่าง: `20250120_add_user_preferences_table.sql`

2. **เขียน SQL Script**
   ```sql
   -- ==========================================
   -- Migration: Add user preferences table
   -- Date: 2025-01-20
   -- ==========================================
   
   CREATE TABLE IF NOT EXISTS user_preferences (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID NOT NULL,
     preference_key VARCHAR(100) NOT NULL,
     preference_value TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
     ON user_preferences(user_id);
   ```

3. **ทดสอบใน Supabase SQL Editor**
   - Run script ใน Supabase
   - ตรวจสอบว่าไม่มี error

4. **Document ใน PROJECT_STRUCTURE.md**
   - เพิ่มรายละเอียด migration ใหม่

---

## 📝 Best Practices

### ✅ ควรทำ
- ตั้งชื่อไฟล์ให้ชัดเจนและมีวันที่
- เขียน comment อธิบาย migration
- ใช้ `IF NOT EXISTS` เพื่อป้องกัน error
- ทดสอบใน development ก่อน
- Backup database ก่อน run migration สำคัญ

### ❌ ไม่ควรทำ
- แก้ไข migration ที่ run ไปแล้ว (สร้าง migration ใหม่แทน)
- Hardcode data ใน migration (ใช้ seed script แทน)
- ลบ migration files (เก็บไว้เป็นประวัติ)

---

## 🔍 Schema Reference

### ตาราง `bmi_records`

```sql
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
```

**Indexes**:
- `idx_bmi_records_user_id` - สำหรับ query ตาม user_id
- `idx_bmi_records_date` - สำหรับ query ตาม date
- `idx_bmi_records_user_date` - Composite index

---

## 🛠️ Tools

### Supabase SQL Editor
- ไปที่: [Supabase Dashboard](https://app.supabase.com) > SQL Editor
- ใช้สำหรับ run migrations

### Supabase Table Editor
- ไปที่: [Supabase Dashboard](https://app.supabase.com) > Table Editor
- ใช้สำหรับดูและแก้ไขข้อมูล

---

**อัปเดตล่าสุด**: 2025-01-20

