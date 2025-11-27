# 📋 คู่มืออัปเดต Frontend

## ⚠️ สิ่งที่ต้องแก้ไขใน Frontend

### 1. ✅ **บันทึกข้อมูลแคลอรี่ (Calorie Logs)** - **ไม่ต้องแก้ไข**
- Frontend เรียก API ได้ถูกต้องแล้ว
- Endpoints ที่รองรับ:
  - `POST /api/data/calorie_logs` ✅
  - `POST /api/calorie_logs` ✅ (alternative)
  - `POST /api/data/daily_logs` ✅ (alternative)

**ตัวอย่างโค้ด (ใช้ได้แล้ว):**
```javascript
async function saveCalorieLog(userId, date, items, totalCalories) {
  try {
    const response = await fetch('http://localhost:3002/api/data/calorie_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        date: date, // YYYY-MM-DD
        total_calories: totalCalories.toString(),
        items: items
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ บันทึกข้อมูลแคลอรี่สำเร็จ');
      return true;
    } else {
      console.error('❌ บันทึกข้อมูลแคลอรี่ล้มเหลว:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}
```

---

### 2. 🔧 **บันทึกประวัติตะกร้า (Cart History)** - **ต้องแก้ไข**

#### ❌ **โค้ดเก่า (ใช้ localStorage):**
```javascript
// ❌ เก่า: บันทึกใน localStorage
localStorage.setItem('cart', JSON.stringify(cartItems));
alert('บันทึกประวัติตะกร้าเรียบร้อยแล้ว (บันทึกเฉพาะใน localStorage - ไม่สามารถเชื่อมต่อ database ได้)');
```

#### ✅ **โค้ดใหม่ (ใช้ API):**
```javascript
// ✅ ใหม่: บันทึกผ่าน API
async function saveCartToDatabase(userId, items) {
  try {
    // คำนวณ total_calories
    const totalCalories = items.reduce((sum, item) => {
      const calories = parseFloat(item.calories) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (calories * quantity);
    }, 0);

    const response = await fetch('http://localhost:3002/api/cart/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        items: items,
        total_calories: totalCalories.toString()
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ บันทึกประวัติตะกร้าเรียบร้อยแล้ว');
      alert('บันทึกประวัติตะกร้าเรียบร้อยแล้ว');
      return true;
    } else {
      // Fallback: บันทึกใน localStorage
      localStorage.setItem('cart', JSON.stringify(items));
      console.warn('⚠️ บันทึกเฉพาะใน localStorage - ไม่สามารถเชื่อมต่อ database ได้');
      alert('บันทึกเฉพาะใน localStorage - ไม่สามารถเชื่อมต่อ database ได้');
      return false;
    }
  } catch (error) {
    // Fallback: บันทึกใน localStorage
    localStorage.setItem('cart', JSON.stringify(items));
    console.error('❌ Error:', error);
    alert('บันทึกเฉพาะใน localStorage - ไม่สามารถเชื่อมต่อ database ได้');
    return false;
  }
}

// ตัวอย่างการใช้งาน:
const cartItems = [
  {
    id: "product-123",
    name: "Pancakes",
    brand: "Recipe",
    calories: "250.5",
    quantity: 1
  }
];

const userId = localStorage.getItem('userId');
await saveCartToDatabase(userId, cartItems);
```

---

### 3. 📊 **ดึงข้อมูลตะกร้า (Cart History)** - **เพิ่มฟีเจอร์ใหม่**

```javascript
// ดึงประวัติตะกร้าทั้งหมด
async function getCartHistory(userId, limit = 20, offset = 0) {
  try {
    const response = await fetch(
      `http://localhost:3002/api/cart/history?user_id=${userId}&limit=${limit}&offset=${offset}`
    );

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        carts: data.data || [],
        count: data.count,
        total: data.total
      };
    } else {
      return {
        success: false,
        error: data.error,
        carts: []
      };
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      success: false,
      error: error.message,
      carts: []
    };
  }
}

