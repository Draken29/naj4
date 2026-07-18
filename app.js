// Cookie helper functions
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
}

// Client-side Database Mock using LocalStorage
const DEFAULT_DB = {
    users: [
        { email: "maryam@gmail.com", password: "1212", role: "customer" },
        { email: "najma@gmail.com", password: "1313", role: "admin" }
    ],
    products: [],
    bookings: [
        {
            id: 1781903843243,
            email: "maryam@gmail.com",
            productName: "قلادة ذهب",
            date: "2026-06-19T21:17:23.243Z"
        }
    ]
};

function getDB() {
    const dbStr = localStorage.getItem('najma_db');
    if (!dbStr) {
        localStorage.setItem('najma_db', JSON.stringify(DEFAULT_DB));
        return DEFAULT_DB;
    }
    return JSON.parse(dbStr);
}

function saveDB(db) {
    localStorage.setItem('najma_db', JSON.stringify(db));
}

// Helper to convert File to Base64 data URL
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// State Management
let currentUser = null;
let isLoginMode = true;

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    admin: document.getElementById('admin-view'),
    store: document.getElementById('store-view')
};

const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authBtn = document.getElementById('auth-btn');
const authSwitchText = document.getElementById('auth-switch-text');
const switchAuthLink = document.getElementById('switch-auth-link');

const toast = document.getElementById('toast');
const bookingModal = document.getElementById('booking-modal');
const editModal = document.getElementById('edit-modal');
let selectedProductForBooking = null;

// Initialize App
function initApp() {
    const sessionCookie = getCookie('najma_session');
    if (sessionCookie) {
        try {
            currentUser = JSON.parse(sessionCookie);
            switchView(currentUser.role === 'admin' ? 'admin' : 'store');
            loadData();
        } catch (e) {
            eraseCookie('najma_session');
            switchView('login');
        }
    } else {
        switchView('login');
    }
}

// Fetch Data from Mock DB
function loadData() {
    fetchProducts();
    if (currentUser && currentUser.role === 'admin') {
        fetchBookings();
    }
}

function fetchProducts() {
    try {
        const db = getDB();
        renderProducts(db.products);
    } catch (error) {
        showToast('حدث خطأ أثناء تحميل المنتجات 😢');
    }
}

function fetchBookings() {
    try {
        const db = getDB();
        renderBookings(db.bookings);
    } catch (error) {
        console.error(error);
    }
}

// Auth Switcher
switchAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.innerText = 'تسجيل الدخول';
        authBtn.innerText = 'دخول';
        authSwitchText.innerText = 'جديدة معانا؟';
        switchAuthLink.innerText = 'سجلي حساب جديد';
    } else {
        authTitle.innerText = 'إنشاء حساب جديد';
        authBtn.innerText = 'سجلي الآن';
        authSwitchText.innerText = 'عندك حساب؟';
        switchAuthLink.innerText = 'سجلي دخول';
    }
});

// Auth Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
        showToast('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }

    const db = getDB();

    if (isLoginMode) {
        // Admin hardcoded check or general check
        let user;
        if (email === 'najma@gmail.com' && password === '1313') {
            user = { email, role: 'admin' };
        } else {
            user = db.users.find(u => u.email === email && u.password === password);
        }

        if (!user) {
            showToast('بيانات الدخول غير صحيحة 🚫');
            return;
        }

        currentUser = user;
        setCookie('najma_session', JSON.stringify(currentUser), 7);
        showToast('تم الدخول بنجاح ✨');
    } else {
        // Register Mode
        if (db.users.find(u => u.email === email)) {
            showToast('البريد الإلكتروني موجود مسبقاً 🚫');
            return;
        }

        const newUser = { email, password, role: 'customer' };
        db.users.push(newUser);
        saveDB(db);

        currentUser = { email: newUser.email, role: newUser.role };
        setCookie('najma_session', JSON.stringify(currentUser), 7);
        showToast('تم التسجيل بنجاح ✨');
    }

    authForm.reset();
    switchView(currentUser.role === 'admin' ? 'admin' : 'store');
    loadData();
});

// Logout
function logout() {
    currentUser = null;
    eraseCookie('najma_session');
    switchView('login');
    showToast('تم تسجيل الخروج. نراكِ قريباً! 👋');
}

// Admin Add Product
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prod-name').value;
    const imageFile = document.getElementById('prod-image').files[0];
    const price = document.getElementById('prod-price').value;

    let imageData = '';
    if (imageFile) {
        try {
            imageData = await fileToBase64(imageFile);
        } catch (err) {
            showToast('خطأ في معالجة الصورة.');
            return;
        }
    }

    try {
        const db = getDB();
        const newProduct = { id: Date.now(), name, image: imageData, price };
        db.products.push(newProduct);
        saveDB(db);
        
        document.getElementById('add-product-form').reset();
        fetchProducts();
        showToast('تمت إضافة المنتج بنجاح! 🎀');
    } catch (error) {
        showToast('حدث خطأ أثناء إضافة المنتج.');
    }
});

// Edit Product Functions
function openEditModal(id, name, price) {
    document.getElementById('edit-prod-id').value = id;
    document.getElementById('edit-prod-name').value = name;
    document.getElementById('edit-prod-price').value = price;
    document.getElementById('edit-prod-image').value = '';
    editModal.classList.remove('hidden');
}

function closeEditModal() {
    editModal.classList.add('hidden');
}

