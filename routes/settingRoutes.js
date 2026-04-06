const express = require("express");
const router = express.Router();
const Setting = require("../models/Setting");

// 🛡️ Ayarları Getir (Ödeme sayfası ve Admin okuyacak)
router.get("/", async (req, res) => {
    try {
        let settings = await Setting.findOne();
        // Eğer veritabanında ayar yoksa, varsayılan olarak oluştur
        if (!settings) {
            settings = await Setting.create({ shippingCost: 4.99, freeShippingThreshold: 50 });
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// 🛡️ Ayarları Güncelle (Admin Panelinden gelen yeni limitleri kaydeder)
router.post("/", async (req, res) => {
    try {
        const { shippingCost, freeShippingThreshold } = req.body;
        let settings = await Setting.findOne();

        if (!settings) settings = new Setting();

        settings.shippingCost = shippingCost;
        settings.freeShippingThreshold = freeShippingThreshold;
        await settings.save();

        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ message: "Update Error", error: err.message });
    }
});

module.exports = router;