const Order = require('../models/Order');
const Product = require('../models/Product');
// Mailer dosyasından hem transporter'ı hem de yeni fonksiyonu çekiyoruz
const { transporter, sendStatusEmail } = require('../config/mailer');

// 1. SİPARİŞ OLUŞTURMA, STOK KONTROLÜ VE MAİL
exports.createOrder = async (req, res) => {
    try {
        const { customer, items, totalAmount, paymentMethod } = req.body;

        // --- A. STOK KONTROLÜ ---
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: "Produkt nicht gefunden." });
            }
            if (product.stock < item.qty) {
                return res.status(400).json({
                    message: `Leider ist nicht mehr genügend Lagerbestand für ${product.name} vorhanden. Aktuell verfügbar: ${product.stock}`
                });
            }
        }

        // --- B. SİPARİŞİ KAYDET ---
        // DÜZELTME: Telefon numarasının kesin olarak kaydedilmesi için customer nesnesini açıkça tanımlıyoruz
        const newOrder = new Order({
            customer: {
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone, // Telefon artık DB'ye gönderiliyor 📞
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

        // --- D. PROFESYONEL ONAY MAİLİ ---
        const orderIdShort = newOrder._id.toString().slice(-6).toUpperCase();
        const displayId = `LB-${orderIdShort}`;

        const mailOptions = {
            from: `"LUXE BERLIN" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject: `Bestellbestätigung - LUXE BERLIN #${displayId}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="background-color: #1c2541; padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">LUXE<span style="color: #c5a059;">BERLIN</span></h1>
                    </div>
                    <div style="padding: 40px 30px; background-color: #ffffff;">
                        <h2 style="color: #1c2541; margin-top: 0; text-align: center;">Vielen Dank für Ihre Bestellung!</h2>
                        <p style="font-size: 16px; color: #555;">Hallo <strong>${customer.firstName}</strong>,</p>
                        <p style="font-size: 14px; color: #777; line-height: 1.6;">Wir haben Ihre Bestellung erhalten. Hier ist die Zusammenfassung:</p>
                        <div style="background-color: #f9f9f9; border-left: 4px solid #c5a059; padding: 20px; margin: 25px 0;">
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Bestellnummer:</strong> #${displayId}</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Zahlungsart:</strong> ${newOrder.paymentMethod}</p>
                            <p style="margin: 5px 0; font-size: 14px;"><strong>Gesamtsumme:</strong> <span style="color: #1c2541; font-weight: bold; font-size: 18px;">${totalAmount.toFixed(2)} €</span></p>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #eee;">
                                    <th style="text-align: left; padding: 10px; font-size: 12px; color: #999; text-transform: uppercase;">Produkt</th>
                                    <th style="text-align: right; padding: 10px; font-size: 12px; color: #999; text-transform: uppercase;">Betrag</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr style="border-bottom: 1px solid #f0f0f0;">
                                        <td style="padding: 15px 10px; font-size: 14px; color: #333;">${item.qty}x ${item.name}</td>
                                        <td style="padding: 15px 10px; font-size: 14px; color: #333; text-align: right;">${(item.price * item.qty).toFixed(2)} €</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="font-size: 12px; color: #999; margin: 0;">LUXE BERLIN | Kurfürstendamm 21, 10719 Berlin</p>
                    </div>
                </div>`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Sipariş Onayı Gönderildi: #${displayId}`);

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

// 5. TEK BİR SİPARİŞİ GETİR
exports.getOrderById = async (req, res) => {
    try {
        let { id } = req.params;
        id = id.replace('#', '').replace('LB-', '').toUpperCase();
        let order;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        if (isObjectId) {
            order = await Order.findById(id).populate({ path: 'items.productId', select: 'image' });
        } else {
            const cleanId = id;
            const allOrders = await Order.find().populate({ path: 'items.productId', select: 'image' });
            order = allOrders.find(o => o._id.toString().toUpperCase().endsWith(cleanId));
        }
        if (!order) {
            return res.status(404).json({ message: "Bestellung nicht gefunden." });
        }
        const safeOrder = {
            ...order._doc,
            status: order.status || 'Pending',
            items: order.items || []
        };
        res.json(safeOrder);
    } catch (err) {
        console.error("Sipariş Getirme Hatası:", err.message);
        res.status(500).json({ message: "Serverfehler: " + err.message });
    }
};

// DİĞER FONKSİYONLAR
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json({ message: "Hata", error: err.message }); }
};

// DURUM GÜNCELLEME VE OTOMATİK MAİL TETİKLEYİCİ
exports.updateOrderStatus = async (req, res) => {
    try {
        const newStatus = req.body.status;

        // KRİTİK: Mail gönderebilmek için sipariş verisini çekiyoruz
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: newStatus },
            { new: true }
        );

        if (updatedOrder) {
            // Fonksiyonu tetikliyoruz
            await sendStatusEmail(updatedOrder, newStatus);
        }

        res.json(updatedOrder);
    } catch (err) {
        console.error("Güncelleme Hatası:", err);
        res.status(500).json({ message: "Güncellenemedi", error: err.message });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: "Sipariş silindi" });
    } catch (err) { res.status(500).json({ message: "Silinemedi", error: err.message }); }
};

exports.archiveOrder = async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { isArchived: true });
        res.json({ message: "Sipariş başarıyla arşivlendi." });
    } catch (err) { res.status(500).json({ message: err.message }); }
};