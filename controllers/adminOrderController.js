const Order = require('../models/Order');
const User = require('../models/User');
const Review = require('../models/Review');

/**
 * LUXE BERLIN - ADMIN DASHBOARD CONTROLLER (BACKEND)
 * Dashboard istatistiklerini ve özet listeleri sağlar.
 */

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. İstatistik Hesaplamaları
        const totalOrders = await Order.countDocuments({ isArchived: false });
        const pendingOrders = await Order.countDocuments({ status: 'Pending' });

        const ordersForRevenue = await Order.find({ status: { $ne: 'Cancelled' } });
        const totalRevenue = ordersForRevenue.reduce((sum, order) => sum + order.totalAmount, 0);

        // 2. Özet Listeler
        const recentOrders = await Order.find({ isArchived: false })
            .sort({ date: -1 })
            .limit(5);

        const admins = await User.find({}, 'username _id');

        const recentReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            stats: {
                totalOrders,
                revenue: totalRevenue,
                pendingOrders
            },
            recentOrders,
            admins,
            reviews: recentReviews
        });

    } catch (err) {
        console.error("Dashboard Stats Error:", err.message);
        res.status(500).json({ success: false, message: "Serverfehler beim Laden der Statistiken." });
    }
};