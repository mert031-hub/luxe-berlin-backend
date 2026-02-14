/**
 * LUXE BERLIN - OFFICIAL BACKEND SERVER (SECURE VERSION)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
const cookieParser = require('cookie-parser'); // YENİ: Çerez işleyici
const connectDB = require('./config/db');

dns.setDefaultResultOrder('ipv4first');

const app = express();

connectDB();

// --- GÜVENLİK AYARLARI ---
app.use(cookieParser()); // Çerezleri okuyabilmek için şart

app.use(cors({
    // Local'de 5173 (Vite) veya 5500 (Live Server) kullanıyorsan onu yazmalısın
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true // 🛡️ Çerezlerin frontend-backend arasında taşınmasına izin verir
}));

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend')));

// --- API ROTALARI ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api', require('./routes/testRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));

app.get('/api-status', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Luxe Berlin API is online and running! 🚀',
        timestamp: new Date().toLocaleString('de-DE')
    });
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`🚀 LUXE BERLIN SERVER IS ACTIVE (SECURE MODE)`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`📁 FRONTEND PATH: ${path.join(__dirname, 'frontend')}`);
    console.log(`☁️ CLOUD STATUS: Ready for Cloudinary & Resend`);
    console.log(`--------------------------------------------------`);
});