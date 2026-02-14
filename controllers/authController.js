const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Yeni Admin Kaydı
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Benutzername und Passwort sind erforderlich!" });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Dieser Benutzername existiert bereits!" });
        }
        const newUser = new User({ username, password });
        await newUser.save();
        res.status(201).json({ message: "Admin erfolgreich erstellt! ✅" });
    } catch (err) {
        console.error("KAYIT HATASI:", err.message);
        res.status(500).json({ message: "Serverfehler: " + err.message });
    }
};

// Admin Listesini Getir
exports.getAdmins = async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin Silme
exports.deleteAdmin = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Admin wurde entfernt." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🛡️ Login Fonksiyonu (HttpOnly Cookie Versiyonu)
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: "Benutzer nicht gefunden!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Falsches Passwort!" });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        // 🛡️ KRİTİK: Token'ı çereze koyuyoruz, body'e değil!
        res.cookie('token', token, {
            httpOnly: true, // XSS koruması (JS okuyamaz)
            secure: process.env.NODE_ENV === 'production', // Canlıda sadece HTTPS
            sameSite: 'Strict', // CSRF koruması
            maxAge: 4 * 60 * 60 * 1000 // 4 Saat
        });

        res.json({
            success: true,
            user: { id: user._id, username: user.username }
        });

    } catch (err) {
        console.error("LOGIN HATASI:", err.message);
        res.status(500).json({ error: "Serverfehler beim Login" });
    }
};

// 🛡️ Logout (Çerezi temizler)
exports.logout = async (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Abmeldung erfolgreich. 👋" });
};

// 🛡️ GetMe (Aktif kullanıcıyı döner)
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Serverfehler" });
    }
};

// 🛡️ Status (Oturum kontrolü için)
exports.getStatus = async (req, res) => {
    res.status(200).json({ authenticated: true });
};