/**
 * LUXE BERLIN - SUCCESS PAGE LOGIC
 */

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const API_URL = '/api';

async function loadOrderSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const fullOrderId = urlParams.get('orderId');
    const shortDisplayId = urlParams.get('displayId');

    if (!fullOrderId && !shortDisplayId) {
        window.location.href = 'index.html';
        return;
    }

    const orderIdElement = document.getElementById('orderIdText');
    if (orderIdElement) {
        orderIdElement.innerText = shortDisplayId || "LB-XXXXXX";
    }

    const trackBtn = document.getElementById('trackBtn');
    if (trackBtn) {
        trackBtn.href = `track.html?id=${shortDisplayId || fullOrderId}`;
    }

    if (fullOrderId) {
        try {
            const res = await fetch(`${API_URL}/orders/${fullOrderId}`);
            const order = await res.json();

            if (res.ok) {
                const list = document.getElementById('summary-list');
                if (list) {
                    list.innerHTML = order.items.map(item => `
                        <div class="summary-item d-flex justify-content-between align-items-center">
                            <span class="small"><strong>${item.qty}x</strong> ${item.name}</span>
                            <span class="small fw-bold">${euro.format(item.price * item.qty)}</span>
                        </div>
                    `).join('');
                }

                const totalEl = document.getElementById('totalAmountText');
                if (totalEl) totalEl.innerText = euro.format(order.totalAmount);

                const addressEl = document.getElementById('addressText');
                if (addressEl) {
                    addressEl.innerText = `${order.customer.firstName} ${order.customer.lastName}, ${order.customer.address}`;
                }

                localStorage.setItem('luxeHasOrdered', 'true');
                localStorage.setItem('luxeReviewSentCount', '0');
            }
        } catch (err) {
            console.error("Sipariş verisi yüklenirken hata oluştu:", err);
        }
    }
}

/**
 * Sipariş numarasını panoya kopyalayan ve animasyonu tetikleyen fonksiyon
 */
function copyOrderId() {
    const orderIdText = document.getElementById('orderIdText');
    const idBox = document.getElementById('idBox');
    const orderId = orderIdText.innerText;

    if (orderId === "Laden...") return;

    navigator.clipboard.writeText(orderId).then(() => {
        // Animasyonu tetikle
        idBox.classList.add('copied');

        // 2 saniye sonra sınıfı temizle
        setTimeout(() => {
            idBox.classList.remove('copied');
        }, 2000);

    }).catch(err => {
        console.error('Kopyalama hatası:', err);
    });
}

document.addEventListener('DOMContentLoaded', loadOrderSuccess);
/* --- PRELOADER & AOS SYNC LOGIC --- */
window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') {
                    AOS.init({
                        duration: 1000,
                        once: true,
                        offset: 100,
                        disableMutationObserver: false
                    });
                    AOS.refresh();
                }
                const adminContent = document.getElementById('adminMainContent');
                if (adminContent && localStorage.getItem('adminToken')) {
                    adminContent.classList.remove('d-none');
                    setTimeout(() => AOS.refresh(), 100);
                }
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});