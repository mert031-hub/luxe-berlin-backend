const { sendStatusEmail } = require('../config/mailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * KOÇYİĞİT GmbH - OFFICIAL PAYMENT CONTROLLER (V16 ULTIMATE)
 * 🛡️ GHOST CHECKOUT KORUMASI: Webhook aşamasında otomatik iade (Refund) mühürlendi.
 * 🛡️ STOK KORUMASI: Atomik "findOneAndUpdate" ile yarış durumları engellendi.
 */

exports.createCheckoutSession = async (req, res) => {
    try {
        const { cartItems, customerInfo } = req.body;
        const verifiedItemsForMetadata = [];

        const line_items = await Promise.all(cartItems.map(async (item) => {
            const product = await Product.findById(item.id);
            if (!product) throw new Error(`Produkt nicht gefunden: ${item.id}`);

            // 🛡️ 1. KİLİT: Stripe sayfası oluşturulurken ilk kontrol
            if (product.stock < item.qty) {
                throw new Error(`Entschuldigung, ${product.name} ist leider gerade ausverkauft.`);
            }

            verifiedItemsForMetadata.push({
                productId: product._id.toString(),
                name: product.name,
                qty: item.qty,
                price: product.price,
                image: product.image
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
            success_url: `${process.env.CLIENT_URL || 'https://kocyigit-trade.com'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL || 'https://kocyigit-trade.com'}/payment.html`,
            metadata: {
                firstName: customerInfo.firstName,
                lastName: customerInfo.lastName,
                phone: customerInfo.phone,
                address: customerInfo.address,
                cartItems: JSON.stringify(verifiedItemsForMetadata)
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (err) {
        console.error("❌ STRIPE SESSION ERROR:", err.message);
        res.status(500).json({ message: err.message });
    }
};

exports.getSessionStatus = async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        res.json(session);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 🛡️ WEBHOOK: PARA GELDİĞİNDE SON KONTROL VE MÜHÜR
exports.stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`❌ Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        try {
            const existingOrder = await Order.findOne({ stripeSessionId: session.id });
            if (existingOrder) return res.json({ received: true });

            const items = JSON.parse(session.metadata.cartItems);
            let stockError = false;

            // 🛡️ 2. KİLİT: Atomik Stok Düşüşü Denemesi
            for (const item of items) {
                const updatedProduct = await Product.findOneAndUpdate(
                    { _id: item.productId, stock: { $gte: item.qty } },
                    { $inc: { stock: -item.qty } },
                    { new: true }
                );

                if (!updatedProduct) {
                    stockError = true;
                    console.error(`⚠️ KRİTİK HATA: ${item.name} için stok yetersiz! Otomatik iade süreci başlıyor...`);
                    break;
                }
            }

            // ❌ EĞER STOK YETMEDİYSE (GHOST CHECKOUT)
            if (stockError) {
                // 1. Parayı Stripe üzerinden otomatik iade et
                if (session.payment_intent) {
                    await stripe.refunds.create({
                        payment_intent: session.payment_intent,
                        reason: 'requested_by_customer', // veya 'expired_stock' gibi bir açıklama
                        metadata: { reason: "Automatischer Refund: Lagerbestand überschritten" }
                    });
                }

                // 2. Siparişi "Storniert/Hata" olarak kaydet (Takip için)
                const errorOrder = new Order({
                    customer: {
                        firstName: session.metadata.firstName,
                        lastName: session.metadata.lastName,
                        email: session.customer_details.email,
                        phone: session.metadata.phone,
                        address: session.metadata.address
                    },
                    items,
                    totalAmount: session.amount_total / 100,
                    paymentStatus: 'Refunded (Auto)',
                    status: 'Cancelled',
                    paymentMethod: 'Automatic Refund',
                    stripeSessionId: session.id,
                    shortId: `ERR-${Date.now().toString(36).toUpperCase()}`
                });
                await errorOrder.save();

                console.log("💰 Ghost Checkout engellendi, para iade edildi ve kayıt tutuldu.");
                return res.json({ received: true });
            }

            // ✅ STOK VARSA: Siparişi Normal Şekilde Kaydet
            const timestamp = Date.now().toString(36).toUpperCase();
            const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
            const generatedShortId = `LB-${timestamp}${randomStr}`;
            const methodType = session.payment_method_types[0]?.toUpperCase() || 'STRIPE';

            const newOrder = new Order({
                customer: {
                    firstName: session.metadata.firstName,
                    lastName: session.metadata.lastName,
                    email: session.customer_details.email,
                    phone: session.metadata.phone,
                    address: session.metadata.address
                },
                items,
                totalAmount: session.amount_total / 100,
                paymentStatus: 'Paid',
                paymentMethod: `${methodType} (Online)`,
                stripeSessionId: session.id,
                shortId: generatedShortId
            });

            await newOrder.save();
            const populatedOrder = await Order.findById(newOrder._id).populate('items.productId');
            sendStatusEmail(populatedOrder, "pending");

            console.log(`✅ Sipariş Başarıyla Mühürlendi: ${generatedShortId}`);

        } catch (saveErr) {
            console.error("❌ WEBHOOK İŞLEM HATASI:", saveErr.message);
        }
    }
    res.json({ received: true });
};