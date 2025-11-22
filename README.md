# Backend TCX - Supabase Integration

บ็อกเอนด์สำหรับโปรเจค TCX ที่รวมการเชื่อมต่อ Supabase

**GitHub Repository**: https://github.com/thxlp/63-back.git

## ต้องการติดตั้ง

- Node.js (v14 or higher)
- npm หรือ yarn

## การติดตั้ง

1. **Clone/Download โปรเจค**
   ```bash
   cd Project_tcx
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **ตั้งค่า Environment Variables**
   - คัดลอก `.env.example` เป็น `.env`
   - เติมข้อมูล Supabase URL และ Keys

   ```env
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   PORT=3001
   NODE_ENV=development
   ```

## การดึง Supabase Credentials

1. ไปที่ [Supabase Dashboard](https://app.supabase.com)
2. เลือกโปรเจคของคุณ
3. ไปที่ Settings > API
4. คัดลอก:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## การรัน Server

### Development Mode (กับ auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server จะเริ่มทำงานที่ `http://localhost:3002`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - สมัครสมาชิก
- `POST /api/auth/signin` - เข้าสู่ระบบ
- `POST /api/auth/signout` - ออกจากระบบ
- `GET /api/auth/me` - ดึงข้อมูลผู้ใช้ปัจจุบัน

### Users Management
- `GET /api/users` - ดึงผู้ใช้ทั้งหมด
- `GET /api/users/:id` - ดึงผู้ใช้ตามรหัส
- `POST /api/users` - สร้างโปรไฟล์ผู้ใช้
- `PUT /api/users/:id` - อัปเดตผู้ใช้
- `DELETE /api/users/:id` - ลบผู้ใช้

### Generic Data Operations
- `GET /api/data/:tableName` - ดึงข้อมูลทั้งหมดจากตาราง
- `GET /api/data/:tableName/:id` - ดึงรายการเดียว
- `POST /api/data/:tableName` - เพิ่มข้อมูล
- `PUT /api/data/:tableName/:id` - อัปเดตข้อมูล
- `DELETE /api/data/:tableName/:id` - ลบข้อมูล

## โครงสร้างโฟลเดอร์

```
Project_tcx/
├── config/
│   └── supabase.js          # Supabase client configuration
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   └── data.js              # Generic data operations
├── middleware/
│   └── auth.js              # Authentication middleware
├── index.js                 # Main server file
├── .env                     # Environment variables (local)
├── .env.example             # Environment variables template
├── package.json             # Dependencies
└── README.md                # Documentation
```

## ตัวอย่างการใช้ Frontend

### JavaScript/Axios
```javascript
// Sign Up
const response = await axios.post('http://localhost:3002/api/auth/signup', {
  email: 'user@example.com',
  password: 'password123'
});

// Sign In
const session = await axios.post('http://localhost:3002/api/auth/signin', {
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const user = await axios.get('http://localhost:3002/api/auth/me', {
  headers: {
    Authorization: `Bearer ${session.data.session.access_token}`
  }
});

// Get all users
const users = await axios.get('http://localhost:3002/api/users');

// Get data from table
const data = await axios.get('http://localhost:3002/api/data/your_table_name?limit=10&offset=0');

// Create data
const newData = await axios.post('http://localhost:3002/api/data/your_table_name', {
  name: 'Test',
  description: 'Test description'
});
```

## CORS Configuration

Frontend สามารถเชื่อมต่อจากโดเมนใด ๆ ได้ (CORS enabled)

## การ Deploy ไปที่ GitHub

### วิธีที่ 1: ใช้ Script (แนะนำ)

**Windows:**
```bash
deploy.bat
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### วิธีที่ 2: ใช้ Git Command Line

```bash
# Initialize git (ถ้ายังไม่มี)
git init

# Add remote repository
git remote add origin https://github.com/thxlp/63-back.git

# Add files
git add .

# Commit
git commit -m "Initial commit: Backend API with Supabase integration"

# Push to GitHub
git push -u origin main
```

ดูรายละเอียดเพิ่มเติมที่ [DEPLOY.md](./DEPLOY.md)

## Troubleshooting

### Error: Missing Supabase environment variables
- ตรวจสอบว่ากำหนด `SUPABASE_URL` และ `SUPABASE_ANON_KEY` ใน `.env` แล้ว

### Error: Cannot connect to Supabase
- ตรวจสอบ URL และ Key ถูกต้องหรือไม่
- ตรวจสอบการเชื่อมต่อ internet

### Port already in use
- เปลี่ยน PORT ใน `.env` ให้เป็นพอร์ตอื่น เช่น 3002

## License

ISC
