const Review = require('../models/Review');

exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Fehler beim Laden der Rezensionen." });
    }
};

exports.createReview = async (req, res) => {
    try {
        // Model ile uyum için req.body içindeki veriyi map ediyoruz
        const newReview = new Review({
            name: req.body.name,
            text: req.body.text || req.body.comment, // fallback
            rating: req.body.rating || req.body.stars // fallback
        });
        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(400).json({ message: "Fehler beim Senden." });
    }
};

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

exports.deleteReview = async (id) => {
    try {
        await Review.findByIdAndDelete(id);
        return { success: true };
    } catch (err) {
        throw err;
    }
};