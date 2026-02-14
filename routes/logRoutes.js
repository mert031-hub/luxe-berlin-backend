const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const auth = require('../middlewares/auth');

// Hem okuma hem yazma için 'auth' ekliyoruz (Sadece adminler)
router.get('/', auth, logController.getLogs);
router.post('/', auth, logController.saveLog);

module.exports = router;