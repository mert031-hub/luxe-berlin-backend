const nodemailer = require('nodemailer');

// .env dosyasındaki bilgileri çekiyoruz
// GÜNCELLEME: Render/Bulut sunucularındaki IPv6 (ENETUNREACH) hatasını çözmek için 
// 'service' yerine manuel host/port ve 'family: 4' yapılandırmasına geçtik.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Port 465 için true
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    family: 4 // KRİTİK: IPv4 kullanımını zorunlu kılar, bağlantı hatasını çözer 🚀
});

// Sunucu başladığında bağlantıyı test et
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ E-posta Sunucusu Hatası:", error.message);
    } else {
        console.log("✅ E-posta Sunucusu Gönderime Hazır!");
    }
});

/**
 * Sipariş durumuna göre mail içeriğini hazırlayıp gönderen fonksiyon
 * Controller içinde kullanılır: await sendStatusEmail(updatedOrder, newStatus);
 */
async function sendStatusEmail(order, newStatus) {
    let subject = "";
    let message = "";

    // Küçük/Büyük harf duyarlılığını kaldırmak için
    const status = newStatus ? newStatus.toLowerCase() : '';

    // Sipariş durumuna göre mail içeriğini belirle
    if (status === 'pending' || status === 'eingegangen') {
        subject = "Ihre Bestellung bei LUXE BERLIN";
        message = "Wir haben Ihre Bestellung erhalten und bereiten sie vor.";
    }
    else if (status === 'processing' || status === 'in bearbeitung') {
        subject = "Ihre Bestellung wird jetzt bearbeitet";
        message = "Ihre Bestellung wird sorgfältig geprüft und verpackt.";
    }
    else if (status === 'shipped' || status === 'versandt') {
        subject = "Ihre Bestellung ist auf dem Weg!";
        message = `Ihre Bestellung #LB-${order._id.toString().slice(-6).toUpperCase()} wurde an den Versanddienstleister übergeben.`;
    }
    else if (status === 'delivered' || status === 'geliefert') {
        subject = "Ihre Bestellung wurde zugestellt";
        message = "Vielen Dank, dass Sie sich für LUXE BERLIN entschieden haben. Viel Freude mit Ihrem Produkt!";
    }
    else {
        subject = "Update zu Ihrer Bestellung";
        message = `Der aktuelle Status Ihrer Bestellung ist: ${newStatus}`;
    }

    const mailOptions = {
        from: `"LUXE BERLIN" <${process.env.EMAIL_USER}>`,
        to: order.customerEmail || (order.customer && order.customer.email),
        subject: subject,
        html: `
            <div style="font-family: 'Montserrat', Arial, sans-serif; padding: 30px; border: 1px solid #eee; max-width: 600px; margin: auto; color: #1c2541;">
                <h1 style="color: #c5a059; text-align: center; border-bottom: 2px solid #c5a059; padding-bottom: 10px;">LUXE BERLIN</h1>
                <h2 style="text-align: center;">Bestellstatus-Update</h2>
                <p style="font-size: 16px; line-height: 1.6;">${message}</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://luxeberlin.com/track.html?id=${order._id}" 
                       style="background: #1c2541; color: white; padding: 15px 25px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">
                        BESTELLUNG VERFOLGEN
                    </a>
                </div>
                <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #6c757d; text-align: center;">&copy; 2026 LUXE BERLIN. Alle Rechte vorbehalten.</p>
            </div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Mail başarıyla gönderildi: ${newStatus} (#${order._id.toString().slice(-6).toUpperCase()})`);
    } catch (error) {
        console.error("❌ Mail gönderim hatası:", error);
    }
}

module.exports = { transporter, sendStatusEmail };