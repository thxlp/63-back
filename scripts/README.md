# 🔨 Scripts

โฟลเดอร์นี้เก็บ utility scripts สำหรับ development, testing, และ deployment

## 📋 รายการ Scripts

### 🚀 Deployment Scripts

#### `deploy.bat` (Windows)
Script สำหรับ deploy โปรเจคไปที่ GitHub

**การใช้งาน**:
```bash
scripts\deploy.bat
```

**หน้าที่**:
- Initialize git repository (ถ้ายังไม่มี)
- Add remote repository
- Add และ commit ไฟล์ทั้งหมด
- Push ไปที่ GitHub

---

#### `deploy.sh` (Linux/Mac)
Script สำหรับ deploy โปรเจคไปที่ GitHub (Linux/Mac version)

**การใช้งาน**:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**หน้าที่**: เหมือนกับ `deploy.bat` แต่สำหรับ Linux/Mac

---

### 🧪 Testing Scripts

#### `check-server.js`
ตรวจสอบว่า server ทำงานหรือไม่

**การใช้งาน**:
```bash
node scripts/check-server.js
```

**หน้าที่**:
- ตรวจสอบว่า server ตอบสนองที่ `/api/health`
- แสดงสถานะ server

---

#### `test_database_connection.js`
ทดสอบการเชื่อมต่อ Supabase database

**การใช้งาน**:
```bash
node scripts/test_database_connection.js
```

**หน้าที่**:
- ทดสอบการเชื่อมต่อ Supabase
- ทดสอบการ insert ข้อมูล
- แสดง error messages ถ้ามีปัญหา

**ข้อกำหนด**:
- ต้องมี `.env` file พร้อม `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY`

---

### ⚙️ Setup Scripts

#### `setup-env.ps1` (PowerShell)
Script สำหรับตั้งค่า environment variables

**การใช้งาน**:
```powershell
.\scripts\setup-env.ps1
```

**หน้าที่**:
- สร้าง `.env` file จาก template
- แนะนำการตั้งค่า environment variables

---

## 🔧 การสร้าง Script ใหม่

### Template สำหรับ Script ใหม่

```javascript
// scripts/my-new-script.js
require('dotenv').config();

async function main() {
  try {
    // Your code here
    console.log('✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
```

### Template สำหรับ Batch Script (Windows)

```batch
@echo off
echo Running script...
REM Your commands here
echo Done!
pause
```

### Template สำหรับ Shell Script (Linux/Mac)

```bash
#!/bin/bash
echo "Running script..."
# Your commands here
echo "Done!"
```

---

## 📝 หมายเหตุ

- Scripts ทั้งหมดควรมี error handling
- ใช้ `console.log` สำหรับแสดงผลลัพธ์
- ใช้ `process.exit(1)` เมื่อเกิด error
- ตรวจสอบ environment variables ก่อนใช้งาน

---

**อัปเดตล่าสุด**: 2025-01-20

