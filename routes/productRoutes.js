const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const { storage } = require('../cloudinaryConfig');

/**
 * LUXE BERLIN - PRODUCT ROUTES (V9 MASTER)
 * HATA ÇÖZÜMÜ: Multer Cloudinary storage motoru mühürlendi.
 * GÜVENLİK: Admin yetkisi olmayan işlemler engellenmiştir.
 */

const uploadCloud = multer({
    storage: storage,
    limits: { fileSize: 4 * 1024 * 1024 } // 4MB sınırı burada da korunuyor
});

// --- 🔓 GENEL ROTALAR (Ön Yüz İçin) ---
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// --- 🔐 YETKİLİ ROTALAR (Sadece Admin) ---

// Ürün Ekleme
router.post('/',
    auth,
    uploadCloud.single('image'),
    productController.createProduct
);

// Ürün Güncelleme
router.put('/:id',
    auth,
    uploadCloud.single('image'),
    productController.updateProduct
);

// Ürün Arşivleme
router.delete('/:id', auth, productController.deleteProduct);

// Arşivden Geri Getirme
router.put('/restore/:id', auth, productController.restoreProduct);

module.exports = router;