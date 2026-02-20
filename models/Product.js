const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    // YENİ: Silinme durumunu takip eden alan (Arşivleme için)
    isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true }); // Kayıt ve güncelleme tarihlerini otomatik tutar

module.exports = mongoose.model('Product', ProductSchema);