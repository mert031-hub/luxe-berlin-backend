const mongoose = require('mongoose');
const User = require('./models/User'); // Model yolunun doğru olduğundan emin ol
const dotenv = require('dotenv');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Önce eski adminleri temizleyelim (isteğe bağlı)
        await User.deleteMany({ username: 'admin' });

        const adminUser = new User({
            username: 'admin',
            password: 'LuxeBerlin2026!' // ŞİFREN BU OLACAK
        });

        await adminUser.save();
        console.log("✅ İlk Admin Başarıyla Oluşturuldu!");
        console.log("Kullanıcı Adı: admin");
        console.log("Şifre: LuxeBerlin2026!");

        process.exit();
    } catch (err) {
        console.error("❌ Hata:", err);
        process.exit(1);
    }
};

seedAdmin();