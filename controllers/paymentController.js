const { sendStatusEmail } = require('../config/mailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * LUXE BERLIN - PAYMENT CONTROLLER (VALIDATION FIXED)
 */

exports.createCheckoutSession = async (req, res) => {
    try {
        const { cartItems, customerInfo } = req.body;

        // 🛡️ MÜHÜR: Hem Stripe hem de Metadata için doğrulanmış ürün listesi oluşturuyoruz
        const verifiedItemsForMetadata = [];

        const line_items = await Promise.all(cartItems.map(async (item) => {
            const product = await Product.findById(item.id);
            if (!product) throw new Error(`Produkt nicht gefunden: ${item.id}`);

            // Metadata için gereken tüm zorunlu alanları burada topluyoruz
            verifiedItemsForMetadata.push({
                productId: product._id.toString(),
                name: product.name,
                qty: item.qty,
                price: product.price // Modelin istediği zorunlu alan
            });

            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: product.name,
                        images: [product.image && product.image.startsWith('http') ? product.image : 'https://kocyigit-trade.com/favicon.png'],
                    },
                    unit_amount: Math.round(product.price * 100),
                },
                quantity: item.qty,
            };
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            customer_email: customerInfo.email,
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/payment.html`,
            metadata: {
                firstName: customerInfo.firstName,
                lastName: customerInfo.lastName,
                phone: customerInfo.phone,
                address: customerInfo.address,
                // 🛡️ MÜHÜR: Doğrulanmış veriyi JSON olarak gömüyoruz
                cartItems: JSON.stringify(verifiedItemsForMetadata)
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (err) {
        console.error("❌ STRIPE SESSION ERROR:", err.message);
        res.status(500).json({ message: "Fehler beim Erstellen der Zahlungssitzung." });
    }
};

exports.stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`❌ Webhook-Signaturfehler: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log("🔔 Webhook tetiklendi! Session ID:", session.id);

        try {
            // Metadata'dan gelen verileri ayrıştırıyoruz
            const items = JSON.parse(session.metadata.cartItems);

            // 🛡️ MÜHÜR: Kaydetmeden önce veriyi kontrol et (Debug için)
            console.log("📦 Kaydedilecek Ürünler:", items);

            const newOrder = new Order({
                customer: {
                    firstName: session.metadata.firstName,
                    lastName: session.metadata.lastName,
                    email: session.customer_details.email,
                    phone: session.metadata.phone,
                    address: session.metadata.address
                },
                items: items, // Artık içinde name ve price var!
                totalAmount: session.amount_total / 100,
                paymentStatus: 'Paid',
                paymentMethod: 'KARTE (Stripe)',
                stripeSessionId: session.id,
                shortId: "LB-" + Math.random().toString(36).substr(2, 6).toUpperCase()
            });

            await newOrder.save();
            console.log(`✅ Bestellung erfolgreich erstellt: ${newOrder.shortId}`);

            // 📧 MÜHÜR: Müşteriye Onay Maili Gönder
            // Ürün detaylarını (resim vb.) mailde gösterebilmek için siparişi tekrar popüle ediyoruz
            const populatedOrder = await Order.findById(newOrder._id).populate('items.productId');

            sendStatusEmail(populatedOrder, "pending").then(() => {
                console.log("📧 Onay maili müşteriye başarıyla gönderildi.");
            }).catch(err => {
                console.error("❌ Onay maili gönderim hatası:", err.message);
            });

            // Stok Güncelleme
            for (const item of items) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
            }
        } catch (saveErr) {
            console.error("❌ VALIDASYON HATASI (Kayıt yapılamadı):", saveErr.message);
        }
    }

    res.json({ received: true });
};