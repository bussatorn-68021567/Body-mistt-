document.addEventListener('DOMContentLoaded', () => {
  // ----------------------------------------------------
  // 1. PRODUCT PAGE (product.html)
  // ----------------------------------------------------
  const productList = document.getElementById('product-list');
  const filterBar = document.getElementById('filter-bar');

  if (productList) {
    let allProducts = [];

    // ดึงค่า URL parameter ?mood=xxx
    const urlParams = new URLSearchParams(window.location.search);
    const activeMoodParam = urlParams.get('mood') ? urlParams.get('mood').toLowerCase() : 'all';

    // โหลดข้อมูลสินค้าจาก products.json
    fetch('products.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        allProducts = data;
        renderFilterBar(activeMoodParam);
        renderProducts(allProducts, activeMoodParam);
      })
      .catch(error => {
        console.error('Error fetching products:', error);
        productList.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>';
      });

    // สร้างปุ่มกรอง Mood
    function renderFilterBar(selectedMood) {
      if (!filterBar) return;
      const moods = [
        { id: 'all', label: 'ทั้งหมด' },
        { id: 'fresh', label: 'Fresh' },
        { id: 'sweet', label: 'Sweet' },
        { id: 'confident', label: 'Confident' },
        { id: 'romance', label: 'Romance' }
      ];

      filterBar.innerHTML = moods.map(m => `
        <button class="btn btn-filter ${m.id === selectedMood ? 'active' : ''}" data-mood="${m.id}">
          ${m.label}
        </button>
      `).join('');

      // ผูก Event Click ให้ปุ่ม Filter
      filterBar.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const mood = e.currentTarget.getAttribute('data-mood');
          filterBar.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          
          // อัปเดต URL Param โดยไม่รีโหลดหน้า
          const newUrl = new URL(window.location);
          if (mood === 'all') {
            newUrl.searchParams.delete('mood');
          } else {
            newUrl.searchParams.set('mood', mood);
          }
          window.history.pushState({}, '', newUrl);

          renderProducts(allProducts, mood);
        });
      });
    }

    // แสดงการ์ดสินค้า
    function renderProducts(products, filterMood) {
      const filtered = (filterMood === 'all' || !filterMood)
        ? products
        : products.filter(p => p.mood && p.mood.toLowerCase() === filterMood.toLowerCase());

      if (filtered.length === 0) {
        productList.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 40px 0;">ไม่พบสินค้าในหมวดหมู่นี้</p>';
        return;
      }

      productList.innerHTML = filtered.map(p => {
        const orderUrl = `order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price)}`;
        return `
          <div class="product-card">
            <div class="image-wrapper">
              <img src="${p.image}" alt="${p.name}" loading="lazy">
            </div>
            <div class="mood-tag">
              <span class="mood-indicator mood-${p.mood}"></span>
              ${p.mood}
            </div>
            <h3 class="title">${p.name}</h3>
            <p style="margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted);">${p.description || ''}</p>
            <div class="meta">
              <span class="price">฿${p.price.toLocaleString()}</span>
              <a href="${orderUrl}" class="btn btn-accent" style="padding: 8px 18px; font-size: 0.75rem;">สั่งซื้อ</a>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // ----------------------------------------------------
  // 2. ORDER PAGE (order.html)
  // ----------------------------------------------------
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    const itemsInput = document.getElementById('items');
    const totalInput = document.getElementById('total');

    // อ่านค่า item/price จาก URL Param
    const urlParams = new URLSearchParams(window.location.search);
    const itemParam = urlParams.get('item') || '';
    const priceParam = urlParams.get('price') || '';

    // เติมลงในช่องแบบอัตโนมัติ
    if (itemsInput) itemsInput.value = itemParam;
    if (totalInput) totalInput.value = priceParam;

    // จัดการ Submit Form
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const customerName = document.getElementById('customerName')?.value.trim() || '';
      const contact = document.getElementById('contact')?.value.trim() || '';
      const items = itemsInput?.value.trim() || '';
      const total = totalInput?.value.trim() || '';
      const note = document.getElementById('note')?.value.trim() || '';

      const payload = {
        id: 'ORD-' + Date.now(),
        customerName,
        contact,
        items,
        total,
        note,
        timestamp: new Date().toISOString()
      };

      try {
        const existingOrders = JSON.parse(localStorage.getItem('bodyScentOrders')) || [];
        existingOrders.push(payload);
        localStorage.setItem('bodyScentOrders', JSON.stringify(existingOrders));
      } catch (err) {
        console.error('ไม่สามารถบันทึกข้อมูลคำสั่งซื้อลง LocalStorage ได้:', err);
      }

      // เปลี่ยนหน้าไปที่ thankyou.html
      window.location.href = 'thankyou.html';
    });
  }

  // ----------------------------------------------------
  // 3. ADMIN PAGE (admin.html)
  // ----------------------------------------------------
  const ordersTable = document.getElementById('ordersTable');
  if (ordersTable) {
    const tbody = ordersTable.querySelector('tbody');
    if (tbody) {
      let orders = [];
      try {
        orders = JSON.parse(localStorage.getItem('bodyScentOrders')) || [];
      } catch (err) {
        console.error('ไม่สามารถอ่านข้อมูลคำสั่งซื้อได้:', err);
        orders = [];
      }

      if (orders.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center" style="padding: 30px; color: var(--text-muted);">
              ยังไม่มีคำสั่งซื้อ
            </td>
          </tr>
        `;
      } else {
        // เรียงลำดับจาก timestamp ล่าสุดขึ้นก่อน
        orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        tbody.innerHTML = orders.map(order => {
          const dateFormatted = order.timestamp 
            ? new Date(order.timestamp).toLocaleString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : '-';

          return `
            <tr>
              <td style="white-space: nowrap; font-size: 0.85rem;">${dateFormatted}</td>
              <td><strong>${escapeHtml(order.customerName)}</strong></td>
              <td>${escapeHtml(order.contact)}</td>
              <td>${escapeHtml(order.items)}</td>
              <td style="font-family: var(--font-serif); font-weight: 500;">฿${escapeHtml(order.total)}</td>
              <td style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(order.note || '-')}</td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // ฟังก์ชันป้องกัน XSS สั้นๆ สำหรับ Admin
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});