# 📁 โครงสร้างโปรเจค (Project Structure)

โครงสร้างโปรเจค Backend API ที่จัดระเบียบให้ง่ายต่อการเข้าใจและแก้ไข

## 📂 โครงสร้างโฟลเดอร์

```
Project_63_back/
├── 📁 config/              # Configuration files
│   └── supabase.js        # Supabase client configuration
│
├── 📁 routes/              # API Routes (Endpoints)
│   ├── auth.js            # Authentication routes (signup, signin, signout, profile)
│   ├── users.js           # User management routes
│   ├── data.js            # Generic data operations
│   ├── openfoodfacts.js   # OpenFoodFacts API integration
│   └── barcode.js         # Barcode scanning routes
│
├── 📁 middleware/          # Express Middleware
│   └── auth.js            # Authentication middleware
│
├── 📁 database/            # Database related files
│   ├── 📁 migrations/      # SQL migration scripts
│   │   ├── fix_bmi_records_table.sql
│   │   └── add_date_column.sql
│   └── 📁 examples/        # Example SQL scripts
│       └── create_bmi_records_table.sql
│
├── 📁 scripts/              # Utility scripts
│   ├── deploy.bat         # Windows deployment script
│   ├── deploy.sh          # Linux/Mac deployment script
│   ├── check-server.js    # Server health check script
│   ├── test_database_connection.js  # Database connection test
│   └── setup-env.ps1      # Environment setup script
│
├── 📁 docs/                # Documentation
│   └── 📁 examples/        # Example code for frontend
│       ├── FRONTEND_API_REQUESTS.js
│       └── FRONTEND_FOOD_SEARCH_API.js
│
├── 📁 public/              # Static files (HTML, CSS, JS)
│   ├── example.html
│   └── barcode-scanner.html
│
├── 📄 index.js             # Main server file (Entry point)
├── 📄 package.json         # Dependencies and scripts
├── 📄 .env                 # Environment variables (ไม่ commit)
├── 📄 .gitignore           # Git ignore rules
├── 📄 README.md            # Main documentation
└── 📄 PROJECT_STRUCTURE.md # This file
```

---

## 📋 รายละเอียดแต่ละโฟลเดอร์

### 🔧 `config/`
**หน้าที่**: เก็บไฟล์ configuration ทั้งหมด

- `supabase.js` - ตั้งค่า Supabase client และ admin client

**การใช้งาน**:
```javascript
const { supabase, supabaseAdmin } = require('./config/supabase');
```

---

### 🛣️ `routes/`
**หน้าที่**: เก็บ API endpoints ทั้งหมด แบ่งตาม feature

#### `routes/auth.js`
- `POST /api/auth/signup` - สมัครสมาชิก
- `POST /api/auth/signin` - เข้าสู่ระบบ
- `POST /api/auth/signout` - ออกจากระบบ
- `GET /api/auth/me` - ข้อมูลผู้ใช้ปัจจุบัน
- `GET /api/auth/profile` - ข้อมูล profile
- `POST /api/auth/profile` - อัปเดต profile
- `GET /api/auth/bmi` - ข้อมูล BMI records

#### `routes/users.js`
- `GET /api/users` - รายชื่อผู้ใช้ทั้งหมด
- `GET /api/users/:id` - ข้อมูลผู้ใช้ตาม ID
- `GET /api/users/profile` - ข้อมูล profile

#### `routes/data.js`
- `GET /api/data/:tableName` - ดึงข้อมูลจากตาราง
- `POST /api/data/:tableName` - เพิ่มข้อมูล
- `PUT /api/data/:tableName/:id` - อัปเดตข้อมูล
- `DELETE /api/data/:tableName/:id` - ลบข้อมูล

#### `routes/openfoodfacts.js`
- `GET /api/openfoodfacts/search` - ค้นหาอาหาร
- `GET /api/openfoodfacts/product/:barcode` - ข้อมูลสินค้าตาม barcode
- `GET /api/openfoodfacts/random` - สินค้าแบบสุ่ม

#### `routes/barcode.js`
- `POST /api/barcode/scan` - สแกน barcode จากรูปภาพ
- `POST /api/barcode/read` - อ่าน barcode

**การเพิ่ม Route ใหม่**:
1. สร้างไฟล์ใหม่ใน `routes/`
2. Export router
3. Import และ mount ใน `index.js`

---

### 🛡️ `middleware/`
**หน้าที่**: เก็บ Express middleware functions

- `auth.js` - ตรวจสอบ authentication token

