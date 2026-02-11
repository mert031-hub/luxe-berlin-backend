const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Sipariş İşlemleri
router.post('/', orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder); // Fiziksel silme (isteğe bağlı)

// ARŞİVLEME ROTASI (X Butonu için kritik)
router.put('/:id/archive', orderController.archiveOrder);

module.exports = router;