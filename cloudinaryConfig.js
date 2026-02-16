const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const CloudinaryStorage = require('multer-storage-cloudinary');

// ENV kontrolü
if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    throw new Error("Cloudinary environment variables are missing!");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    folder: process.env.CLOUDINARY_FOLDER || 'luxe_berlin_products',
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp']
});

const uploadCloud = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = uploadCloud;