**การใช้งาน**:
```javascript
const { authenticateToken } = require('./middleware/auth');
router.get('/protected', authenticateToken, handler);
```

---

### 🗄️ `database/`
**หน้าที่**: เก็บไฟล์ที่เกี่ยวข้องกับ database

#### `database/migrations/`
SQL scripts สำหรับสร้างหรือแก้ไข database schema

**ไฟล์สำคัญ**:
- `fix_bmi_records_table.sql` - สร้าง/แก้ไขตาราง `bmi_records`

**การใช้งาน**:
1. เปิด Supabase SQL Editor
2. Copy เนื้อหาจากไฟล์ `.sql`
3. Run ใน SQL Editor

#### `database/examples/`
Example SQL scripts สำหรับอ้างอิง

---

### 🔨 `scripts/`
**หน้าที่**: เก็บ utility scripts สำหรับ development และ deployment

#### `deploy.bat` / `deploy.sh`
Script สำหรับ deploy ไปที่ GitHub

**การใช้งาน**:
```bash
# Windows
scripts\deploy.bat

# Linux/Mac
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### `check-server.js`
ตรวจสอบว่า server ทำงานหรือไม่

**การใช้งาน**:
```bash
node scripts/check-server.js
```

#### `test_database_connection.js`
ทดสอบการเชื่อมต่อ Supabase

**การใช้งาน**:
```bash
node scripts/test_database_connection.js
```

---

### 📚 `docs/`
**หน้าที่**: เก็บ documentation และ example code

#### `docs/examples/`
Example code สำหรับ frontend developers

- `FRONTEND_API_REQUESTS.js` - ตัวอย่างการเรียกใช้ API ทั้งหมด
- `FRONTEND_FOOD_SEARCH_API.js` - ตัวอย่างการค้นหาอาหาร

---

### 🌐 `public/`
**หน้าที่**: เก็บ static files (HTML, CSS, JS, images)

Server จะ serve ไฟล์ในโฟลเดอร์นี้ที่ root path

**ตัวอย่าง**:
- `public/example.html` → `http://localhost:3002/example.html`

---

## 🔄 การเพิ่ม Feature ใหม่

### 1. เพิ่ม Route ใหม่

```javascript
// routes/newfeature.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'New feature' });
});

module.exports = router;
```

```javascript
// index.js
const newFeatureRoutes = require('./routes/newfeature');
app.use('/api/newfeature', newFeatureRoutes);
```

### 2. เพิ่ม Middleware ใหม่

```javascript
// middleware/custom.js
const customMiddleware = (req, res, next) => {
  // Your logic here
  next();
};

module.exports = { customMiddleware };
```

### 3. เพิ่ม Database Migration

1. สร้างไฟล์ใหม่ใน `database/migrations/`
2. ตั้งชื่อตามรูปแบบ: `YYYYMMDD_description.sql`
3. เขียน SQL script
4. Document ใน `PROJECT_STRUCTURE.md`

---

## 📝 Best Practices

### ✅ ควรทำ
- เก็บไฟล์ตามหมวดหมู่ในโฟลเดอร์ที่เหมาะสม
- ตั้งชื่อไฟล์ให้ชัดเจนและสื่อความหมาย
- เขียน comment อธิบายโค้ดที่ซับซ้อน
- ใช้ environment variables สำหรับ sensitive data
- Commit `.gitignore` แต่ไม่ commit `.env`

### ❌ ไม่ควรทำ
- เก็บไฟล์ทุกอย่างไว้ที่ root directory
- ตั้งชื่อไฟล์ที่ไม่สื่อความหมาย (เช่น `test.js`, `temp.js`)
- Hardcode credentials ในโค้ด
- Commit `node_modules/` หรือ `.env`

---

## 🔍 การค้นหาไฟล์

### ต้องการแก้ไข API endpoint?
→ ไปที่ `routes/` ตาม feature ที่เกี่ยวข้อง

### ต้องการแก้ไข database schema?
→ ไปที่ `database/migrations/`

### ต้องการเพิ่ม utility function?
→ สร้างไฟล์ใหม่ใน `scripts/` หรือ `utils/` (ถ้ามี)

### ต้องการดูตัวอย่างการใช้งาน?
→ ไปที่ `docs/examples/`

---

## 📖 เอกสารเพิ่มเติม

- [README.md](./README.md) - เอกสารหลักของโปรเจค
- [docs/examples/](./docs/examples/) - ตัวอย่างโค้ดสำหรับ frontend

---

**อัปเดตล่าสุด**: 2025-01-20

