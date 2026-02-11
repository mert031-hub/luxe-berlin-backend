/**
 * LUXE BERLIN - SUCCESS PAGE LOGIC
 */

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const API_URL = '/api'; // Backend entegrasyonu için sabit yol

async function loadOrderSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const fullOrderId = urlParams.get('orderId');
    const shortDisplayId = urlParams.get('displayId');

    // Eğer ID'ler yoksa kullanıcıyı ana sayfaya geri gönder (Güvenlik)
    if (!fullOrderId && !shortDisplayId) {
        window.location.href = 'index.html';
        return;
    }

    // Ekrandaki Sipariş Numarasını Güncelle
    const orderIdElement = document.getElementById('orderIdText');
    if (orderIdElement) {
        orderIdElement.innerText = shortDisplayId || "LB-XXXXXX";
    }

    // Takip butonunun linkini ayarla
    const trackBtn = document.getElementById('trackBtn');
    if (trackBtn) {
        trackBtn.href = `track.html?id=${shortDisplayId || fullOrderId}`;
    }

    if (fullOrderId) {
        try {
            const res = await fetch(`${API_URL}/orders/${fullOrderId}`);
            const order = await res.json();

            if (res.ok) {
                // 1. Ürün Listesini Oluştur
                const list = document.getElementById('summary-list');
                if (list) {
                    list.innerHTML = order.items.map(item => `
                        <div class="summary-item d-flex justify-content-between align-items-center">
                            <span class="small"><strong>${item.qty}x</strong> ${item.name}</span>
                            <span class="small fw-bold">${euro.format(item.price * item.qty)}</span>
                        </div>
                    `).join('');
                }

                // 2. Toplam Tutarı Güncelle
                const totalEl = document.getElementById('totalAmountText');
                if (totalEl) totalEl.innerText = euro.format(order.totalAmount);

                // 3. Adres Bilgisini Güncelle
                const addressEl = document.getElementById('addressText');
                if (addressEl) {
                    addressEl.innerText = `${order.customer.firstName} ${order.customer.lastName}, ${order.customer.address}`;
                }

                // KRİTİK: Başarılı sipariş doğrulanınca yorum yapma iznini ver
                localStorage.setItem('luxeHasOrdered', 'true');

                // --- YENİ: Yorum Sayacını Sıfırla ---
                // Yeni sipariş geldiği için kullanıcıya tekrar 2 yorum hakkı tanımlanır.
                localStorage.setItem('luxeReviewSentCount', '0');
            }
        } catch (err) {
            console.error("Sipariş verisi yüklenirken hata oluştu:", err);
        }
    }
}

// Sayfa yüklendiğinde çalıştır
document.addEventListener('DOMContentLoaded', loadOrderSuccess);