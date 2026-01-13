# เอกสารระบบเก็บประวัติการทำรายการ (Transaction History System)

## ภาพรวม

ระบบเก็บประวัติการทำรายการ (Transaction History) เป็นระบบที่ใช้บันทึกและติดตามการกระทำต่างๆ ของผู้ใช้ในระบบ เช่น:
- การสมัครสมาชิก
- การเข้าสู่ระบบ
- การบันทึกข้อมูล BMI
- การสแกนบาร์โค้ด
- การค้นหาอาหาร
- การอัปเดตโปรไฟล์

## การติดตั้ง

### 1. สร้างตารางในฐานข้อมูล

รัน SQL script ใน Supabase SQL Editor:

```sql
-- ดูไฟล์: database/migrations/create_transaction_history_table.sql
```

หรือรันคำสั่ง:

```bash
# เปิด Supabase Dashboard > SQL Editor
# Copy เนื้อหาจาก database/migrations/create_transaction_history_table.sql
# Paste และ Run
```

### 2. ตรวจสอบการติดตั้ง

ระบบจะทำงานอัตโนมัติหลังจากสร้างตารางแล้ว ไม่ต้อง restart server

## โครงสร้างตาราง

### transaction_history

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | ID ของผู้ใช้ |
| transaction_type | VARCHAR(50) | ประเภทการทำรายการ |
| action | VARCHAR(100) | คำอธิบายการกระทำ |
| description | TEXT | รายละเอียดเพิ่มเติม |
| metadata | JSONB | ข้อมูลเพิ่มเติมในรูปแบบ JSON |
| status | VARCHAR(20) | สถานะ (pending, completed, failed, cancelled) |
| ip_address | VARCHAR(45) | IP address ของผู้ใช้ |
| user_agent | TEXT | User agent string |
| created_at | TIMESTAMP | วันที่สร้าง |
| updated_at | TIMESTAMP | วันที่อัปเดตล่าสุด |

## API Endpoints

### 1. บันทึกประวัติการทำรายการ

```http
POST /api/transactions
Content-Type: application/json

{
  "user_id": "uuid-here",
  "transaction_type": "bmi_record",
  "action": "บันทึกข้อมูล BMI",
  "description": "บันทึกข้อมูล BMI: 23.5 (normal)",
  "metadata": {
    "weight": 70,
    "height": 175,
    "bmi": 23.5,
    "category": "normal"
  },
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "transaction_type": "bmi_record",
    "action": "บันทึกข้อมูล BMI",
    "status": "completed",
    "created_at": "2025-01-20T10:00:00Z"
  }
}
```

### 2. ดึงประวัติการทำรายการ

```http
GET /api/transactions?user_id=xxx&type=xxx&status=xxx&limit=10&offset=0
```

**Query Parameters:**
- `user_id` (required): ID ของผู้ใช้
- `transaction_type` (optional): ประเภทการทำรายการ
- `status` (optional): สถานะ
- `start_date` (optional): วันที่เริ่มต้น (ISO format)
- `end_date` (optional): วันที่สิ้นสุด (ISO format)
- `limit` (optional): จำนวนรายการต่อหน้า (default: 50, max: 100)
- `offset` (optional): จำนวนรายการที่ข้าม (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "transaction_type": "bmi_record",
      "action": "บันทึกข้อมูล BMI",
      "status": "completed",
      "created_at": "2025-01-20T10:00:00Z"
    }
  ],
  "count": 1,
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### 3. ดึงประวัติการทำรายการตาม ID

```http
GET /api/transactions/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "transaction_type": "bmi_record",
    "action": "บันทึกข้อมูล BMI",
    "description": "บันทึกข้อมูล BMI: 23.5 (normal)",
    "metadata": {
      "weight": 70,
      "height": 175,
      "bmi": 23.5,
      "category": "normal"
    },
    "status": "completed",
    "created_at": "2025-01-20T10:00:00Z"
  }
}
```

### 4. อัปเดตสถานะการทำรายการ

```http
PUT /api/transactions/:id
Content-Type: application/json

{
  "status": "completed",
  "description": "อัปเดตรายละเอียด",
  "metadata": {
    "additional": "data"
  }
}
```

### 5. ลบประวัติการทำรายการ

```http
DELETE /api/transactions/:id
```

### 6. ดึงสถิติการทำรายการ

```http
GET /api/transactions/stats/:user_id?start_date=2025-01-01&end_date=2025-01-31
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "by_type": {
      "bmi_record": 50,
      "barcode_scan": 30,
      "food_search": 20
    },
    "by_status": {
      "pending": 0,
      "completed": 95,
      "failed": 5,
      "cancelled": 0
    },
    "by_date": {
      "2025-01-20": 10,
      "2025-01-21": 15
    }
  }
}
```

## ประเภทการทำรายการ (Transaction Types)

| Type | Description | ตัวอย่าง |
|------|-------------|----------|
| `sign_up` | สมัครสมาชิก | ผู้ใช้สมัครสมาชิกใหม่ |
| `sign_in` | เข้าสู่ระบบ | ผู้ใช้เข้าสู่ระบบ |
| `bmi_record` | บันทึก BMI | บันทึกข้อมูลน้ำหนัก, ส่วนสูง, BMI |
| `barcode_scan` | สแกนบาร์โค้ด | สแกนบาร์โค้ดจากรูปภาพ |
| `food_search` | ค้นหาอาหาร | ค้นหาอาหารใน OpenFoodFacts |
| `profile_update` | อัปเดตโปรไฟล์ | อัปเดตข้อมูลผู้ใช้ |

