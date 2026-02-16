const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary');
const multer = require('multer');

/**
 * 🛡️ UNIVERSAL CONSTRUCTOR FIX
 * Bazı sürümlerde obje, bazılarında direkt fonksiyon gelir.
 * Bu yapı her iki ihtimali de kapsar.
 */
let CloudinaryStorage;
if (multerStorageCloudinary.CloudinaryStorage) {
    CloudinaryStorage = multerStorageCloudinary.CloudinaryStorage;
} else {
    CloudinaryStorage = multerStorageCloudinary;
}

// Güvenlik Kontrolü: Eğer hala constructor değilse logla
if (typeof CloudinaryStorage !== 'function') {
    console.error("CRITICAL: CloudinaryStorage is NOT a constructor! Check your npm version.");
}

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
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const uploadCloud = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = uploadCloud;