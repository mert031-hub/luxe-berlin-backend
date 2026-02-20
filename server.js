/**
 * LUXE BERLIN - OFFICIAL BACKEND SERVER (ULTRA STABLE VERSION)
 * OPTİMİZASYON: Gereksiz statik dosya logları filtrelendi.
 * ENTEGRASYON: Admin Dashboard ve GDPR Zamanlayıcı eklendi.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// 🛡️ ENTEGRASYON EKLEMELERİ
const cron = require('node-cron'); // npm install node-cron yapmalısın
const runGdprCleanup = require('./utils/gdprManager');

// 🔥 CRASH ÖNLEYİCİ GLOBAL HANDLERLAR
process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION!');
    console.error(err);
});

process.on('unhandledRejection', (err) => {
    console.error('💥 UNHANDLED PROMISE REJECTION!');
    console.error(err);
});

// DNS Önceliği (Mongo uyumu için)
dns.setDefaultResultOrder('ipv4first');

const app = express();

// Eğer Nginx reverse proxy kullanıyorsan önemli
app.set('trust proxy', 1);

// --- VERİTABANI ---
connectDB();

// 🛡️ DSGVO/GDPR ZAMANLAYICI (Her gece 03:00'te otomatik temizlik yapar)
cron.schedule('0 3 * * *', () => {
    runGdprCleanup();
});

// --- MIDDLEWARE ---
app.use(cookieParser());
app.use(express.json());

// 🛡️ OPTİMİZE EDİLMİŞ REQUEST LOG (Gürültü Filtresi)
app.use((req, res, next) => {
    // Terminalde GÖRMEK İSTEMEDİĞİN dosya uzantıları
    const ignoreExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.json', '.ico', '.map'];
    const isStaticFile = ignoreExtensions.some(ext => req.url.toLowerCase().endsWith(ext));

    // Sadece önemli istekleri (API, HTML veya Root) logla
    if (!isStaticFile) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    }
    next();
});

// --- CORS ---
app.use(cors({
    origin: [
        'https://kocyigit-trade.com',
        'https://www.kocyigit-trade.com',
        'http://localhost:5173',
        'http://localhost:5000',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));

// --- STATIC ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend')));

// --- ROUTES ---

// 🛡️ KRİTİK: Frontend Admin Paneli ile Backend Dashboard'u bağlayan köprü
app.use('/api/admin', require('./routes/adminRoutes'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api', require('./routes/testRoutes'));

// API Health Check
app.get('/api-status', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Luxe Berlin API is online and running! 🚀',
        timestamp: new Date().toLocaleString('de-DE'),
        db_status: 'Connected'
    });
});

// --- 404 ---
app.use((req, res) => {
    res.status(404);

    if (req.accepts('html')) {
        return res.sendFile(path.join(__dirname, 'frontend', '404.html'));
    }

    res.json({ success: false, message: "Ressource nicht gefunden." });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error("🚨 GLOBAL ERROR HANDLER TRIGGERED");
    console.error(err.stack || err);

    res.status(err.status || 500).json({
        success: false,
        message: "Ein interner Serverfehler ist aufgetreten!",
        error: process.env.NODE_ENV === 'development'
            ? err.message
            : "Internal Server Error"
    });
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("--------------------------------------------------");
    console.log("🚀 LUXE BERLIN SERVER IS ACTIVE (STABLE MODE)");
    console.log(`📡 PORT: ${PORT}`);
    console.log(`🌍 ENV: ${process.env.NODE_ENV}`);
    console.log(`☁️ CLOUDINARY: ${process.env.CLOUDINARY_CLOUD_NAME ? "Configured" : "NOT CONFIGURED"}`);
    console.log("--------------------------------------------------");
});