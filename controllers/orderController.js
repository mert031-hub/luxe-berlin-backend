const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendStatusEmail } = require("../config/mailer");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * 🛡️ MASTER REFUND HELPER
 * Para iadesi ve stok iadesini tek noktadan yönetir.
 */
async function processFullRefundAndStock(order) {
    if (order.paymentStatus === 'Refunded') {
        console.log(`⚠️ Sipariş zaten iade edilmiş: ${order.shortId}`);
        return;
    }

    if (order.stripeSessionId && order.paymentStatus === 'Paid') {
        try {
            const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
            if (session.payment_intent) {
                await stripe.refunds.create({
                    payment_intent: session.payment_intent,
                    reason: 'requested_by_customer'
                });
                order.paymentStatus = 'Refunded';
                console.log(`💰 Stripe İadesi Başarılı: ${order.shortId}`);
            }
        } catch (stripeErr) {
            console.error("❌ Stripe Refund Hatası:", stripeErr.message);
        }
    }

    for (const item of order.items) {
        if (item.productId) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
        }
    }
}

/**
 * 1️⃣ SİPARİŞ OLUŞTURMA
 */
exports.createOrder = async (req, res) => {
    try {
        const { customer, items, totalAmount, paymentMethod } = req.body;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ message: "Produkt nicht gefunden." });
            if (product.stock < item.qty) {
                return res.status(400).json({ message: `Nicht genügend Lagerbestand.` });
            }
        }

        const timestamp = Date.now().toString(36).toUpperCase();
        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
        const generatedShortId = `LB-${timestamp}${randomStr}`;

        const newOrder = new Order({
            customer, items, totalAmount,
            paymentMethod: paymentMethod || "Unbekannt",
            shortId: generatedShortId
        });

        await newOrder.save();

        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
        }

        const populatedOrder = await Order.findById(newOrder._id).populate('items.productId');
        sendStatusEmail(populatedOrder, "pending").catch(err => console.error("❌ Mail hatası:", err.message));

        res.status(201).json({ message: "Sipariş başarılı!", orderId: newOrder._id, shortId: generatedShortId });
    } catch (err) {
        res.status(500).json({ message: "Hata", error: err.message });
    }
};

/**
 * 2️⃣ STRIPE SESSION ID İLE SİPARİŞ GETİR
 */
exports.getOrderBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        let order = await Order.findOne({ stripeSessionId: sessionId }).populate('items.productId');
        if (order) return res.json(order);

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session && session.payment_status === 'paid') {
            const metadataItems = JSON.parse(session.metadata.cartItems);
            const timestamp = Date.now().toString(36).toUpperCase();
            const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
            const generatedShortId = `LB-${timestamp}${randomStr}`;

            const newOrder = new Order({
                customer: {
                    firstName: session.metadata.firstName,
                    lastName: session.metadata.lastName,
                    email: session.customer_details.email,
                    phone: session.metadata.phone,
                    address: session.metadata.address
                },
                items: metadataItems,
                totalAmount: session.amount_total / 100,
                paymentStatus: 'Paid',
                paymentMethod: 'KARTE (Stripe)',
                stripeSessionId: session.id,
                shortId: generatedShortId
            });

            await newOrder.save();
            for (const item of metadataItems) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
            }
            const populated = await Order.findById(newOrder._id).populate('items.productId');
            sendStatusEmail(populated, "pending").catch(e => console.error("📧 Mail hatası:", e.message));
            return res.json(populated);
        }
        return res.status(404).json({ message: "Bestellung wird verarbeitet..." });
    } catch (err) {
        res.status(500).json({ message: "Fehler" });
    }
};

/**
 * 3️⃣ TÜM SİPARİŞLERİ GETİR (ARŞİV DAHİL SON 3 AY)
 */
exports.getAllOrders = async (req, res) => {
    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // Arşivlenmiş veya aktif farketmeksizin son 3 ayın tamamını çekiyoruz
        const orders = await Order.find({
            date: { $gte: threeMonthsAgo }
        }).sort({ date: -1 }).populate('items.productId');
        res.json(orders);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * 4️⃣ TEK SİPARİŞ GETİR
 */
exports.getOrderById = async (req, res) => {
    try {
        let { id } = req.params;
        const cleanId = id.replace('#', '').replace('LB-', '').toUpperCase();
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        let order = isObjectId
            ? await Order.findById(id).populate('items.productId')
            : await Order.findOne({ shortId: `LB-${cleanId}` }).populate('items.productId');

        if (!order) return res.status(404).json({ message: "Sipariş bulunamadı." });
        res.json(order);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * 5️⃣ DURUM GÜNCELLEME
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, status: { $ne: "Cancelled" } },
            { $set: { status: status } },
            { new: true }
        ).populate('items.productId');

        if (!order) return res.status(400).json({ message: "Sipariş zaten iptal edilmiş veya bulunamadı." });

        if (status === "Cancelled") {
            await processFullRefundAndStock(order);
            await order.save();
        }

        sendStatusEmail(order, status).catch(err => console.error("❌ Mail hatası:", err.message));
        res.json({ success: true, message: "Status başarıyla güncellendi." });
    } catch (err) {
        res.status(500).json({ message: "Güncellenemedi", error: err.message });
    }
};

/**
 * 6️⃣ SİPARİŞ İPTAL (Kullanıcı Tarafı)
 */
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOneAndUpdate(
            {
                _id: req.params.id,
                status: { $in: ["Pending", "Processing"] }
            },
            { $set: { status: "Cancelled" } },
            { new: true }
        ).populate('items.productId');

        if (!order) return res.status(400).json({ message: "Stornierung nicht möglich." });

        await processFullRefundAndStock(order);
        await order.save();

        sendStatusEmail(order, "Cancelled").catch(err => console.error("❌ İptal maili hatası:", err));
        res.json({ message: "Bestellung erfolgreich storniert.", success: true, order });
    } catch (err) {
        res.status(500).json({ message: "Serverfehler", error: err.message });
    }
};

/**
 * 7️⃣ SİPARİŞİ LİSTEDEN KALDIR (SOFT DELETE / ARCHIVE)
 * 🛡️ REVIZE: Siparişi silmez, sadece arşivler.
 */
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
        if (!order) return res.status(404).json({ message: "Bestellung nicht gefunden." });
        res.json({ success: true, message: "Sipariş aktif listeden kaldırıldı." });
    } catch (err) { res.status(500).json({ message: "Hata" }); }
};

/**
 * 8️⃣ SİPARİŞİ ARŞİVDEN GERİ GETİR (RESTORE)
 * 🛡️ MÜHÜR: Yanlışlıkla silinen siparişi aktif listeye döndürür.
 */
exports.restoreOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { isArchived: false }, { new: true });
        if (!order) return res.status(404).json({ message: "Bestellung nicht gefunden." });
        res.json({ success: true, message: "Sipariş başarıyla geri getirildi!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// Eski archiveOrder metodunu uyumluluk için koruyoruz
exports.archiveOrder = async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { isArchived: true });
        res.json({ message: "Sipariş arşivlendi." });
    } catch (err) { res.status(500).json({ message: err.message }); }
};