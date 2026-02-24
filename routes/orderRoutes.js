const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middlewares/auth');

/**
 * LUXE BERLIN - ORDER ROUTES
 * Tüm sipariş operasyonlarının API uç noktaları.
 */

// 🛡️ 1. ÖNEMLİ: Stripe Session ID ile sipariş sorgulama
// Bu rota, alttaki /:id rotasından ÖNCE gelmelidir (404 hatasını önlemek için).
router.get('/by-session/:sessionId', orderController.getOrderBySession);

// 2. Yeni sipariş oluşturma (Checkout / Manuel)
router.post('/', orderController.createOrder);

// 3. Tüm siparişleri listeleme (Admin Panel)
router.get('/', auth, orderController.getAllOrders);

// 4. Tekil sipariş sorgulama (Tracking / ID veya ShortID ile)
router.get('/:id', orderController.getOrderById);

// 5. Sipariş durumunu güncelleme (Admin Panel)
router.put('/:id', auth, orderController.updateOrderStatus);

// 6. Siparişi veritabanından tamamen silme (Admin Panel)
router.delete('/:id', auth, orderController.deleteOrder);

// 7. Siparişi arşivleme (Admin Panel)
router.patch('/:id/archive', auth, orderController.archiveOrder);

// 8. Sipariş İptal Etme (Müşteri/Yasal İptal Sistemi)
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;