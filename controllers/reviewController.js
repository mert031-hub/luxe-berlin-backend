const Review = require('../models/Review');

// Tüm yorumları getir
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Laden der Rezensionen." });
    }
};

// Yeni yorum oluştur
exports.createReview = async (req, res) => {
    try {
        const newReview = new Review(req.body);
        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(400).json({ message: "Fehler beim Senden." });
    }
};

// Admin Cevabı
exports.replyToReview = async (req, res) => {
    try {
        const updatedReview = await Review.findByIdAndUpdate(
            req.params.id,
            { adminReply: req.body.replyText },
            { new: true }
        );
        res.json(updatedReview);
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Antworten." });
    }
};

// Yorum Sil
exports.deleteReview = async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ message: "Rezension gelöscht." });
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Löschen." });
    }
};