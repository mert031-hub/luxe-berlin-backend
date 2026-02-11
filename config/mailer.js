const { Resend } = require("resend");

// Render panelinde tanımlı olmalı: RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sipariş durumuna göre mail gönderen servis
 * TEST MODUNDA: Sadece doğrulanmış dmero904@gmail.com adresine gider.
 */
async function sendStatusEmail(order, newStatus) {
    if (!order) return;

    let subject = "";
    let message = "";
    const status = newStatus ? newStatus.toLowerCase() : "";

    // Sipariş durumuna göre içerik ve konu belirleme
    if (status === "pending" || status === "eingegangen") {
        subject = "Bestellbestätigung - LUXE BERLIN";
        message = "Wir haben Ihre Bestellung erhalten ve bereiten sie mit Sorgfalt vor.";
    }
    else if (status === "processing" || status === "in bearbeitung") {
        subject = "Ihre Bestellung wird bearbeitet";
        message = "Ihre exklusiven Stücke werden nun geprüft ve für den Versand vorbereitet.";
    }
    else if (status === "shipped" || status === "versandt") {
        subject = "Ihre Bestellung ist auf dem Weg!";
        message = `Gute Nachrichten! Ihre Bestellung #LB-${order._id.toString().slice(-6).toUpperCase()} wurde an den Versanddienstleister übergeben.`;
    }
    else if (status === "delivered" || status === "geliefert") {
        subject = "Ihre Bestellung wurde zugestellt";
        message = "Vielen Dank für Ihr Vertrauen in LUXE BERLIN. Wir hoffen, dass Sie viel Freude mit Ihrem Kauf haben!";
    }
    else {
        subject = "Update zu Ihrer Bestellung";
        message = `Der aktuelle Status Ihrer Bestellung wurde aktualisiert: ${newStatus}`;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: "LUXE BERLIN <onboarding@resend.dev>",
            to: ["dmero904@gmail.com"], // Yeni hedef adres ✅
            subject: subject,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Montserrat:wght@400;600&display=swap');
                        body { margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Montserrat', sans-serif; }
                        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                        .header { background-color: #1c2541; padding: 40px 20px; text-align: center; }
                        .logo { font-family: 'Playfair Display', serif; color: #ffffff; font-size: 28px; letter-spacing: 4px; text-decoration: none; }
                        .logo span { color: #c5a059; }
                        .content { padding: 40px 30px; color: #1c2541; line-height: 1.8; }
                        .status-badge { display: inline-block; padding: 8px 20px; background-color: #c5a059; color: #ffffff; border-radius: 50px; font-weight: 600; font-size: 11px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
                        .order-id { color: #6c757d; font-size: 13px; margin-bottom: 10px; font-weight: 600; }
                        .message-box { font-size: 16px; margin-bottom: 30px; border-left: 3px solid #c5a059; padding-left: 20px; font-style: italic; }
                        .cta-button { display: inline-block; padding: 16px 35px; background-color: #1c2541; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; letter-spacing: 1px; text-align: center; }
                        .footer { background-color: #f1f3f5; padding: 30px; text-align: center; color: #adb5bd; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo">LUXE<span>BERLIN</span></div>
                        </div>
                        <div class="content">
                            <div class="status-badge">Bestell-Update</div>
                            <div class="order-id">Sipariş No: #LB-${order._id.toString().slice(-6).toUpperCase()}</div>
                            <h2 style="font-family: 'Playfair Display', serif; margin-bottom: 20px; color: #1c2541;">Hallo!</h2>
                            <div class="message-box">
                                ${message}
                            </div>
                            <div style="text-align: center; margin-top: 40px;">
                                <a href="https://luxe-berlin-backend.onrender.com/track.html?id=${order._id}" class="cta-button">BESTELLUNG VERFOLGEN</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 LUXE BERLIN. Alle Rechte vorbehalten.<br>Kurfürstendamm 21, 10719 Berlin</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error("❌ Resend API Hatası:", error);
            return;
        }

        console.log("✅ Mail başarıyla gönderildi | Alıcı: dmero904@gmail.com | ID:", data.id);
    } catch (err) {
        console.error("❌ Mail gönderim hatası:", err.message);
    }
}

module.exports = { sendStatusEmail };