const mongoose = require('mongoose');

/**
 * LUXE BERLIN - Sipariş Veri Modeli
 * Optimizasyon: shortId alanı eklenmiş ve indekslenmiştir.
 */
const OrderSchema = new mongoose.Schema({
    // YENİ: Kısa Takip Kodu (Veritabanı seviyesinde tutulur ve indekslenir)
    shortId: { type: String, unique: true, required: true },

    customer: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true }
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            name: { type: String, required: true },
            qty: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true }
        }
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: "Unbekannt" },
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false }
});

// 🚀 BACKEND OPTİMİZASYONU (INDEXING)
OrderSchema.index({ shortId: 1 });          // Takip aramalarını ışık hızına çıkarır
OrderSchema.index({ "customer.email": 1 }); // Müşteri geçmişi sorguları için
OrderSchema.index({ status: 1 });           // Filtrelemeler için
OrderSchema.index({ date: -1 });            // Sıralamalar için

module.exports = mongoose.model('Order', OrderSchema);