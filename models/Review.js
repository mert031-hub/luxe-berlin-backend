const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    text: { type: String, required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    date: { type: String },
    adminReply: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', ReviewSchema);