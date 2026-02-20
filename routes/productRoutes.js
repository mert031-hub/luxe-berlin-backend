const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const { storage } = require('../cloudinaryConfig');

/**
 * LUXE BERLIN - PRODUCT ROUTES (V8 STABILIZED)
 * HATA ÇÖZÜMÜ: Controller fonksiyonlarının varlığı kontrol edildi.
 */

const uploadCloud = multer({ storage: storage });

// --- 🔓 GENEL ROTALAR ---

// 🛡️ KRİTİK: productController.getAllProducts'ın varlığından eminiz.
router.get('/', productController.getAllProducts);

router.get('/:id', productController.getProductById);

// --- 🔐 YETKİLİ ROTALAR (Sadece Admin) ---

router.post('/',
    auth,
    uploadCloud.single('image'),
    productController.createProduct
);

router.put('/:id',
    auth,
    uploadCloud.single('image'),
    productController.updateProduct
);

router.delete('/:id', auth, productController.deleteProduct);

router.put('/restore/:id', auth, productController.restoreProduct);

module.exports = router;