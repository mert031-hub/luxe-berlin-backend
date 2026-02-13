const { Resend } = require("resend");

// Render panelinde tanımlı olmalı: RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sipariş durumuna göre mail gönderen servis
 * Premium HTML tasarımı ve shortId optimizasyonu ile güncellendi.
 */
async function sendStatusEmail(order, newStatus) {
    if (!order) return;

    let subject = "";
    let message = "";
    let statusLabel = "Bestell-Update";
    const status = newStatus ? newStatus.toLowerCase() : "";

    // Sipariş durumuna göre içerik ve konu belirleme
    if (status === "pending" || status === "eingegangen") {
        subject = "Bestellbestätigung - LUXE BERLIN";
        statusLabel = "Bestellbestätigung";
        message = "Wir haben Ihre Bestellung erhalten und bereiten sie mit höchster Sorgfalt vor.";
    }
    else if (status === "processing" || status === "in bearbeitung") {
        subject = "Ihre Bestellung wird bearbeitet";
        statusLabel = "In Bearbeitung";
        message = "Ihre exklusiven Stücke werden nun geprüft und für den Versand vorbereitet.";
    }
    else if (status === "shipped" || status === "versandt") {
        subject = "Ihre Bestellung ist auf dem Weg!";
        statusLabel = "Versandt";
        message = `Gute Nachrichten! Ihre Bestellung wurde an den Versanddienstleister übergeben.`;
    }
    else if (status === "delivered" || status === "geliefert") {
        subject = "Ihre Bestellung wurde zugestellt";
        statusLabel = "Zugestellt";
        message = "Vielen Dank für Ihr Vertrauen in LUXE BERLIN. Wir hoffen, dass Sie viel Freude mit Ihrem Kauf haben!";
    }
    else {
        subject = "Update zu Ihrer Bestellung";
        message = `Der aktuelle Status Ihrer Bestellung wurde aktualisiert: ${newStatus}`;
    }

    // Ürün Listesi HTML Oluşturma
    const itemsHTML = (order.items || []).map(item => `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; font-size: 14px;">
                <span style="font-weight: 600; color: #1c2541;">${item.qty}x</span> ${item.name}
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #c5a059; font-size: 14px;">
                ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.price * item.qty)}
            </td>
        </tr>
    `).join('');

    try {
        const { data, error } = await resend.emails.send({
            // Doğrulanan domain üzerinden gönderim
            from: "LUXE BERLIN <noreply@kocyigit-trade.com>",
            to: [order.customer.email],
            subject: subject,
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                    .header { background-color: #1c2541; padding: 40px 20px; text-align: center; border-bottom: 4px solid #c5a059; }
                    .logo { color: #ffffff; font-size: 26px; letter-spacing: 4px; font-weight: bold; text-decoration: none; }
                    .logo span { color: #c5a059; }
                    .content { padding: 40px 30px; color: #1c2541; }
                    .status-badge { display: inline-block; padding: 6px 16px; background-color: rgba(197, 160, 89, 0.1); color: #c5a059; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 25px; letter-spacing: 1px; }
                    .message-box { font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #4a5568; }
                    .order-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .total-row { font-size: 18px; font-weight: 700; color: #1c2541; }
                    .address-box { background-color: #fdfdfd; border: 1px solid #f0f0f0; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
                    .address-title { display: block; margin-bottom: 8px; font-size: 12px; color: #a0aec0; text-transform: uppercase; font-weight: 700; }
                    .btn { display: block; padding: 18px 20px; background-color: #c5a059; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-align: center; letter-spacing: 1px; }
                    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 12px; color: #999999; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">LUXE<span>BERLIN</span></div>
                    </div>
                    <div class="content">
                        <div class="status-badge">${statusLabel}</div>
                        <h2 style="margin-top: 0; font-size: 22px;">Hallo ${order.customer.firstName},</h2>
                        <div class="message-box">
                            ${message}
                        </div>
                        
                        <div style="margin-bottom: 10px; font-size: 12px; color: #a0aec0; font-weight: 700;">BESTELLÜBERSICHT</div>
                        <table class="order-table">
                            ${itemsHTML}
                            <tr class="total-row">
                                <td style="padding-top: 20px;">Gesamtsumme</td>
                                <td style="padding-top: 20px; text-align: right; color: #1c2541;">
                                    ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.totalAmount)}
                                </td>
                            </tr>
                        </table>

                        <div class="address-box">
                            <span class="address-title">Lieferadresse</span>
                            <div style="font-weight: 600; font-size: 15px;">${order.customer.firstName} ${order.customer.lastName}</div>
                            <div style="font-size: 14px; color: #4a5568;">${order.customer.address}</div>
                        </div>

                        <a href="https://kocyigit-trade.com/track.html?id=${order.shortId}" class="btn">BESTELLUNG VERFOLGEN</a>
                        
                        <div style="margin-top: 30px; font-size: 11px; color: #cbd5e0; text-align: center;">
                            Bestell-ID: #${order.shortId}
                        </div>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 LUXE BERLIN Boutique. Alle Rechte vorbehalten.<br>
                        Berlin, Deutschland | support@kocyigit-trade.com</p>
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

        console.log(`✅ Mail başarıyla gönderildi | Alıcı: ${order.customer.email} | ID: ${order.shortId}`);
    } catch (err) {
        console.error("❌ Mail gönderim hatası:", err.message);
    }
}

module.exports = { sendStatusEmail };