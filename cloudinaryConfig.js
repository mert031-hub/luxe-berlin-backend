const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary');
const multer = require('multer');

// 🛡️ BURASI ÇOK KRİTİK: Constructor hatasını çözen "Universal" tanımlama
const CloudinaryStorage = multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: process.env.CLOUDINARY_FOLDER || 'luxe_berlin_products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' }
        ]
    }
});

const uploadCloud = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Sınırı
});

module.exports = uploadCloud;