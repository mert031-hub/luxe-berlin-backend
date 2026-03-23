const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    // YENİ: Sürükle-Bırak sıralaması için indeks alanı
    orderIndex: { type: Number, default: 0, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);