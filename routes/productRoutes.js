const express = require('express');
const router = express.Router();
/**
 * GÜNCELLEME: Yerel multer yerine Cloudinary yapılandırmamızı dahil ediyoruz.
 * Dosya yolunun (../cloudinaryConfig) doğruluğundan emin olun.
 */
const uploadCloud = require('../cloudinaryConfig');
const productController = require('../controllers/productController');
const auth = require('../middlewares/auth');

// --- ÜRÜN ROTALARI ---

/**
 * 1. HERKESE AÇIK ROTA: Ürünleri listeleme (Giriş gerektirmez)
 * Tüm kullanıcılar ürünleri görebilir.
 */
router.get('/', productController.getProducts);

/**
 * 2. KORUMALI ROTA: Yeni ürün ekleme (Auth + Cloudinary Yükleme)
 * 'uploadCloud.single' sayesinde resim doğrudan buluta gider ve optimize edilir.
 */
router.post('/', auth, uploadCloud.single('image'), productController.createProduct);

/**
 * 3. KORUMALI ROTA: Ürün güncelleme
 * Mevcut ürünü ve resmini Cloudinary üzerinden günceller.
 */
router.put('/:id', auth, uploadCloud.single('image'), productController.updateProduct);

/**
 * 4. KORUMALI ROTA: Ürünü arşivleme (isDeleted: true yapar)
 * Ürün silinmez, sadece kullanıcı arayüzünden gizlenir.
 */
router.delete('/:id', auth, productController.deleteProduct);

/**
 * 5. KORUMALI ROTA: Arşivden geri getirme
 * Yanlışlıkla silinen ürünleri tekrar satışa açar.
 */
router.put('/restore/:id', auth, productController.restoreProduct);

module.exports = router;