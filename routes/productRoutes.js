const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');
const auth = require('../middlewares/auth'); // Güvenlik görevlisini içeri aldık

// --- RESİM YÜKLEME YAPILANDIRMASI ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- ÜRÜN ROTALARI ---

// 1. HERKESE AÇIK ROTA: Ürünleri listeleme (Giriş gerektirmez)
router.get('/', productController.getProducts);

// 2. KORUMALI ROTA: Yeni ürün ekleme (Auth + Resim Yükleme)
// Not: Önce 'auth' çalışır, yetki varsa 'upload' işlemi başlar.
router.post('/', auth, upload.single('image'), productController.createProduct);

// 3. KORUMALI ROTA: Ürün güncelleme
router.put('/:id', auth, upload.single('image'), productController.updateProduct);

// 4. KORUMALI ROTA: Ürünü arşivleme (isDeleted: true yapar)
router.delete('/:id', auth, productController.deleteProduct);

// 5. KORUMALI ROTA: Arşivden geri getirme
router.put('/restore/:id', auth, productController.restoreProduct);

module.exports = router;