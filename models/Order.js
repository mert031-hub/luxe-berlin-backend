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
            price: { type: Number, required: true, min: 0 }
        }
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: "Unbekannt" },
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false }
});

// 🚀 BACKEND OPTİMİZASYONU (EK İNDEKSLER)
OrderSchema.index({ "customer.email": 1 }); // Müşteri geçmişi için
OrderSchema.index({ status: 1 });           // Durum filtrelemeleri için
OrderSchema.index({ date: -1 });            // Hızlı sıralama için

module.exports = mongoose.model('Order', OrderSchema);