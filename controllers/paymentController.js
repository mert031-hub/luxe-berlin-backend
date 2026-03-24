const { sendStatusEmail } = require('../config/mailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * KOÇYİĞİT GmbH - OFFICIAL PAYMENT CONTROLLER
 * 🛡️ SENIOR UPDATE: ID Çakışma koruması & Webhook Bypass mühürlendi.
 * 🛡️ MULTI-PAYMENT: Apple Pay, Google Pay, PayPal & Klarna aktif edildi.
 */

exports.createCheckoutSession = async (req, res) => {
    try {
        const { cartItems, customerInfo } = req.body;
        const verifiedItemsForMetadata = [];

        const line_items = await Promise.all(cartItems.map(async (item) => {
            const product = await Product.findById(item.id);
            if (!product) throw new Error(`Produkt nicht gefunden: ${item.id}`);

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
            // 🛡️ REVIZE: Dashboard'da aktif ettiğin tüm yöntemleri (PayPal, Apple Pay vb.) otomatik açar.
            automatic_payment_methods: {
                enabled: true,
            },
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
                cartItems: JSON.stringify(verifiedItemsForMetadata)
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (err) {
        console.error("❌ STRIPE SESSION ERROR:", err.message);
        res.status(500).json({ message: "Fehler beim Erstellen der Zahlungssitzung." });
    }
};

// 🛡️ BU FONKSİYON success.js'DEKİ 404 HATASINI ÇÖZEN ANAHTARDIR
exports.getSessionStatus = async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        res.json(session);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        try {
            const existingOrder = await Order.findOne({ stripeSessionId: session.id });
            if (existingOrder) return res.json({ received: true });

            const items = JSON.parse(session.metadata.cartItems);
            const timestamp = Date.now().toString(36).toUpperCase();
            const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
            const generatedShortId = `LB-${timestamp}${randomStr}`;

            // 🛡️ Ödeme yöntemini dinamik olarak alıyoruz (Card, PayPal, Klarna vb.)
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

            for (const item of items) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
            }
        } catch (saveErr) {
            console.error("❌ WEBHOOK KAYIT HATASI:", saveErr.message);
        }
    }
    res.json({ received: true });
};