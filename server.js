/**
 * LUXE BERLIN - OFFICIAL BACKEND SERVER (SECURE VERSION)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// DNS Önceliği (Render ve MongoDB uyumu için)
dns.setDefaultResultOrder('ipv4first');

const app = express();

// Veritabanı Bağlantısı
connectDB();

// --- ARA YAZILIMLAR (MIDDLEWARES) ---
app.use(cookieParser()); // Çerez işlemleri için şart
app.use(express.json()); // JSON gövde okuma

// 📡 İSTEK TAKİP SİSTEMİ (Render loglarında her şeyi görmeni sağlar)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// 🛡️ ZIRHLI CORS YAPILANDIRMASI
app.use(cors({
    origin: [
        'https://kocyigit-trade.com',
        'https://www.kocyigit-trade.com',
        'http://localhost:5173',
        'http://localhost:5000',
        'http://127.0.0.1:5500' // Live Server desteği
    ],
    credentials: true // Çerezlerin taşınmasına izin verir
}));

// --- STATİK DOSYALAR ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend')));

// --- API ROTALARI ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api', require('./routes/testRoutes'));

// API Durum Kontrolü
app.get('/api-status', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Luxe Berlin API is online and running! 🚀',
        timestamp: new Date().toLocaleString('de-DE'),
        db_status: 'Connected'
    });
});

// --- 404 HATA YÖNETİMİ ---
app.use((req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'frontend', '404.html'));
        return;
    }
    res.json({ success: false, message: "Ressource nicht gefunden." });
});

// --- 500 KRİTİK HATA YÖNETİMİ ---
app.use((err, req, res, next) => {
    console.error("!!! CRITICAL SERVER ERROR !!!");
    console.error(err.stack);
    res.status(err.status || 500);

    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'frontend', '500.html'));
        return;
    }

    res.json({
        success: false,
        message: "Ein interner Serverfehler ist aufgetreten!",
        error: process.env.NODE_ENV === 'development' ? err.message : "Internal Server Error"
    });
});

// Sunucu Başlatma
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`🚀 LUXE BERLIN SERVER IS ACTIVE (SECURE MODE)`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`📁 FRONTEND PATH: ${path.join(__dirname, 'frontend')}`);
    console.log(`☁️ CLOUD STATUS: Ready for Cloudinary & Resend`);
    console.log(`--------------------------------------------------`);
});