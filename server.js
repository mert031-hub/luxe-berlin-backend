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

dns.setDefaultResultOrder('ipv4first');

const app = express();

connectDB();

// --- GÜVENLİK VE AYARLAR ---
app.use(cookieParser());
app.use(express.json());

// 🛡️ İSTEK TAKİP SİSTEMİ (Render loglarında her şeyi görmeni sağlar)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors({
    // 🛡️ FRONTEND_URL 'https://kocyigit-trade.com' olmalı
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
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

app.get('/api-status', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Luxe Berlin API is online and running! 🚀',
        timestamp: new Date().toLocaleString('de-DE'),
        db_status: 'Connected'
    });
});

// --- HATA YÖNETİMİ ---
app.use((req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'frontend', '404.html'));
        return;
    }
    res.json({ success: false, message: "Ressource nicht gefunden." });
});

app.use((err, req, res, next) => {
    console.error("!!! CRITICAL SERVER ERROR !!!");
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Ein interner Serverfehler ist aufgetreten!",
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`🚀 LUXE BERLIN SERVER IS ACTIVE (SECURE MODE)`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`📁 FRONTEND: ${path.join(__dirname, 'frontend')}`);
    console.log(`☁️ CLOUD: Ready for Cloudinary & Resend`);
    console.log(`--------------------------------------------------`);
});