/**
 * LUXE BERLIN - OFFICIAL BACKEND SERVER (ULTRA STABLE & FAST)
 * OPTİMİZASYON: Gzip/Brotli Sıkıştırma, Static Caching ve DNS Önceliği.
 * GÜVENLİK: Global Exception Handlers ve Stripe Webhook İmza Doğrulaması.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const connectDB = require('./config/db');
const cron = require('node-cron');
const runGdprCleanup = require('./utils/gdprManager');
const paymentController = require('./controllers/paymentController');

// 🔥 CRASH ÖNLEYİCİ GLOBAL HANDLERLAR
process.on('uncaughtException', (err) => {
    console.error('💥 KRITISCHER FEHLER (Uncaught Exception):', err);
});

process.on('unhandledRejection', (err) => {
    console.error('💥 KRITISCHER FEHLER (Unhandled Rejection):', err);
});

// DNS Önceliği (MongoDB bağlantı hızı için)
dns.setDefaultResultOrder('ipv4first');

const app = express();

// --- ⚡ HIZ VE PERFORMANS ---

// 1. Gzip Sıkıştırma: Veri boyutunu düşürür.
app.use(compression());

// 2. Static Caching: Statik dosyalar için 1 günlük tarayıcı önbelleği.
const staticOptions = {
    maxAge: '1d',
    etag: true
};

// --- STRIPE WEBHOOK (DİKKAT: JSON'dan ÖNCE OLMALI) ---
// Stripe imza doğrulaması için gövdenin (body) ham/raw formatta olması gerekir.
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

// --- STANDART MIDDLEWARE ---
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);

// --- VERİTABANI ---
connectDB();

// 🛡️ DSGVO/GDPR ZAMANLAYICI (Her gece 03:00'te temizlik yapar)
cron.schedule('0 3 * * *', () => {
    console.log("🕒 GDPR-Bereinigung wird gestartet...");
    runGdprCleanup();
});

// --- REQUEST LOGGING ---
app.use((req, res, next) => {
    const ignoreExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.json', '.ico', '.map'];
    const isStaticFile = ignoreExtensions.some(ext => req.url.toLowerCase().endsWith(ext));

    if (!isStaticFile) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    }
    next();
});

// --- CORS AYARLARI ---
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

// --- STATIC ASSETS ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));
app.use(express.static(path.join(__dirname, 'frontend'), staticOptions));

// --- ROUTES ---
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api', require('./routes/testRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

// API Durum Kontrolü
app.get('/api-status', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Luxe Berlin API ist online! 🚀',
        timestamp: new Date().toLocaleString('de-DE')
    });
});

// --- 404 HANDLER ---
app.use((req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        return res.sendFile(path.join(__dirname, 'frontend', '404.html'));
    }
    res.json({ success: false, message: "Ressource nicht gefunden." });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error("🚨 GLOBALER SERVERFEHLER:");
    console.error(err.stack || err);

    res.status(err.status || 500).json({
        success: false,
        message: "Ein interner Serverfehler ist aufgetreten!",
        error: process.env.NODE_ENV === 'development' ? err.message : "Internal Server Error"
    });
});

// --- BAŞLATMA ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("--------------------------------------------------");
    console.log(`🚀 LUXE BERLIN SERVER AKTIV AUF PORT: ${PORT}`);
    console.log(`⚡ Performance: Kompression & Caching aktiv`);
    console.log("--------------------------------------------------");
});