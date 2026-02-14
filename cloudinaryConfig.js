const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

/**
 * CLOUDINARY YAPILANDIRMASI
 * .env dosyasındaki kimlik bilgilerini kullanarak bağlantı kurar.
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * STORAGE AYARLARI
 * folder: process.env.CLOUDINARY_FOLDER sayesinde local'de 'luxe_berlin_dev',
 * canlıda ise 'luxe_berlin_prod' klasörüne otomatik yönlendirme yapar.
 */
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        // Dinamik klasör yönetimi: .env'den oku, yoksa genel klasöre at.
        folder: process.env.CLOUDINARY_FOLDER || 'luxe_berlin_general',

        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Kabul edilen formatlar
        transformation: [
            { width: 800, height: 1000, crop: 'limit' }, // Maksimum boyut sınırı
            { quality: 'auto', fetch_format: 'auto' }    // Otomatik WebP ve kalite optimizasyonu
        ]
    }
});

const uploadCloud = multer({ storage: storage });

module.exports = uploadCloud;