## สถานะการทำรายการ (Status)

| Status | Description |
|--------|-------------|
| `pending` | กำลังดำเนินการ |
| `completed` | สำเร็จ |
| `failed` | ล้มเหลว |
| `cancelled` | ยกเลิก |

## การใช้งานในโค้ด

### ใช้ Helper Functions

```javascript
const { logBMIRecord, logBarcodeScan, logFoodSearch } = require('../utils/transactionLogger');

// บันทึกประวัติการบันทึก BMI
await logBMIRecord(userId, {
  weight: 70,
  height: 175,
  bmi: 23.5,
  category: 'normal',
  calories: 2000
}, req);

// บันทึกประวัติการสแกนบาร์โค้ด
await logBarcodeScan(userId, '1234567890123', productData, req);

// บันทึกประวัติการค้นหาอาหาร
await logFoodSearch(userId, 'chocolate', 10, req);
```

### ใช้ Function ทั่วไป

```javascript
const { logTransaction } = require('../utils/transactionLogger');

await logTransaction({
  user_id: userId,
  transaction_type: 'custom_action',
  action: 'ทำรายการพิเศษ',
  description: 'รายละเอียดเพิ่มเติม',
  metadata: {
    custom_data: 'value'
  },
  status: 'completed',
  req: req
});
```

## การบันทึกอัตโนมัติ

ระบบจะบันทึกประวัติอัตโนมัติเมื่อ:

1. **สมัครสมาชิก** (`/api/auth/signup`)
   - บันทึก `sign_up`
   - บันทึก `bmi_record` (ถ้ามีข้อมูล BMI)

2. **เข้าสู่ระบบ** (`/api/auth/signin`)
   - บันทึก `sign_in`

3. **สแกนบาร์โค้ด** (`/api/barcode/scan`)
   - บันทึก `barcode_scan` (ต้องส่ง `user_id` ใน request)

4. **ค้นหาอาหาร** (`/api/openfoodfacts/search`)
   - บันทึก `food_search` (ต้องส่ง `user_id` ใน query parameter)

## ตัวอย่างการใช้งาน Frontend

### JavaScript/TypeScript

```javascript
// ดึงประวัติการทำรายการ
async function getTransactionHistory(userId, options = {}) {
  const params = new URLSearchParams({
    user_id: userId,
    ...options
  });
  
  const response = await fetch(
    `http://localhost:3002/api/transactions?${params}`
  );
  
  return await response.json();
}

// ดึงสถิติ
async function getTransactionStats(userId, startDate, endDate) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate
  });
  
  const response = await fetch(
    `http://localhost:3002/api/transactions/stats/${userId}?${params}`
  );
  
  return await response.json();
}

// ใช้งาน
const history = await getTransactionHistory('user-id', {
  type: 'bmi_record',
  limit: 20
});

const stats = await getTransactionStats(
  'user-id',
  '2025-01-01',
  '2025-01-31'
);
```

## หมายเหตุสำคัญ

1. **การบันทึกประวัติเป็นแบบ Asynchronous**
   - ระบบจะไม่รอผลลัพธ์การบันทึกเพื่อไม่ให้ชะลอ response
   - ถ้าเกิดข้อผิดพลาดจะ log ไว้ใน console แต่ไม่ส่งผลต่อ response

2. **การส่ง user_id**
   - สำหรับ endpoints ที่บันทึกประวัติอัตโนมัติ ต้องส่ง `user_id` ใน request
   - สำหรับ `/api/barcode/scan`: ส่งใน `body.user_id` หรือ `query.user_id`
   - สำหรับ `/api/openfoodfacts/search`: ส่งใน `query.user_id`

3. **Performance**
   - ตารางมี indexes สำหรับการค้นหาที่รวดเร็ว
   - ใช้ GIN index สำหรับ JSONB metadata

4. **Security**
   - ตารางปิด RLS เพื่อให้ service role key ทำงานได้
   - ถ้าต้องการความปลอดภัยเพิ่มเติม ควรเปิด RLS และสร้าง policies

## Troubleshooting

### ปัญหา: ไม่พบตาราง transaction_history

**วิธีแก้:**
1. ตรวจสอบว่าได้รัน migration script แล้ว
2. ตรวจสอบใน Supabase Dashboard > Table Editor

### ปัญหา: ไม่มีการบันทึกประวัติ

**วิธีแก้:**
1. ตรวจสอบว่าได้ส่ง `user_id` ใน request แล้ว
2. ตรวจสอบ console logs สำหรับ error messages
3. ตรวจสอบว่า table มีอยู่และสามารถเข้าถึงได้

### ปัญหา: การค้นหาช้า

**วิธีแก้:**
1. ตรวจสอบว่า indexes ถูกสร้างแล้ว
2. ใช้ `limit` และ `offset` สำหรับ pagination
3. ใช้ `start_date` และ `end_date` เพื่อจำกัดช่วงเวลา


