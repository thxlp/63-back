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
Project_63_back/
├── 📁 config/              # Configuration files
│   └── supabase.js        # Supabase client configuration
│
├── 📁 routes/              # API Routes (Endpoints)
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management routes
│   ├── data.js            # Generic data operations
│   ├── openfoodfacts.js   # OpenFoodFacts API integration
│   └── barcode.js         # Barcode scanning routes
│
├── 📁 middleware/          # Express Middleware
│   └── auth.js            # Authentication middleware
│
├── 📁 database/            # Database related files
│   ├── migrations/        # SQL migration scripts
│   └── examples/          # Example SQL scripts
│
├── 📁 scripts/             # Utility scripts
│   ├── deploy.bat         # Windows deployment script
│   ├── deploy.sh          # Linux/Mac deployment script
│   ├── check-server.js    # Server health check
│   └── test_database_connection.js  # Database test
│
├── 📁 docs/                # Documentation
│   └── examples/           # Example code for frontend
│
├── 📁 public/               # Static files (HTML, CSS, JS)
│
├── 📄 index.js             # Main server file (Entry point)
├── 📄 package.json         # Dependencies and scripts
├── 📄 .env                 # Environment variables (ไม่ commit)
├── 📄 .gitignore           # Git ignore rules
├── 📄 README.md            # Main documentation
└── 📄 PROJECT_STRUCTURE.md # โครงสร้างโปรเจคแบบละเอียด
```

**ดูรายละเอียดเพิ่มเติม**: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## ตัวอย่างการใช้ Frontend

ดูตัวอย่างโค้ดที่สมบูรณ์ได้ที่:
- [docs/examples/FRONTEND_API_REQUESTS.js](./docs/examples/FRONTEND_API_REQUESTS.js) - ตัวอย่างการเรียกใช้ API ทั้งหมด
- [docs/examples/FRONTEND_FOOD_SEARCH_API.js](./docs/examples/FRONTEND_FOOD_SEARCH_API.js) - ตัวอย่างการค้นหาอาหาร

### ตัวอย่างเบื้องต้น

```javascript
// Sign Up
const response = await axios.post('http://localhost:3002/api/auth/signup', {
  email: 'user@example.com',
  password: 'password123',
  weight: 70,
  height: 175
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

// Search food
const foods = await axios.get('http://localhost:3002/api/openfoodfacts/search?q=chocolate');
```

## CORS Configuration

Frontend สามารถเชื่อมต่อจากโดเมนใด ๆ ได้ (CORS enabled)

## การ Deploy ไปที่ GitHub

### วิธีที่ 1: ใช้ Script (แนะนำ)

**Windows:**
```bash
scripts\deploy.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
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

ดูรายละเอียดเพิ่มเติม:
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - โครงสร้างโปรเจค
- [scripts/README.md](./scripts/README.md) - เอกสาร scripts
- [database/README.md](./database/README.md) - เอกสาร database
- [docs/README.md](./docs/README.md) - เอกสารและ examples

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
