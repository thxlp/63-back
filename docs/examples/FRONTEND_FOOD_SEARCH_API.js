// ==========================================
// FRONTEND FOOD SEARCH API - ตัวอย่างการใช้งาน API ค้นหาอาหาร
// ==========================================

const API_BASE_URL = 'http://localhost:3002/api';

// ==========================================
// 1. SEARCH FOOD - ค้นหาอาหาร
// ==========================================

async function searchFood(query, page = 1, pageSize = 20) {
  try {
    console.log('🔍 Searching for:', query);
    
    const response = await fetch(
      `${API_BASE_URL}/openfoodfacts/search?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Search successful');
      console.log('Found products:', data.count);
      console.log('Total products:', data.total_products);
      
      return {
        success: true,
        products: data.products || [],
        count: data.count,
        total: data.total_products,
        page: data.page,
        pageSize: data.page_size
      };
    } else {
      console.error('❌ Search failed:', data.error);
      return {
        success: false,
        error: data.error || 'Search failed',
        details: data.details,
        products: []
      };
    }
  } catch (error) {
    console.error('❌ Search error:', error);
    return {
      success: false,
      error: error.message,
      products: []
    };
  }
}

// ตัวอย่างการใช้งาน:
// searchFood('coca cola').then(result => {
//   if (result.success) {
//     console.log('Products:', result.products);
//   }
// });

// ==========================================
// 2. GET PRODUCT BY BARCODE - ดึงข้อมูลสินค้าตาม Barcode
// ==========================================

async function getProductByBarcode(barcode) {
  try {
    console.log('📦 Getting product by barcode:', barcode);
    
    const response = await fetch(
      `${API_BASE_URL}/openfoodfacts/product/${barcode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Product found:', data.product.name);
      return {
        success: true,
        product: data.product
      };
    } else {
      console.error('❌ Product not found:', data.error);
      return {
        success: false,
        error: data.error || 'Product not found',
        product: null
      };
    }
  } catch (error) {
    console.error('❌ Get product error:', error);
    return {
      success: false,
      error: error.message,
      product: null
    };
  }
}

// ตัวอย่างการใช้งาน:
// getProductByBarcode('5449000000996').then(result => {
//   if (result.success) {
//     console.log('Product:', result.product);
//   }
// });

// ==========================================
// 3. GET RANDOM PRODUCTS - ดึงข้อมูลสินค้าแบบสุ่ม
// ==========================================

async function getRandomProducts(count = 5) {
  try {
    console.log('🎲 Getting random products:', count);
    
    const response = await fetch(
      `${API_BASE_URL}/openfoodfacts/random?count=${count}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Random products found:', data.count);
      return {
        success: true,
        products: data.products || [],
        count: data.count
      };
    } else {
      console.error('❌ Get random products failed:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to get random products',
        products: []
      };
    }
  } catch (error) {
    console.error('❌ Get random products error:', error);
    return {
      success: false,
      error: error.message,
      products: []
    };
  }
}

// ตัวอย่างการใช้งาน:
// getRandomProducts(10).then(result => {
//   if (result.success) {
//     console.log('Random products:', result.products);
//   }
// });

// ==========================================
// 4. DISPLAY PRODUCTS IN HTML - แสดงผลในหน้าเว็บ
// ==========================================

function displayProducts(products, containerId) {
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error('Container not found:', containerId);
    return;
  }

  if (!products || products.length === 0) {
    container.innerHTML = '<p>ไม่พบสินค้า</p>';
    return;
  }

  const html = products.map(product => `
    <div class="product-card" data-barcode="${product.barcode || product.id}">
      ${product.image_url ? `
        <img src="${product.image_url}" 
             alt="${product.name}" 
             onerror="this.src='https://via.placeholder.com/200?text=No+Image'"
             style="width: 100%; max-width: 200px; height: auto;">
      ` : ''}
      <h3>${product.name || 'ไม่ระบุชื่อ'}</h3>
      ${product.brand ? `<p><strong>Brand:</strong> ${product.brand}</p>` : ''}
      ${product.nutriscore_grade ? `
        <p><strong>Nutri-Score:</strong> 
          <span class="nutriscore-${product.nutriscore_grade.toLowerCase()}">
            ${product.nutriscore_grade.toUpperCase()}
          </span>
        </p>
      ` : ''}
      ${product.nutrition?.energy ? `
        <p><strong>Energy:</strong> ${product.nutrition.energy} ${product.nutrition.energy_unit || 'kcal'}</p>
      ` : ''}
      ${product.nutrition?.proteins ? `
        <p><strong>Proteins:</strong> ${product.nutrition.proteins} ${product.nutrition.proteins_unit || 'g'}</p>
      ` : ''}
      ${product.nutrition?.carbohydrates ? `
        <p><strong>Carbs:</strong> ${product.nutrition.carbohydrates} ${product.nutrition.carbohydrates_unit || 'g'}</p>
      ` : ''}
      ${product.nutrition?.fat ? `
        <p><strong>Fat:</strong> ${product.nutrition.fat} ${product.nutrition.fat_unit || 'g'}</p>
      ` : ''}
      ${product.barcode ? `
        <button onclick="getProductDetails('${product.barcode}')">
          ดูรายละเอียด
        </button>
      ` : ''}
    </div>
  `).join('');

  container.innerHTML = html;
}

// ==========================================
// 5. SEARCH FORM HANDLER - จัดการฟอร์มค้นหา
// ==========================================

function setupSearchForm(formId, resultsContainerId) {
  const form = document.getElementById(formId);
  
  if (!form) {
    console.error('Form not found:', formId);
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const queryInput = form.querySelector('input[name="query"]') || form.querySelector('input[type="search"]') || form.querySelector('input[type="text"]');
    const query = queryInput?.value?.trim();

    if (!query) {
      alert('กรุณากรอกคำค้นหา');
      return;
    }

    // แสดง loading
    const container = document.getElementById(resultsContainerId);
    if (container) {
      container.innerHTML = '<p>กำลังค้นหา...</p>';
    }

    // ค้นหา
    const result = await searchFood(query);

    if (result.success) {
      displayProducts(result.products, resultsContainerId);
      
      // แสดงจำนวนผลลัพธ์
      const countElement = document.getElementById('search-count');
      if (countElement) {
        countElement.textContent = `พบ ${result.count} รายการ (จากทั้งหมด ${result.total} รายการ)`;
      }
    } else {
      if (container) {
        container.innerHTML = `
          <p style="color: red;">❌ ${result.error || 'เกิดข้อผิดพลาด'}</p>
          ${result.details ? `<p>${result.details}</p>` : ''}
        `;
      }
    }
  });
}

// ==========================================
// 6. GET PRODUCT DETAILS - ดึงรายละเอียดสินค้า
// ==========================================

async function getProductDetails(barcode) {
  try {
    const result = await getProductByBarcode(barcode);
    
    if (result.success) {
      // แสดง modal หรือ navigate ไปหน้า detail
      console.log('Product details:', result.product);
      
      // ตัวอย่าง: แสดงใน modal
      const modal = document.getElementById('product-modal');
      if (modal) {
        const product = result.product;
        modal.innerHTML = `
          <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <h2>${product.name}</h2>
            ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" style="max-width: 300px;">` : ''}
            ${product.brand ? `<p><strong>Brand:</strong> ${product.brand}</p>` : ''}
            ${product.ingredients_text ? `
              <div>
                <h3>ส่วนประกอบ:</h3>
                <p>${product.ingredients_text}</p>
              </div>
            ` : ''}
            ${product.nutrition ? `
              <div>
                <h3>ข้อมูลโภชนาการ:</h3>
                <ul>
                  ${product.nutrition.energy ? `<li>Energy: ${product.nutrition.energy} ${product.nutrition.energy_unit || 'kcal'}</li>` : ''}
                  ${product.nutrition.proteins ? `<li>Proteins: ${product.nutrition.proteins} ${product.nutrition.proteins_unit || 'g'}</li>` : ''}
                  ${product.nutrition.carbohydrates ? `<li>Carbs: ${product.nutrition.carbohydrates} ${product.nutrition.carbohydrates_unit || 'g'}</li>` : ''}
                  ${product.nutrition.fat ? `<li>Fat: ${product.nutrition.fat} ${product.nutrition.fat_unit || 'g'}</li>` : ''}
                </ul>
              </div>
            ` : ''}
          </div>
        `;
        modal.style.display = 'block';
      }
    } else {
      alert(result.error || 'ไม่พบข้อมูลสินค้า');
    }
  } catch (error) {
    console.error('Error getting product details:', error);
    alert('เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า');
  }
}

function closeModal() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ==========================================
// 7. EXAMPLE HTML STRUCTURE
// ==========================================

/*
<!-- HTML Structure Example -->
<!DOCTYPE html>
<html>
<head>
  <title>Food Search</title>
  <style>
    .product-card {
      border: 1px solid #ddd;
      padding: 15px;
      margin: 10px;
      border-radius: 8px;
      display: inline-block;
      width: 250px;
      vertical-align: top;
    }
    .product-card img {
      max-width: 100%;
      height: auto;
    }
    .nutriscore-a { color: green; font-weight: bold; }
    .nutriscore-b { color: lightgreen; font-weight: bold; }
    .nutriscore-c { color: yellow; font-weight: bold; }
    .nutriscore-d { color: orange; font-weight: bold; }
    .nutriscore-e { color: red; font-weight: bold; }
    #product-modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
    }
    .modal-content {
      background-color: white;
      margin: 15% auto;
      padding: 20px;
      border: 1px solid #888;
      width: 80%;
      max-width: 600px;
      border-radius: 8px;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    .close:hover {
      color: black;
    }
  </style>
</head>
<body>
  <h1>ค้นหาอาหาร</h1>
  
  <form id="search-form">
    <input type="text" name="query" placeholder="ค้นหาอาหาร..." required>
    <button type="submit">ค้นหา</button>
  </form>
  
  <div id="search-count"></div>
  <div id="search-results"></div>
  
  <div id="product-modal"></div>
  
  <script src="FRONTEND_FOOD_SEARCH_API.js"></script>
  <script>
    // Setup search form
    setupSearchForm('search-form', 'search-results');
    
    // Load random products on page load
    window.addEventListener('DOMContentLoaded', async () => {
      const result = await getRandomProducts(6);
      if (result.success) {
        displayProducts(result.products, 'search-results');
      }
    });
  </script>
</body>
</html>
*/

// ==========================================
// 8. ADVANCED SEARCH WITH PAGINATION
// ==========================================

async function searchFoodWithPagination(query, page = 1, pageSize = 20) {
  try {
    const result = await searchFood(query, page, pageSize);
    
    if (result.success) {
      // แสดง pagination controls
      const totalPages = Math.ceil(result.total / pageSize);
      
      return {
        ...result,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error with pagination:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// Export functions (if using ES6 modules)
// ==========================================

// export {
//   searchFood,
//   getProductByBarcode,
//   getRandomProducts,
//   displayProducts,
//   setupSearchForm,
//   getProductDetails,
//   searchFoodWithPagination
// };

// ==========================================
// USAGE EXAMPLES
// ==========================================

/*
// Example 1: Simple search
searchFood('coca cola').then(result => {
  if (result.success) {
    result.products.forEach(product => {
      console.log(product.name, product.barcode);
    });
  }
});

// Example 2: Search with pagination
searchFoodWithPagination('chocolate', 1, 10).then(result => {
  if (result.success) {
    console.log(`Page ${result.currentPage} of ${result.totalPages}`);
    console.log('Products:', result.products);
  }
});

// Example 3: Get product by barcode
getProductByBarcode('5449000000996').then(result => {
  if (result.success) {
    console.log('Product:', result.product);
    console.log('Nutrition:', result.product.nutrition);
  }
});

// Example 4: Display in HTML
searchFood('pizza').then(result => {
  if (result.success) {
    displayProducts(result.products, 'my-container');
  }
});
*/