document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-prod-id').value);
    const name = document.getElementById('edit-prod-name').value;
    const price = document.getElementById('edit-prod-price').value;
    const imageFile = document.getElementById('edit-prod-image').files[0];

    try {
        const db = getDB();
        const productIndex = db.products.findIndex(p => p.id === id);
        if (productIndex === -1) {
            showToast('المنتج غير موجود');
            return;
        }

        const product = db.products[productIndex];
        product.name = name || product.name;
        product.price = price || product.price;

        if (imageFile) {
            product.image = await fileToBase64(imageFile);
        }

        saveDB(db);
        closeEditModal();
        fetchProducts();
        showToast('تم تعديل المنتج بنجاح! ✨');
    } catch (error) {
        showToast('حدث خطأ أثناء تعديل المنتج.');
    }
});

async function deleteProduct(id) {
    try {
        const db = getDB();
        db.products = db.products.filter(p => p.id !== id);
        saveDB(db);
        fetchProducts();
        showToast('تم حذف المنتج بنجاح 🗑️');
    } catch (error) {
        showToast('خطأ أثناء الحذف.');
    }
}

// Rendering Products
function renderProducts(products) {
    const adminGrid = document.getElementById('admin-products-grid');
    const customerGrid = document.getElementById('customer-products-grid');
    
    let adminHTML = '';
    let customerHTML = '';

    if (products.length === 0) {
        const emptyMsg = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light);">لا توجد منتجات حالياً 🥺</p>';
        adminGrid.innerHTML = emptyMsg;
        customerGrid.innerHTML = emptyMsg;
        return;
    }

    products.forEach(p => {
        const imgSrc = p.image ? p.image : 'https://via.placeholder.com/400x250?text=صورة+غير+متاحة';
        const safeName = p.name ? p.name : 'بدون اسم';
        const safePrice = p.price ? p.price : '';
        const escapedName = safeName.replace(/'/g, "\\'");
        
        // Admin Card
        adminHTML += `
            <div class="product-card">
                <img src="${imgSrc}" alt="${safeName}" class="product-image" onerror="this.onerror=null; this.style.display='none';">
                <div class="product-info">
                    <h4 class="product-name">${safeName}</h4>
                    <div class="product-price">${safePrice}</div>
                    <div class="admin-controls">
                        <button class="btn" style="background: #FFE4E1; color: #FF6B6B; padding: 10px; border-radius: 10px; flex: 1;" onclick="deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i> حذف</button>
                        <button class="btn" style="background: #E0F2FE; color: var(--primary-dark); padding: 10px; border-radius: 10px; flex: 1;" onclick="openEditModal(${p.id}, '${escapedName}', '${safePrice}')"><i class="fa-solid fa-pen"></i> تعديل</button>
                    </div>
                </div>
            </div>
        `;

        // Customer Card
        customerHTML += `
            <div class="product-card">
                <img src="${imgSrc}" alt="${safeName}" class="product-image" onerror="this.onerror=null; this.style.display='none';">
                <div class="product-info">
                    <h4 class="product-name">${safeName}</h4>
                    <div class="product-price">${safePrice}</div>
                    <button class="btn primary-btn" onclick="openBookingModal('${escapedName}')"><i class="fa-solid fa-bag-shopping"></i> احجزي الآن</button>
                </div>
            </div>
        `;
    });

    adminGrid.innerHTML = adminHTML;
    customerGrid.innerHTML = customerHTML;
}

// Rendering Bookings (Admin only)
function renderBookings(bookings) {
    const tbody = document.getElementById('bookings-body');
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">لا توجد حجوزات حالياً</td></tr>';
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>${b.email}</td>
            <td>${b.productName}</td>
            <td dir="ltr">${new Date(b.date).toLocaleDateString('ar-EG')}</td>
        </tr>
    `).join('');
}

// View Management
function switchView(viewName) {
    Object.keys(views).forEach(k => {
        if(views[k]) {
            views[k].classList.add('hidden');
            views[k].classList.remove('active');
        }
    });
    
    if(views[viewName]) {
        views[viewName].classList.remove('hidden');
        // slight delay for animation
        setTimeout(() => views[viewName].classList.add('active'), 50);
    }

    if (viewName === 'admin' && currentUser) {
        document.getElementById('admin-name').innerText = `أهلاً، ${currentUser.email}`;
    } else if (viewName === 'store' && currentUser) {
        document.getElementById('customer-name').innerText = `أهلاً، ${currentUser.email} الجميلة 🎀`;
    }
}

// Booking System
function openBookingModal(productName) {
    selectedProductForBooking = productName;
    document.getElementById('booking-item-name').innerText = productName;
    bookingModal.classList.remove('hidden');
}

function closeBookingModal() {
    bookingModal.classList.add('hidden');
    selectedProductForBooking = null;
}

async function confirmBooking() {
    try {
        const db = getDB();
        const newBooking = {
            id: Date.now(),
            email: currentUser.email,
            productName: selectedProductForBooking,
            date: new Date().toISOString()
        };
        db.bookings.push(newBooking);
        saveDB(db);

        const itemName = selectedProductForBooking;
        closeBookingModal();
        showToast(`تم حجز "${itemName}" بنجاح! سيتم التواصل معكِ قريباً 🎉`);
    } catch (error) {
        showToast('حدث خطأ أثناء الحجز. حاولي مرة أخرى.');
    }
}

// Toast Notifications
let toastTimeout;
function showToast(message) {
    toast.innerText = message;
    toast.classList.remove('hidden');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Start app
initApp();