// ดึงตะกร้าล่าสุด
async function getLatestCart(userId) {
  try {
    const response = await fetch(
      `http://localhost:3002/api/cart/latest?user_id=${userId}`
    );

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        cart: data.data
      };
    } else {
      return {
        success: false,
        error: data.error,
        cart: null
      };
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      success: false,
      error: error.message,
      cart: null
    };
  }
}
```

---

### 4. 🔍 **ดึงข้อมูล BMI Records** - **ไม่ต้องแก้ไข (แต่แนะนำ)**

Backend แก้ไขแล้วให้ใช้ `id` แทน `date`/`created_at` ดังนั้น frontend ไม่ต้องแก้ไข

**แต่ถ้าต้องการเรียงลำดับตามวันที่ สามารถใช้ query parameter:**

```javascript
// ดึงข้อมูล bmi_records พร้อมเรียงลำดับ
async function getBMIRecords(userId, orderBy = 'id') {
  try {
    // orderBy สามารถเป็น: 'id', 'created_at', 'date' (ถ้ามี)
    const response = await fetch(
      `http://localhost:3002/api/data/bmi_records?user_id=${userId}&order_by=${orderBy}&order=desc`
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error:', error);
    return { error: error.message };
  }
}
```

---

## 📝 สรุปการแก้ไข

### ✅ **ไม่ต้องแก้ไข:**
1. ✅ API สำหรับบันทึกแคลอรี่ - ทำงานได้แล้ว
2. ✅ API สำหรับดึงข้อมูล BMI - ทำงานได้แล้ว

### 🔧 **ต้องแก้ไข:**
1. 🔧 **บันทึกตะกร้า** - เปลี่ยนจาก localStorage เป็น API
   - เปลี่ยนจาก: `localStorage.setItem('cart', ...)`
   - เป็น: `POST /api/cart/save`

### 🆕 **เพิ่มฟีเจอร์ใหม่ (ถ้าต้องการ):**
1. 🆕 ดึงประวัติตะกร้า: `GET /api/cart/history`
2. 🆕 ดึงตะกร้าล่าสุด: `GET /api/cart/latest`
3. 🆕 อัปเดตสถานะตะกร้า: `PUT /api/cart/:id`

---

## 🎯 ตัวอย่างโค้ดที่สมบูรณ์

### ไฟล์: `frontend/cart.js`

```javascript
const API_BASE_URL = 'http://localhost:3002/api';

// บันทึกตะกร้า
async function saveCart(userId, items) {
  try {
    const totalCalories = items.reduce((sum, item) => {
      const calories = parseFloat(item.calories) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (calories * quantity);
    }, 0);

    const response = await fetch(`${API_BASE_URL}/cart/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        items: items,
        total_calories: totalCalories.toString()
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ บันทึกตะกร้าสำเร็จ');
      return { success: true, id: data.id };
    } else {
      // Fallback: บันทึกใน localStorage
      localStorage.setItem('cart', JSON.stringify(items));
      return { success: false, error: data.error, fallback: true };
    }
  } catch (error) {
    // Fallback: บันทึกใน localStorage
    localStorage.setItem('cart', JSON.stringify(items));
    return { success: false, error: error.message, fallback: true };
  }
}

// ดึงประวัติตะกร้า
async function getCartHistory(userId, limit = 20, offset = 0) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/cart/history?user_id=${userId}&limit=${limit}&offset=${offset}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ดึงตะกร้าล่าสุด
async function getLatestCart(userId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/cart/latest?user_id=${userId}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export { saveCart, getCartHistory, getLatestCart };
```

---

## ⚠️ หมายเหตุสำคัญ

1. **API Base URL**: ตรวจสอบว่าใช้ URL ที่ถูกต้อง (`http://localhost:3002/api`)
2. **User ID**: ต้องมี `user_id` ก่อนเรียก API
3. **Error Handling**: ควรมี fallback ไปใช้ localStorage เมื่อ API ล้มเหลว
4. **CORS**: ตรวจสอบว่า backend ตั้งค่า CORS ถูกต้อง

---

## ✅ Checklist สำหรับ Frontend

- [ ] แก้ไขการบันทึกตะกร้าจาก localStorage เป็น API
- [ ] เพิ่ม error handling และ fallback
- [ ] ทดสอบการบันทึกตะกร้า
- [ ] ทดสอบการดึงประวัติตะกร้า (ถ้าต้องการ)
- [ ] ตรวจสอบว่า API Base URL ถูกต้อง
- [ ] ตรวจสอบว่า user_id มีอยู่ก่อนเรียก API


