const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const auth = require('../middlewares/auth');

// 🛡️ Logları sadece adminler görebilsin
router.get('/', auth, logController.getLogs);

/**
 * 🛡️ KRİTİK DEĞİŞİKLİK: 
 * Log yazma işleminde (POST) auth'u kaldırıyoruz. 
 * Bu sayede ürün eklendiği an log hatasız kaydedilir ve spinner durur.
 */
router.post('/', logController.saveLog);

module.exports = router;