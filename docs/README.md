# 📚 Documentation

โฟลเดอร์นี้เก็บ documentation และ example code

## 📂 โครงสร้าง

```
docs/
└── examples/        # Example code for frontend developers
```

---

## 📋 Examples

### `examples/FRONTEND_API_REQUESTS.js`
**หน้าที่**: ตัวอย่างโค้ด JavaScript สำหรับเรียกใช้ API ทั้งหมด

**เนื้อหา**:
- ตัวอย่างการ register/login
- ตัวอย่างการดึงข้อมูล profile
- ตัวอย่างการจัดการ BMI records
- ตัวอย่างการค้นหาอาหาร
- ตัวอย่างการสแกน barcode

**การใช้งาน**:
```javascript
// Copy functions ที่ต้องการไปใช้ใน frontend
import { register, login, getProfile } from './examples/FRONTEND_API_REQUESTS.js';
```

---

### `examples/FRONTEND_FOOD_SEARCH_API.js`
**หน้าที่**: ตัวอย่างโค้ดสำหรับการค้นหาอาหารด้วย OpenFoodFacts API

**เนื้อหา**:
- ตัวอย่างการค้นหาอาหาร
- ตัวอย่างการดึงข้อมูลสินค้าตาม barcode
- ตัวอย่างการดึงสินค้าแบบสุ่ม

**การใช้งาน**:
```javascript
// Copy functions ที่ต้องการไปใช้ใน frontend
import { searchFood, getProductByBarcode } from './examples/FRONTEND_FOOD_SEARCH_API.js';
```

---

## 📖 เอกสารเพิ่มเติม

- [README.md](../README.md) - เอกสารหลักของโปรเจค
- [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) - โครงสร้างโปรเจค
- [scripts/README.md](../scripts/README.md) - เอกสาร scripts
- [database/README.md](../database/README.md) - เอกสาร database

---

## 🔧 การเพิ่ม Example ใหม่

### Template

```javascript
// docs/examples/MY_NEW_EXAMPLE.js
/**
 * Example: Description
 * 
 * ตัวอย่างการใช้งาน [Feature Name]
 * 
 * @example
 * import { myFunction } from './examples/MY_NEW_EXAMPLE.js';
 * const result = await myFunction();
 */

const API_BASE_URL = 'http://localhost:3002/api';

/**
 * Description of function
 * @param {string} param1 - Description
 * @returns {Promise<Object>} Response data
 */
export async function myFunction(param1) {
  try {
    const response = await fetch(`${API_BASE_URL}/endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ param1 }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

---

## 📝 Best Practices

### ✅ ควรทำ
- เขียน comment อธิบายแต่ละ function
- ใส่ตัวอย่างการใช้งาน (JSDoc)
- ใช้ async/await สำหรับ async operations
- มี error handling
- ใช้ environment variable สำหรับ API URL

### ❌ ไม่ควรทำ
- Hardcode credentials
- ไม่มี error handling
- ไม่มี documentation

---

**อัปเดตล่าสุด**: 2025-01-20

