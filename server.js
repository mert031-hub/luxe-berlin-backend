require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// 1. Veritabanı Bağlantısını Başlat
connectDB();

// 2. Middleware'ler
app.use(cors());
app.use(express.json());

// Resim dosyalarına erişim
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Frontend dosyalarını sun
app.use(express.static(path.join(__dirname, 'frontend')));

// 3. API ROTALARI
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes')); // YENİ: Yorum sistemi rotası eklendi 🚀
app.use('/api', require('./routes/testRoutes'));

// API Durum Kontrolü
app.get('/api-status', (req, res) => {
    res.send('Luxe Berlin API Çalışıyor! 🚀');
});

// --- 4. 404 SAYFA BULUNAMADI ---
app.use((req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'frontend', '404.html'));
        return;
    }
    res.json({ success: false, message: "Resource not found" });
});

// --- 5. GLOBAL HATA YAKALAYICI ---
app.use((err, req, res, next) => {
    console.error("CRITICAL SERVER ERROR:", err.stack);
    res.status(500);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'frontend', '500.html'));
        return;
    }
    res.json({
        success: false,
        message: "Ein interner Serverfehler ist aufgetreten!",
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// 6. Sunucuyu Başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda aktif.`);
    console.log(`📂 Frontend klasör yolu: ${path.join(__dirname, 'frontend')}`);
});