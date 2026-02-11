const Order = require('../models/Order');
const Product = require('../models/Product');
// Sadece sendStatusEmail fonksiyonunu çekmemiz yeterli
const { sendStatusEmail } = require('../config/mailer');

// 1. SİPARİŞ OLUŞTURMA, STOK KONTROLÜ VE MAİL
exports.createOrder = async (req, res) => {
    try {
        const { customer, items, totalAmount, paymentMethod } = req.body;

        // --- A. STOK KONTROLÜ ---
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ message: "Produkt nicht gefunden." });

            if (product.stock < item.qty) {
                return res.status(400).json({
                    message: `Leider ist nicht mehr genügend Lagerbestand für ${product.name} vorhanden.`
                });
            }
        }

        // --- B. SİPARİŞİ KAYDET ---
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

        // --- C. STOKLARI DB'DEN DÜŞ ---
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.qty }
            });
        }

        // --- D. ONAY MAİLİ (RESEND İLE ARKA PLANDA) ---
        // Artık mailOptions oluşturmaya gerek yok, mailer içindeki fonksiyonu çağırıyoruz
        sendStatusEmail(newOrder, 'pending').catch(err =>
            console.error("❌ Onay maili arka planda başarısız oldu:", err.message)
        );

        const orderIdShort = newOrder._id.toString().slice(-6).toUpperCase();
        const displayId = `LB-${orderIdShort}`;

        console.log(`✅ Sipariş veritabanına kaydedildi: #${displayId}`);

        // Kullanıcıyı hemen başarı sayfasına yolluyoruz
        res.status(201).json({
            message: "Sipariş başarılı!",
            orderId: newOrder._id,
            shortId: displayId
        });

    } catch (err) {
        console.error("Sipariş Hatası:", err);
        res.status(500).json({ message: "Sipariş oluşturulamadı!", error: err.message });
    }
};

// ... getOrderById, getAllOrders fonksiyonları aynı kalıyor ...

// DURUM GÜNCELLEME VE OTOMATİK MAİL TETİKLEYİCİ
exports.updateOrderStatus = async (req, res) => {
    try {
        const newStatus = req.body.status;

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: newStatus },
            { new: true }
        );

        if (updatedOrder) {
            // Durum güncellendiğinde müşteriye otomatik mail gider (Arka planda)
            sendStatusEmail(updatedOrder, newStatus).catch(err =>
                console.error("❌ Durum maili hatası:", err.message)
            );
        }

        res.json(updatedOrder);
    } catch (err) {
        console.error("Güncelleme Hatası:", err);
        res.status(500).json({ message: "Güncellenemedi", error: err.message });
    }
};

// ... deleteOrder ve archiveOrder aynı kalıyor ...