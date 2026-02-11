const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth'); // Güvenlik görevlisini çağır

// --- HERKESE AÇIK ROTALAR ---
// İlk admini oluşturmak veya giriş yapmak için korumaya gerek yok.
router.post('/register', authController.register);
router.post('/login', authController.login);

// --- KORUMALI ROTALAR ---
// Sadece giriş yapmış (Token sahibi) adminler diğer adminleri görebilir veya silebilir.
router.get('/users', auth, authController.getAdmins);
router.delete('/users/:id', auth, authController.deleteAdmin);

module.exports = router;