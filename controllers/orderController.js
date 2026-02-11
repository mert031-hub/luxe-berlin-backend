const Order = require("../models/Order");
const Product = require("../models/Product");

// SADECE mail fonksiyonunu alıyoruz
const { sendStatusEmail } = require("../config/mailer");

/**
 * 1️⃣ SİPARİŞ OLUŞTURMA
 * - Stok kontrolü
 * - Sipariş kaydı
 * - Stok düşme
 * - Onay maili (arka planda / Resend)
 */
exports.createOrder = async (req, res) => {
    try {
        const { customer, items, totalAmount, paymentMethod } = req.body;

        // A. STOK KONTROLÜ
        for (const item of items) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(404).json({
                    message: "Produkt nicht gefunden."
                });
            }

            if (product.stock < item.qty) {
                return res.status(400).json({
                    message: `Leider ist nicht mehr genügend Lagerbestand für ${product.name} vorhanden.`
                });
            }
        }

        // B. SİPARİŞİ KAYDET
        const newOrder = new Order({
            customer: {
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone,
                address: customer.address
            },
            items,
            totalAmount,
            paymentMethod: paymentMethod || "Unbekannt"
        });

        await newOrder.save();

        // C. STOKLARI DÜŞ
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.qty }
            });
        }

        // D. ONAY MAİLİ (ARKA PLANDA)
        // TEST MODUNDA SADECE SABİT MAİL'E GİDER
        sendStatusEmail(newOrder, "pending").catch(err =>
            console.error("❌ Onay maili gönderilemedi:", err.message)
        );

        // KULLANICIYA GÖSTERİLECEK ID
        const shortId = `LB-${newOrder._id
            .toString()
            .slice(-6)
            .toUpperCase()}`;

        console.log(`✅ Sipariş oluşturuldu: #${shortId}`);

        res.status(201).json({
            message: "Sipariş başarılı!",
            orderId: newOrder._id,
            shortId
        });

    } catch (err) {
        console.error("❌ Sipariş oluşturma hatası:", err);
        res.status(500).json({
            message: "Sipariş oluşturulamadı!",
            error: err.message
        });
    }
};

/**
 * 2️⃣ SİPARİŞ DURUM GÜNCELLEME
 * - Status değişince otomatik mail gider
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                message: "Sipariş bulunamadı"
            });
        }

        // Durum maili (arka planda)
        sendStatusEmail(updatedOrder, status).catch(err =>
            console.error("❌ Durum maili gönderilemedi:", err.message)
        );

        res.json(updatedOrder);

    } catch (err) {
        console.error("❌ Durum güncelleme hatası:", err);
        res.status(500).json({
            message: "Güncellenemedi",
            error: err.message
        });
    }
};

// getOrderById, getAllOrders, deleteOrder, archiveOrder aynı kalabilir
