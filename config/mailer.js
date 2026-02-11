const { Resend } = require('resend');

// Resend API Key'i başlatıyoruz
// Not: Render panelinde RESEND_API_KEY adında bir ortam değişkeni oluşturmalısın.
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sipariş durumuna göre mail içeriğini hazırlayıp gönderen fonksiyon
 */
async function sendStatusEmail(order, newStatus) {
    if (!order) return;

    let subject = "";
    let message = "";
    const status = newStatus ? newStatus.toLowerCase() : '';

    // İçerik belirleme mantığı (Aynen korundu)
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

    try {
        // RESEND API GÖNDERİMİ
        const { data, error } = await resend.emails.send({
            // ÖNEMLİ: Domain onaylamadıysan sadece bu adresi kullanabilirsin:
            from: 'LUXE BERLIN <onboarding@resend.dev>',
            to: [order.customerEmail || (order.customer && order.customer.email)],
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
        });

        if (error) {
            console.error("❌ Resend API Hatası:", error.message);
            return;
        }

        console.log(`✅ Mail Resend ile başarıyla uçuruldu! ID: ${data.id}`);

    } catch (err) {
        console.error("❌ Arka plan mail gönderim hatası:", err.message);
    }
}

module.exports = { sendStatusEmail };