const mongoose = require('mongoose');

/**
 * LUXE BERLIN - Sipariş Veri Modeli (STRIPE & PERFORMANCE OPTIMIZED)
 * Müşteri bilgileri, ürünler ve ödeme verilerini tutar.
 */
const OrderSchema = new mongoose.Schema({
    // 🛡️ Müşteriye görünen kısa ID (Benzersizlik garantisi)
    shortId: { type: String, unique: true, required: true },

    // 🛡️ Stripe tarafındaki oturum ID'si (Success sayfası sorguları için)
    // Uyarıyı önlemek için buradaki "index: true" kaldırıldı, en altta manuel olarak eklendi.
    stripeSessionId: { type: String },

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
    paymentMethod: { type: String, default: "KARTE (Stripe)" },

    // 🛡️ Finansal Ödeme Durumu (Paid, Pending, Failed)
    paymentStatus: { type: String, default: 'Pending' },

    // 🛡️ Operasyonel Sipariş Durumu (Pending, Shipped, Delivered, Cancelled)
    status: { type: String, default: 'Pending' },

    date: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false }
});

// --- 🚀 BACKEND OPTİMİZASYONU (İNDEKSLER) ---

// Müşteri e-postası ile hızlı sorgulama (Müşteri geçmişi analitiği için)
OrderSchema.index({ "customer.email": 1 });

// Sipariş durumu filtrelemeleri (Admin Panel hızı için)
OrderSchema.index({ status: 1 });

// En yeni siparişleri en üstte getirmek için hızlı sıralama
OrderSchema.index({ date: -1 });

// 🛡️ KRİTİK: Success sayfasındaki 'by-session' sorgusunun milisaniyeler içinde bitmesi için.
OrderSchema.index({ stripeSessionId: 1 });

module.exports = mongoose.model('Order', OrderSchema);