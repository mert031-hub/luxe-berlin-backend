const nodemailer = require('nodemailer');
const dns = require('dns');

// 1. KRİTİK: Render ağındaki IPv6 (ENETUNREACH) hatalarını önlemek için 
// tüm Node.js DNS sorgularını IPv4 öncelikli yapar.
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // 587 için false (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // 2. KRİTİK: Bağlantı seviyesinde IPv4 zorlaması
    family: 4,
    connectionTimeout: 10000, // 10 saniye sonra pes et (Sunucuyu kilitleme)
    greetingTimeout: 10000,
    tls: {
        // Render ve Gmail arasındaki el sıkışma sorunlarını minimize eder
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
    }
});

/**
 * SUNUCU AÇILIŞ TESTİ (NON-BLOCKING)
 * .verify() fonksiyonunu bekletmiyoruz. Hata alsa bile sunucu "Live" olur.
 */
transporter.verify()
    .then(() => console.log("✅ E-posta Sunucusu Gönderime Hazır (Port: 587)"))
    .catch((err) => {
        console.warn("⚠️ E-posta testi başarısız: Render ağ kısıtlaması olabilir.");
        console.warn("Detay:", err.message);
        // Hata sunucuyu durdurmaz, sadece log düşer.
    });

/**
 * Sipariş durumuna göre mail içeriğini hazırlayıp gönderen fonksiyon
 */
async function sendStatusEmail(order, newStatus) {
    if (!order) return;

    let subject = "";
    let message = "";
    const status = newStatus ? newStatus.toLowerCase() : '';

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
                    <a href="https://luxe-berlin-backend.onrender.com/track.html?id=${order._id}" 
                       style="background: #1c2541; color: white; padding: 15px 25px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">
                        BESTELLUNG VERFOLGEN
                    </a>
                </div>
                <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #6c757d; text-align: center;">&copy; 2026 LUXE BERLIN. Alle Rechte vorbehalten.</p>
            </div>`
    };

    try {
        // Gönderim işlemini yapıyoruz
        await transporter.sendMail(mailOptions);
        console.log(`✅ Mail başarıyla gönderildi: ${newStatus} (#${order._id.toString().slice(-6).toUpperCase()})`);
    } catch (error) {
        // Hata durumunda sadece log basıyoruz, sipariş sürecini bozmuyoruz
        console.error("❌ Arka plan mail gönderim hatası:", error.message);
    }
}

module.exports = { transporter, sendStatusEmail };