const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    stock: { type: Number, required: true },
    description: { type: String, required: true },
    // YENİ: Silinme durumunu takip eden alan
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true }); // Kayıt ve güncelleme tarihlerini otomatik tutar

module.exports = mongoose.model('Product', ProductSchema);