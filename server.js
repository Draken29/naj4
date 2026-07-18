const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Use memory storage instead of disk - converts image to base64
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // max 5MB
});

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Initialize Database if not exists
if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        users: [],
        products: [],
        bookings: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Cookie options
const COOKIE_OPTIONS = {
    httpOnly: false,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
    path: '/'
};

// Routes
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'البريد الإلكتروني موجود مسبقاً' });
    }

    const newUser = { email, password, role: 'customer' };
    db.users.push(newUser);
    writeDB(db);

    // Set session cookie after registration
    const sessionData = JSON.stringify({ email: newUser.email, role: newUser.role });
    res.cookie('najma_session', sessionData, COOKIE_OPTIONS);

    res.json({ message: 'تم التسجيل بنجاح', user: { email: newUser.email, role: newUser.role } });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Check Admin
    if (email === 'najma@gmail.com' && password === '1313') {
        const sessionData = JSON.stringify({ email, role: 'admin' });
        res.cookie('najma_session', sessionData, COOKIE_OPTIONS);
        return res.json({ message: 'تم الدخول بنجاح', user: { email, role: 'admin' } });
    }

    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    // Set session cookie after login
    const sessionData = JSON.stringify({ email: user.email, role: user.role });
    res.cookie('najma_session', sessionData, COOKIE_OPTIONS);

    res.json({ message: 'تم الدخول بنجاح', user: { email: user.email, role: user.role } });
});

// Get current user from cookie
app.get('/api/me', (req, res) => {
    const sessionCookie = req.cookies.najma_session;
    if (!sessionCookie) {
        return res.status(401).json({ error: 'غير مسجل دخول' });
    }

    try {
        const user = JSON.parse(sessionCookie);
        res.json({ user });
    } catch (e) {
        res.clearCookie('najma_session');
        return res.status(401).json({ error: 'جلسة غير صالحة' });
    }
});

// Logout - clear cookie
app.post('/api/logout', (req, res) => {
    res.clearCookie('najma_session', { path: '/' });
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

app.get('/api/products', (req, res) => {
    const db = readDB();
    res.json(db.products);
});

app.post('/api/products', upload.single('image'), (req, res) => {
    const { name, price } = req.body;
    let imageData = '';
    
    // Convert image to base64 data URI - stored in database, never lost!
    if (req.file) {
        const base64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        imageData = `data:${mimeType};base64,${base64}`;
    }

    const db = readDB();
    const newProduct = { id: Date.now(), name, image: imageData, price };
    db.products.push(newProduct);
    writeDB(db);
    res.json(newProduct);
});

app.put('/api/products/:id', upload.single('image'), (req, res) => {
    const id = parseInt(req.params.id);
    const { name, price } = req.body;
    const db = readDB();
    
    const productIndex = db.products.findIndex(p => p.id === id);
    if (productIndex === -1) {
        return res.status(404).json({ error: 'المنتج غير موجود' });
    }

    const product = db.products[productIndex];
    product.name = name || product.name;
    product.price = price || product.price;
    
    // Convert new image to base64 if provided
    if (req.file) {
        const base64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        product.image = `data:${mimeType};base64,${base64}`;
    }

    writeDB(db);
    res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    db.products = db.products.filter(p => p.id !== id);
    writeDB(db);
    res.json({ message: 'تم الحذف' });
});

app.get('/api/bookings', (req, res) => {
    const db = readDB();
    res.json(db.bookings);
});

app.post('/api/bookings', (req, res) => {
    const { email, productName } = req.body;
    const db = readDB();
    const newBooking = { id: Date.now(), email, productName, date: new Date().toISOString() };
    db.bookings.push(newBooking);
    writeDB(db);
    res.json(newBooking);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
