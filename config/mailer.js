const { Resend } = require("resend");

// Render panelinde tanımlı olmalı:
// RESEND_API_KEY=rs_xxxxxxxxx
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sipariş durumuna göre mail gönderen servis
 * ŞU AN TEST MODUNDADIR
 * Domain doğrulanana kadar SADECE kendi mailine gönderir
 */
async function sendStatusEmail(order, newStatus) {
    if (!order) return;

    let subject = "";
    let message = "";
    const status = newStatus ? newStatus.toLowerCase() : "";

    // Sipariş durumuna göre içerik
    if (status === "pending" || status === "eingegangen") {
        subject = "Ihre Bestellung bei LUXE BERLIN";
        message = "Wir haben Ihre Bestellung erhalten und bereiten sie vor.";
    }
    else if (status === "processing" || status === "in bearbeitung") {
        subject = "Ihre Bestellung wird jetzt bearbeitet";
        message = "Ihre Bestellung wird sorgfältig geprüft und verpackt.";
    }
    else if (status === "shipped" || status === "versandt") {
        subject = "Ihre Bestellung ist auf dem Weg!";
        message = `Ihre Bestellung #LB-${order._id
            .toString()
            .slice(-6)
            .toUpperCase()} wurde an den Versanddienstleister übergeben.`;
    }
    else if (status === "delivered" || status === "geliefert") {
        subject = "Ihre Bestellung wurde zugestellt";
        message =
            "Vielen Dank, dass Sie sich für LUXE BERLIN entschieden haben. Viel Freude mit Ihrem Produkt!";
    }
    else {
        subject = "Update zu Ihrer Bestellung";
        message = `Der aktuelle Status Ihrer Bestellung ist: ${newStatus}`;
    }

    try {
        const { data, error } = await resend.emails.send({
            // Domain doğrulanana kadar SADECE bu adres kullanılabilir
            from: "LUXE BERLIN <onboarding@resend.dev>",

            // TEST MAIL – sabit olmalı
            to: ["kocyigit.trade@gmail.com"],

            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: auto; color: #1c2541;">
                    <h1 style="color: #c5a059; text-align: center;">LUXE BERLIN</h1>
                    <h2 style="text-align: center;">Bestellstatus-Update</h2>

                    <p style="font-size: 16px; line-height: 1.6;">
                        ${message}
                    </p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://luxe-berlin-backend.onrender.com/track.html?id=${order._id}"
                           style="background: #1c2541; color: #ffffff; padding: 14px 24px; text-decoration: none; border-radius: 30px; font-weight: bold;">
                            BESTELLUNG VERFOLGEN
                        </a>
                    </div>

                    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />

                    <p style="font-size: 12px; color: #777; text-align: center;">
                        © 2026 LUXE BERLIN. Alle Rechte vorbehalten.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error("❌ Resend API Hatası:", error);
            return;
        }

        if (!data) {
            console.error("❌ Resend: data boş döndü");
            return;
        }

        console.log("✅ Mail başarıyla gönderildi | Resend ID:", data.id);
    } catch (err) {
        console.error("❌ Mail gönderim catch hatası:", err.message);
    }
}

module.exports = { sendStatusEmail };
