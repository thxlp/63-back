// ==========================================
// FRONTEND API REQUESTS - ตัวอย่างการใช้งาน API
// ==========================================

const API_BASE_URL = 'http://localhost:3002/api';

// ==========================================
// 1. REGISTER / SIGNUP
// ==========================================

async function register(email, password, weight, height, calories) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        weight: weight,      // ตัวเลข (kg)
        height: height,      // ตัวเลข (cm)
        calories: calories   // ตัวเลข (optional)
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // บันทึก user_id และข้อมูลลง localStorage
      const userId = data.id || data.user_id || data.user?.id;
      localStorage.setItem('userId', userId);
      localStorage.setItem('userData', JSON.stringify(data.user || data));
      localStorage.setItem('access_token', data.session?.access_token || '');

      console.log('✅ Register successful');
      console.log('User ID:', userId);
      console.log('User Data:', data.user);
      
      return {
        success: true,
        userId: userId,
        user: data.user,
        profile: data.profile,
        session: data.session
      };
    } else {
      console.error('❌ Register failed:', data.error);
      return {
        success: false,
        error: data.error || 'Registration failed'
      };
    }
  } catch (error) {
    console.error('❌ Register error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ตัวอย่างการใช้งาน:
// register('test@example.com', 'password123', 70, 175, 2000);

// ==========================================
// 2. LOGIN / SIGNIN
// ==========================================

async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',  // ⚠️ ต้องใช้ POST ไม่ใช่ GET
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // บันทึก user_id และข้อมูลลง localStorage
      const userId = data.id || data.user_id || data.user?.id;
      localStorage.setItem('userId', userId);
      localStorage.setItem('userData', JSON.stringify(data.user || data));
      localStorage.setItem('access_token', data.session?.access_token || '');

      console.log('✅ Login successful');
      console.log('User ID:', userId);
      console.log('Profile:', {
        weight: data.weight || data.user?.weight || data.profile?.weight,
        height: data.height || data.user?.height || data.profile?.height,
        bmi: data.bmi || data.user?.bmi || data.profile?.bmi,
        calories: data.calories || data.user?.calories || data.profile?.calories
      });

      return {
        success: true,
        userId: userId,
        user: data.user,
        profile: data.profile,
        session: data.session
      };
    } else {
      console.error('❌ Login failed:', data.error);
      return {
        success: false,
        error: data.error || 'Login failed'
      };
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ตัวอย่างการใช้งาน:
// login('test@example.com', 'password123');

// ==========================================
// 3. GET PROFILE - วิธีที่ 1: ใช้ user_id (แนะนำ)
// ==========================================

async function getProfile(userId) {
  try {
    // ถ้าไม่มี userId ให้ดึงจาก localStorage
    const userIdToUse = userId || 
                       localStorage.getItem('userId') || 
                       JSON.parse(localStorage.getItem('userData'))?.id ||
                       JSON.parse(localStorage.getItem('userData'))?.user?.id;

    if (!userIdToUse) {
      console.error('⚠ ไม่พบ user_id');
      return {
        success: false,
        error: 'ไม่พบ user_id'
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/auth/profile?user_id=${userIdToUse}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Profile data retrieved');
      console.log('Profile:', data);
      
      return {
        success: true,
        id: data.id,
        user_id: data.user_id,
        username: data.username,
        email: data.email,
        weight: data.weight,
        height: data.height,
        bmi: data.bmi,
        calories: data.calories
      };
    } else {
      console.error('❌ Get profile failed:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to get profile'
      };
    }
  } catch (error) {
    console.error('❌ Get profile error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ตัวอย่างการใช้งาน:
// getProfile(); // จะใช้ userId จาก localStorage
// หรือ
// getProfile('7064ee7c-0e44-46ec-8bc5-5315e05ed05f');

// ==========================================
// 4. GET PROFILE - วิธีที่ 2: ใช้ Bearer Token
// ==========================================

async function getProfileWithToken() {
  try {
    const token = localStorage.getItem('access_token');

    if (!token) {
      console.error('⚠ ไม่พบ access_token');
      return {
        success: false,
        error: 'ไม่พบ access_token'
      };
    }

    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Profile data retrieved');
      return {
        success: true,
        ...data
      };
    } else {
      console.error('❌ Get profile failed:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to get profile'
      };
    }
  } catch (error) {
    console.error('❌ Get profile error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// 5. GET PROFILE - วิธีที่ 3: ใช้ POST method
// ==========================================

async function getProfilePost(userId) {
  try {
    const userIdToUse = userId || localStorage.getItem('userId');

    if (!userIdToUse) {
      return {
        success: false,
        error: 'ไม่พบ user_id'
      };
    }

    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userIdToUse
      })
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        ...data
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to get profile'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// 6. GET PROFILE - วิธีที่ 4: ใช้ /api/users/profile (มี 's')
// ==========================================

async function getProfileFromUsers(userId) {
  try {
    const userIdToUse = userId || localStorage.getItem('userId');

    if (!userIdToUse) {
      return {
        success: false,
        error: 'ไม่พบ user_id'
      };
    }

    // ⚠️ ใช้ /api/users/profile (มี 's') ไม่ใช่ /api/user/profile
    const response = await fetch(
      `${API_BASE_URL}/users/profile?user_id=${userIdToUse}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        ...data
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to get profile'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// 7. GET PROFILE - วิธีที่ 5: ใช้ /api/auth/user
// ==========================================

async function getProfileFromUser(userId) {
  try {
    const userIdToUse = userId || localStorage.getItem('userId');

    if (!userIdToUse) {
      return {
        success: false,
        error: 'ไม่พบ user_id'
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/auth/user?user_id=${userIdToUse}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        ...data
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to get profile'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// 8. GET CURRENT USER - ใช้ Bearer Token (ต้องมี token)
// ==========================================

async function getCurrentUser() {
  try {
    const token = localStorage.getItem('access_token');

    if (!token) {
      return {
        success: false,
        error: 'ไม่พบ access_token'
      };
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        ...data
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to get current user'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// 9. UPDATE PROFILE PAGE - ตัวอย่างการใช้งานจริง
// ==========================================

async function loadProfilePage() {
  console.log('=== เริ่มดึงข้อมูลโปรไฟล์ ===');
  
  // วิธีที่ 1: ดึง user_id จาก localStorage
  let userId = localStorage.getItem('userId');
  
  // ถ้าไม่มี ลองดึงจาก userData
  if (!userId) {
    try {
      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        userId = userData?.id || userData?.user_id || userData?.user?.id;
      }
    } catch (e) {
      console.error('Error parsing userData:', e);
    }
  }

  console.log('User ID (from localStorage):', userId || '❌ ไม่มี user_id');

  if (!userId) {
    console.error('⚠⚠⚠ ไม่พบ user_id เลย!');
    console.log('ตรวจสอบ localStorage:');
    console.log('  localStorage.getItem("userId"):', localStorage.getItem('userId'));
    console.log('  localStorage.getItem("user_id"):', localStorage.getItem('user_id'));
    console.log('  localStorage.getItem("userData"):', localStorage.getItem('userData'));
    
    // ลองดึงข้อมูลจาก API โดยไม่มี user_id (จะได้ error 401)
    const result = await getProfile();
    if (!result.success) {
      console.error('❌ ไม่สามารถดึงข้อมูลจาก API ได้:', result.error);
      console.log('💡 คำแนะนำ: ต้อง login หรือ register ก่อน');
      return null;
    }
    return null;
  }

  // ลองเรียก API หลาย endpoints
  console.log('🔄 ลองเรียก API endpoints...');
  
  // ลอง endpoint ที่ 1
  let profileData = await getProfile(userId);
  
  // ถ้าไม่ได้ ลอง endpoint ที่ 2
  if (!profileData.success) {
    console.log('🔄 ลอง endpoint /api/users/profile...');
    profileData = await getProfileFromUsers(userId);
  }
  
  // ถ้ายังไม่ได้ ลอง endpoint ที่ 3
  if (!profileData.success) {
    console.log('🔄 ลอง endpoint /api/auth/user...');
    profileData = await getProfileFromUser(userId);
  }
  
  // ถ้ายังไม่ได้ ลอง endpoint ที่ 4 (ใช้ POST)
  if (!profileData.success) {
    console.log('🔄 ลอง endpoint POST /api/auth/profile...');
    profileData = await getProfilePost(userId);
  }
  
  // ถ้ายังไม่ได้ ลองใช้ token
  if (!profileData.success) {
    const token = localStorage.getItem('access_token');
    if (token) {
      console.log('🔄 ลองใช้ Bearer Token...');
      profileData = await getProfileWithToken();
    }
  }

  if (profileData.success) {
    console.log('✅ ดึงข้อมูลสำเร็จ');
    console.log('Profile Data:', profileData);
    
    // แสดงข้อมูลในหน้าเว็บ
    if (typeof document !== 'undefined') {
      // ถ้าเป็น browser environment
      const usernameEl = document.getElementById('username');
      const weightEl = document.getElementById('weight');
      const heightEl = document.getElementById('height');
      const bmiEl = document.getElementById('bmi');
      const caloriesEl = document.getElementById('calories');

      if (usernameEl) usernameEl.textContent = profileData.username || profileData.email || '-';
      if (weightEl) weightEl.textContent = profileData.weight || '-';
      if (heightEl) heightEl.textContent = profileData.height || '-';
      if (bmiEl) bmiEl.textContent = profileData.bmi || '-';
      if (caloriesEl) caloriesEl.textContent = profileData.calories || '-';
    }
    
    return profileData;
  } else {
    console.error('❌ ไม่สามารถดึงข้อมูลได้จากทุก endpoint');
    console.error('Error:', profileData.error);
    return null;
  }
}

// ==========================================
// 10. EXAMPLE - Workflow เสร็จสมบูรณ์
// ==========================================

async function completeWorkflow() {
  // Step 1: Register
  console.log('Step 1: Registering...');
  const registerResult = await register(
    'test@example.com',
    'password123',
    70,   // weight (kg)
    175,  // height (cm)
    2000  // calories (optional)
  );

  if (!registerResult.success) {
    console.error('Registration failed:', registerResult.error);
    return;
  }

  const userId = registerResult.userId;
  console.log('✅ Registered. User ID:', userId);

  // Step 2: Wait a bit for data to be saved
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 3: Get Profile
  console.log('Step 2: Getting profile...');
  const profileResult = await getProfile(userId);

  if (profileResult.success) {
    console.log('✅ Profile retrieved:');
    console.log('  Weight:', profileResult.weight);
    console.log('  Height:', profileResult.height);
    console.log('  BMI:', profileResult.bmi);
    console.log('  Calories:', profileResult.calories);
  } else {
    console.error('Failed to get profile:', profileResult.error);
  }
}

// ==========================================
// 11. HELPER FUNCTIONS
// ==========================================

// ฟังก์ชันสำหรับตรวจสอบ localStorage
function checkLocalStorage() {
  console.log('=== ตรวจสอบ localStorage ===');
  console.log('userId:', localStorage.getItem('userId'));
  console.log('user_id:', localStorage.getItem('user_id'));
  console.log('access_token:', localStorage.getItem('access_token') ? 'มี' : 'ไม่มี');
  
  const userDataStr = localStorage.getItem('userData');
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      console.log('userData:', userData);
      console.log('userData.id:', userData?.id);
      console.log('userData.user_id:', userData?.user_id);
      console.log('userData.user?.id:', userData?.user?.id);
    } catch (e) {
      console.error('Error parsing userData:', e);
    }
  } else {
    console.log('userData: ไม่มี');
  }
}

// ฟังก์ชันสำหรับ clear localStorage
function clearStorage() {
  localStorage.removeItem('userId');
  localStorage.removeItem('user_id');
  localStorage.removeItem('userData');
  localStorage.removeItem('access_token');
  console.log('✅ localStorage cleared');
}

// Export functions (ถ้าใช้ ES6 modules)
// export {
//   register,
//   login,
//   getProfile,
//   getProfileWithToken,
//   getProfilePost,
//   getProfileFromUsers,
//   getProfileFromUser,
//   getCurrentUser,
//   loadProfilePage,
//   completeWorkflow,
//   checkLocalStorage,
//   clearStorage
// };

// หรือใช้ใน HTML โดย include script tag:
// <script src="FRONTEND_API_REQUESTS.js"></script>

