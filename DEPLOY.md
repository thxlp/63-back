# 🚀 คู่มือการ Deploy ไปที่ GitHub

## ขั้นตอนการ Deploy

### 1. ตรวจสอบว่ามี Git หรือยัง

```bash
git --version
```

### 2. Initialize Git Repository (ถ้ายังไม่มี)

```bash
git init
```

### 3. เพิ่ม Remote Repository

```bash
git remote add origin https://github.com/thxlp/63-back.git
```

หรือถ้ามี remote อยู่แล้ว:

```bash
git remote set-url origin https://github.com/thxlp/63-back.git
```

ตรวจสอบ remote:

```bash
git remote -v
```

### 4. เพิ่มไฟล์ทั้งหมด

```bash
git add .
```

### 5. Commit ไฟล์

```bash
git commit -m "Initial commit: Backend API with Supabase integration"
```

หรือ commit message ที่ละเอียดขึ้น:

```bash
git commit -m "Initial commit

- Backend API server with Express.js
- Supabase integration for authentication and database
- BMI records management
- OpenFoodFacts API integration
- Barcode scanning functionality
- User profile management
- Complete API endpoints for frontend integration"
```

### 6. เปลี่ยนชื่อ branch เป็น main (ถ้าจำเป็น)

```bash
git branch -M main
```

### 7. Push ไปที่ GitHub

```bash
git push -u origin main
```

ถ้า push ไม่ได้เพราะ repository มีข้อมูลอยู่แล้ว:

```bash
git push -u origin main --force
```

⚠️ **คำเตือน**: `--force` จะเขียนทับข้อมูลเก่าใน repository ใช้เฉพาะเมื่อแน่ใจว่า repository ว่างเปล่าหรือต้องการเขียนทับ

---

## สำหรับการ Update ครั้งต่อไป

### 1. ตรวจสอบสถานะ

```bash
git status
```

### 2. เพิ่มไฟล์ที่แก้ไข

```bash
git add .
```

หรือเพิ่มไฟล์เฉพาะ:

```bash
git add routes/auth.js
git add config/supabase.js
```

### 3. Commit การแก้ไข

```bash
git commit -m "Update: แก้ไข API endpoints และเพิ่ม features ใหม่"
```

### 4. Push ไปที่ GitHub

```bash
git push
```

---

## ไฟล์สำคัญที่ต้องตรวจสอบก่อน Deploy

### ✅ ไฟล์ที่ควร commit:
- `package.json` และ `package-lock.json`
- `index.js`
- `routes/` (ทุกไฟล์)
- `config/` (ทุกไฟล์)
- `middleware/` (ทุกไฟล์)
- `README.md`
- `*.sql` (SQL scripts)
- `*.js` (Helper scripts)
- `.gitignore`

### ❌ ไฟล์ที่ไม่ควร commit (อยู่ใน .gitignore):
- `node_modules/` - จะถูกติดตั้งใหม่ด้วย `npm install`
- `.env` - ข้อมูลสำคัญ อย่า commit!
- `*.log` - log files
- `.vscode/`, `.idea/` - IDE settings

---

## สร้าง .env.example

สร้างไฟล์ `.env.example` เพื่อให้คนอื่นรู้ว่าต้องตั้งค่าอะไรบ้าง:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Server Configuration
PORT=3002
NODE_ENV=development
```

⚠️ **สำคัญ**: อย่า commit `.env` ที่มีค่าจริง! ใช้ `.env.example` แทน

---

## วิธี Clone และ Setup หลังจาก Deploy

สำหรับคนอื่นที่จะ clone repository:

```bash
# Clone repository
git clone https://github.com/thxlp/63-back.git
cd 63-back

# ติดตั้ง dependencies
npm install

# Copy .env.example เป็น .env
copy .env.example .env
# หรือบน Linux/Mac:
# cp .env.example .env

# แก้ไข .env ด้วยค่าจริงของคุณ

# รัน server
npm start
# หรือ
npm run dev
```

---

## Troubleshooting

### ปัญหา: "remote origin already exists"

แก้ไข:
```bash
git remote remove origin
git remote add origin https://github.com/thxlp/63-back.git
```

### ปัญหา: "Permission denied"

แก้ไข: ตรวจสอบว่าคุณมี permission ใน repository หรือต้องใช้ Personal Access Token

### ปัญหา: "Authentication failed"

แก้ไข: ใช้ Personal Access Token แทน password
1. ไปที่ GitHub > Settings > Developer settings > Personal access tokens
2. สร้าง token ใหม่
3. ใช้ token แทน password เมื่อ push

---

## คำสั่งรวบ (Copy & Paste ทั้งหมด)

```bash
# Initialize และ setup
git init
git remote add origin https://github.com/thxlp/63-back.git
git branch -M main

# Add และ commit
git add .
git commit -m "Initial commit: Backend API with Supabase integration"

# Push
git push -u origin main
```

---

## ตรวจสอบว่า Deploy สำเร็จ

ไปที่: https://github.com/thxlp/63-back

ควรเห็นไฟล์ทั้งหมดที่ commit ไป

