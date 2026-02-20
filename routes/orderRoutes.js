const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middlewares/auth');

/**
 * LUXE BERLIN - ORDER ROUTES
 * Tüm sipariş operasyonlarının API uç noktaları.
 */

// 1. Yeni sipariş oluşturma (Checkout)
router.post('/', orderController.createOrder);

// 2. Tüm siparişleri listeleme (Admin Panel)
router.get('/', auth, orderController.getAllOrders);

// 3. Tekil sipariş sorgulama (Tracking)
router.get('/:id', orderController.getOrderById);

// 4. Sipariş durumunu güncelleme (Admin Panel)
router.put('/:id', auth, orderController.updateOrderStatus);

// 5. Siparişi veritabanından tamamen silme
router.delete('/:id', auth, orderController.deleteOrder);

// 6. Siparişi arşivleme (Admin Panel)
router.patch('/:id/archive', auth, orderController.archiveOrder);

// 7. Sipariş İptal Etme (Müşteri/Yasal İptal Sistemi)
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;