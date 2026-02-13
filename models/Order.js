const mongoose = require('mongoose');

/**
 * LUXE BERLIN - Sipariş Veri Modeli
 * Müşteri bilgileri, ürünler ve ödeme durumlarını tutar.
 * Optimizasyon: shortId alanı benzersizdir ve indekslenmiştir.
 */
const OrderSchema = new mongoose.Schema({
    // shortId üzerindeki unique: true özelliği otomatik olarak bir index oluşturur.
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

// 🚀 BACKEND OPTİMİZASYONU (EK İNDEKSLER)
// Not: shortId indeksi yukarıdaki unique: true ile otomatik oluşturulduğu için buraya tekrar eklemiyoruz.

OrderSchema.index({ "customer.email": 1 }); // Müşteri geçmişi ve filtreleme sorguları için
OrderSchema.index({ status: 1 });           // Admin panelindeki durum filtrelemeleri için
OrderSchema.index({ date: -1 });            // En yeni siparişlerin her zaman en üstte hızlı gelmesi için

module.exports = mongoose.model('Order', OrderSchema);