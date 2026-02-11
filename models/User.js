const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Benutzername ist erforderlich"],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Passwort ist erforderlich"]
    }
});

// Şifreleme Middleware (Hata burada düzeltildi)
UserSchema.pre('save', async function () {
    // Şifre değişmediyse (veya yeni değilse) işleme devam etme
    if (!this.isModified('password')) return;

    try {
        // next() çağırmaya gerek yok, async/await bunu halleder
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err; // Hata durumunda Mongoose işlemi durduracaktır
    }
});

module.exports = mongoose.model('User', UserSchema);