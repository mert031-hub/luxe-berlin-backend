// contact.js

// Backend adresini merkezi olarak tanımlıyoruz
const API_URL = 'http://localhost:5000/api';

document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const responseDiv = document.getElementById('responseMessage');
    const btn = e.target.querySelector('button');

    // Form verilerini topluyoruz
    const contactData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
    };

    // Butonu işlem bitene kadar pasif yapıyoruz
    btn.disabled = true;
    btn.innerText = "SENDET...";

    try {
        // Backend'deki /api/contact rotasına istek atıyoruz
        const res = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });

        // Beklenmedik HTML yanıtlarını (404 gibi) yakala
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new TypeError("Sunucudan beklenen yanıt alınamadı (JSON Hatası).");
        }

        const result = await res.json();

        if (res.ok) {
            // Başarı durumunda kullanıcıyı bilgilendir
            responseDiv.className = "mt-4 text-center p-3 rounded-3 alert alert-success";
            responseDiv.innerText = "Vielen Dank! Ihre Nachricht wurde erfolgreich versendet.";
            responseDiv.classList.remove('d-none');

            // Formu temizle
            document.getElementById('contactForm').reset();
        } else {
            throw new Error(result.message || "Ein Fehler ist aufgetreten.");
        }
    } catch (err) {
        console.error("Hata Detayı:", err);
        // Hata durumunda kullanıcıyı bilgilendir
        responseDiv.className = "mt-4 text-center p-3 rounded-3 alert alert-danger";
        responseDiv.innerText = "Fehler: " + err.message;
        responseDiv.classList.remove('d-none');
    } finally {
        // İşlem bittiğinde butonu eski haline getir
        btn.disabled = false;
        btn.innerText = "NACHRICHT SENDEN";
    }
});