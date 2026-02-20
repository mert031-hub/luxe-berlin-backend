const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth'); // Güvenlik görevlisi burada tanımlı

// --- HERKESE AÇIK ROTALAR ---
router.post('/login', authController.login);

/**
 * ⚠️ DİKKAT: İlk admini oluşturana kadar buradaki 'auth' kaldırıldı.
 * Postman isteği başarılı olduktan sonra burayı eski haline getireceğiz.
 */
// GÜVENLİK KALKANI TEKRAR AKTİF! 🔒
router.post('/register', auth, authController.register);

// --- KORUMALI ROTALAR (Token Gerektirenler) ---
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getMe);
router.get('/status', auth, authController.getStatus);
router.get('/users', auth, authController.getAdmins);
router.delete('/users/:id', auth, authController.deleteAdmin);

module.exports = router;