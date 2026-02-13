const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

/**
 * LUXE BERLIN - ORDER ROUTES
 * Tüm sipariş operasyonlarının API uç noktaları.
 */

// 1. Yeni sipariş oluşturma (Checkout)
router.post('/', orderController.createOrder);

// 2. Tüm siparişleri listeleme (Admin Panel)
router.get('/', orderController.getAllOrders);

// 3. Tekil sipariş sorgulama (Tracking - Hem MongoID hem shortId destekler)
router.get('/:id', orderController.getOrderById);

// 4. Sipariş durumunu güncelleme (Admin Panel - Shipped, Delivered vb.)
router.put('/:id', orderController.updateOrderStatus);

// 5. Siparişi veritabanından tamamen silme
router.delete('/:id', orderController.deleteOrder);

// 6. Siparişi arşivleme (Admin Panel - Soft Delete)
router.patch('/:id/archive', orderController.archiveOrder);

// 7. SİPARİŞ İPTAL ETME (Müşteri/Yasal İptal Sistemi)
// Bu rota hem stokları iade eder hem de iptal maili gönderir.
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;