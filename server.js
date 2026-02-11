require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns'); // 1. DNS modülünü ekledik
const connectDB = require('./config/db');

// 2. KRİTİK: Render üzerindeki IPv6 (ENETUNREACH) hatalarını önlemek için 
// tüm dış bağlantı isteklerini IPv4 öncelikli yapar.
dns.setDefaultResultOrder('ipv4first');

const app = express();

// 3. Veritabanı Bağlantısını Başlat
connectDB();

// 4. Middleware'ler
app.use(cors()); // Tüm kökenlerden gelen isteklere izin verir
app.use(express.json()); // JSON gövdelerini işler

// Resim dosyalarına (uploads klasörü) dışarıdan erişim sağlar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Statik frontend dosyalarını sunar
app.use(express.static(path.join(__dirname, 'frontend')));

// 5. API ROTALARI
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api', require('./routes/testRoutes'));

// API Durum Kontrolü (Sağlık Testi)
app.get('/api-status', (req, res) => {
    res.send('Luxe Berlin API Çalışıyor! 🚀');
});

// --- 6. 404 SAYFA BULUNAMADI ---
// Eğer bir rota bulunamazsa kullanıcıya 404.html gönderir veya JSON döner
app.use((req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'frontend', '404.html'));
        return;
    }
    res.json({ success: false, message: "Resource not found" });
});

// --- 7. GLOBAL HATA YAKALAYICI ---
// Beklenmedik sunucu hatalarını yakalar ve 500.html gönderir
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

// 8. Sunucuyu Başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda aktif.`);
    console.log(`📂 Frontend klasör yolu: ${path.join(__dirname, 'frontend')}`);
    console.log(`📧 E-posta sistemi: Resend API aktif.`);
});