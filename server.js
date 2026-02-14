/**
 * LUXE BERLIN - OFFICIAL BACKEND SERVER
 * Özellikler: MongoDB Bağlantısı, Cloudinary Hazırlığı, Render IPv4 Fix, 
 * Resend E-posta Sistemi, Global Hata Yakalayıcı.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
const connectDB = require('./config/db');

// --- 1. RENDER & IPV6 FIX ---
// Render üzerindeki "ENETUNREACH" (IPv6 bağlantı hataları) sorununu 
// dış bağlantıları IPv4'e zorlayarak kökten çözer.
dns.setDefaultResultOrder('ipv4first');

const app = express();

// --- 2. VERİTABANI BAĞLANTISI ---
connectDB();

// --- 3. MIDDLEWARE'LER ---
app.use(cors()); // Cross-Origin Resource Sharing izni
app.use(express.json()); // JSON veri işleme (POST/PUT istekleri için)

/**
 * GÖRSEL ERİŞİM NOTU: 
 * /uploads klasörü yerel dosyalar için kalmaya devam eder, 
 * ancak yeni eklenen ürünler doğrudan Cloudinary URL'lerini kullanacaktır.
 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Statik frontend dosyalarını sunar (Render/Heroku Deployment için)
app.use(express.static(path.join(__dirname, 'frontend')));

// --- 4. API ROTALARI ---
// Her bir rota kendi işlevinden sorumlu modüllere yönlendirilir
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api', require('./routes/testRoutes'));

// API Sağlık Testi (Uptime kontrolü için)
app.get('/api-status', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Luxe Berlin API is online and running! 🚀',
        timestamp: new Date().toLocaleString('de-DE')
    });
});

// --- 5. 404 SAYFA BULUNAMADI ---
// Tanımlanmamış rotalarda kullanıcıyı 404 sayfasına veya JSON hatasına yönlendirir
app.use((req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'frontend', '404.html'));
        return;
    }
    res.json({
        success: false,
        message: "Die angeforderte Ressource wurde nicht gefunden."
    });
});

// --- 6. GLOBAL HATA YAKALAYICI (CRITICAL ERROR HANDLER) ---
// Beklenmedik sunucu hatalarını yakalar, loglar ve sistemin çökmesini engeller
app.use((err, req, res, next) => {
    console.error("!!! CRITICAL SERVER ERROR !!!");
    console.error(err.stack);

    res.status(500);
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

// --- 7. SUNUCU BAŞLATMA ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`🚀 LUXE BERLIN SERVER IS ACTIVE`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`📁 FRONTEND PATH: ${path.join(__dirname, 'frontend')}`);
    console.log(`☁️ CLOUD STATUS: Ready for Cloudinary & Resend`);
    console.log(`--------------------------------------------------`);
});