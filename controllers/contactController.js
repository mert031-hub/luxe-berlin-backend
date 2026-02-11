const nodemailer = require('nodemailer');

// .env dosyasındaki değişkenleri kullanarak taşıyıcıyı oluşturuyoruz
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Taşıyıcının (SMTP) çalışıp çalışmadığını sunucu başında kontrol et
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ E-posta Sunucusu Bağlantı Hatası:", error.message);
    } else {
        console.log("✅ E-posta Sunucusu (Nodemailer) Hazır!");
    }
});

exports.sendContactMail = async (req, res) => {
    const { name, email, subject, message } = req.body;

    try {
        const mailOptions = {
            // Gönderen kısmında Luxe Berlin ismi görünür
            from: `"LUXE Kontakt Form" <${process.env.EMAIL_USER}>`,
            // Mesaj senin deneme e-posta adresine gider
            to: process.env.EMAIL_USER,
            // 'Cevapla' butonuna basıldığında formu dolduran kişinin maili seçilir
            replyTo: email,
            subject: `Neue Kontaktanfrage: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #1c2541; border-bottom: 2px solid #c5a059; padding-bottom: 10px;">
                        Neue Nachricht von ${name}
                    </h2>
                    <p><strong>Absender E-Mail:</strong> ${email}</p>
                    <p><strong>Betreff:</strong> ${subject}</p>
                    <p><strong>Nachricht:</strong></p>
                    <div style="background:#f9f9f9; padding:20px; border-left: 5px solid #c5a059; border-radius:5px;">
                        ${message}
                    </div>
                    <p style="font-size: 0.8em; color: #777; margin-top: 20px;">
                        Diese E-Mail wurde automatisch über das Luxe Berlin Kontaktformular gesendet.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Nachricht erfolgreich gesendet" });
    } catch (err) {
        console.error("Mail Gönderim Hatası:", err);
        res.status(500).json({ message: "Mail gönderilemedi: " + err.message });
    }
};