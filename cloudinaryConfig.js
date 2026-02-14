const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary');
const multer = require('multer');

// 🛡️ KRİTİK HATA DÜZELTMESİ: 
// Yeni sürümde kütüphane farklı şekillerde export edilebiliyor.
// Eğer bir obje olarak geliyorsa içindeki CloudinaryStorage'ı al, 
// aksi takdirde direkt kendisini kullan.
const CloudinaryStorage = multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary;

/**
 * CLOUDINARY YAPILANDIRMASI
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * STORAGE AYARLARI (Modern v4+ Uyumlu)
 */
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: process.env.CLOUDINARY_FOLDER || 'luxe_berlin_general',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [
                { width: 800, height: 1000, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' }
            ],
            public_id: Date.now() + '-' + file.originalname.split('.')[0],
        };
    },
});

const uploadCloud = multer({ storage: storage });

module.exports = uploadCloud;