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

// Login Fonksiyonu (4 Saatlik Güvenli Oturum)
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

        // --- KRİTİK AYAR: Token Süresi ---
        // '4h' değeri, oturumun 4 saat boyunca aktif kalmasını sağlar.
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({
            token,
            user: { id: user._id, username: user.username }
        });

    } catch (err) {
        console.error("LOGIN HATASI:", err.message);
        res.status(500).json({ error: "Serverfehler beim Login" });
    }
};