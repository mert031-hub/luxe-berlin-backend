const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// 📥 Sipariş Oluşturma
router.post('/', orderController.createOrder);

// 📋 Siparişleri Listeleme (Admin)
router.get('/', orderController.getAllOrders);

// 🔍 Tek Sipariş Detayı (Tracking)
router.get('/:id', orderController.getOrderById);

// ⚙️ Durum Güncelleme
router.put('/:id', orderController.updateOrderStatus);

// 🗑️ Fiziksel Silme
router.delete('/:id', orderController.deleteOrder);

// 📦 Arşivleme (Yumuşak Silme)
router.put('/:id/archive', orderController.archiveOrder);

module.exports = router;