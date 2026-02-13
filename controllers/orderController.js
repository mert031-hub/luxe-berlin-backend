const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendStatusEmail } = require("../config/mailer");

/**
 * 1️⃣ SİPARİŞ OLUŞTURMA
 */
exports.createOrder = async (req, res) => {
    try {
        const { customer, items, totalAmount, paymentMethod } = req.body;

        // Stok Kontrolü
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ message: "Produkt nicht gefunden." });
            if (product.stock < item.qty) {
                return res.status(400).json({ message: `Nicht genügend Lagerbestand für ${product.name}.` });
            }
        }

        // Yeni Sipariş Nesnesi
        const newOrder = new Order({
            customer, items, totalAmount,
            paymentMethod: paymentMethod || "Unbekannt",
            shortId: "TEMP"
        });

        // shortId Oluşturma
        const generatedShortId = `LB-${newOrder._id.toString().slice(-6).toUpperCase()}`;
        newOrder.shortId = generatedShortId;

        // Siparişi ve Stok Güncellemesini Kaydet
        await newOrder.save();

        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
        }

        // Resend üzerinden arka planda mail gönder
        sendStatusEmail(newOrder, "pending").catch(err =>
            console.error("❌ Onay maili hatası:", err.message)
        );

        console.log(`✅ Sipariş oluşturuldu: #${generatedShortId}`);

        res.status(201).json({
            message: "Sipariş başarılı!",
            orderId: newOrder._id,
            shortId: generatedShortId
        });
    } catch (err) {
        console.error("❌ Sipariş oluşturma hatası:", err);
        res.status(500).json({ message: "Sipariş oluşturulamadı!", error: err.message });
    }
};

/**
 * 2️⃣ TÜM SİPARİŞLERİ GETİR (Admin Panel)
 */
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: "Hata", error: err.message });
    }
};

/**
 * 3️⃣ TEK SİPARİŞ GETİR (Tracking)
 */
exports.getOrderById = async (req, res) => {
    try {
        let { id } = req.params;
        const cleanId = id.replace('#', '').replace('LB-', '').toUpperCase();

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        let order;

        if (isObjectId) {
            order = await Order.findById(id).populate('items.productId');
        } else {
            order = await Order.findOne({ shortId: `LB-${cleanId}` }).populate('items.productId');
        }

        if (!order) return res.status(404).json({ message: "Sipariş bulunamadı." });
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * 4️⃣ DURUM GÜNCELLEME
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });

        if (updatedOrder) {
            sendStatusEmail(updatedOrder, status).catch(err =>
                console.error("❌ Durum maili hatası:", err.message)
            );
        }
        res.json(updatedOrder);
    } catch (err) {
        res.status(500).json({ message: "Güncellenemedi", error: err.message });
    }
};

/**
 * 5️⃣ SİPARİŞ SİLME
 */
exports.deleteOrder = async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: "Sipariş silindi" });
    } catch (err) {
        res.status(500).json({ message: "Silinemedi", error: err.message });
    }
};

/**
 * 6️⃣ SİPARİŞ ARŞİVLEME
 */
exports.archiveOrder = async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { isArchived: true });
        res.json({ message: "Sipariş arşivlendi." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * 7️⃣ SİPARİŞ İPTAL ETME (Müşteri/Yasal İptal)
 */
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Bestellung nicht gefunden." });

        // Sadece kargolanmamış siparişler iptal edilebilir
        if (order.status === "Shipped" || order.status === "Delivered") {
            return res.status(400).json({ message: "Versandte Bestellungen können nicht storniert werden." });
        }

        order.status = "Cancelled";
        await order.save();

        // Stokları Geri Yükle
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
        }

        // Bilgi Maili Gönder
        sendStatusEmail(order, "Cancelled").catch(err => console.error("❌ İptal maili hatası:", err));

        res.json({ message: "Bestellung erfolgreich storniert.", order });
    } catch (err) {
        res.status(500).json({ message: "Serverfehler", error: err.message });
    }
};