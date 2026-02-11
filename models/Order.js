const mongoose = require('mongoose');

/**
 * LUXE BERLIN - Sipariş Veri Modeli
 * Müşteri bilgileri, ürünler ve ödeme durumlarını tutar.
 */
const OrderSchema = new mongoose.Schema({
    customer: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        // YENİ: Müşteri ile iletişim için telefon numarası alanı
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
    // Ödeme yöntemi (KARTE, PAYPAL vb.)
    paymentMethod: { type: String, default: "Unbekannt" },
    // Sipariş durumu (Pending, Processing, Shipped, Delivered, Cancelled)
    status: { type: String, default: 'Pending' },
    // Siparişin oluşturulma tarihi
    date: { type: Date, default: Date.now },
    // Admin panelinde silinen siparişleri arşivde tutmak için
    isArchived: { type: Boolean, default: false }
});

module.exports = mongoose.model('Order', OrderSchema);