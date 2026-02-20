/**
 * LUXE BERLIN - SUCCESS PAGE LOGIC
 * FIX: Sipariş özetine ürün görselleri eklendi.
 */

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

// API URL Senkronu
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

const UPLOADS_URL = ''; // Gerektiğinde doldurulabilir

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
                if (list && order.items) {
                    list.innerHTML = order.items.map(item => {
                        // 🛡️ SENIOR FIX: Ürün görselini productId üzerinden veya yedek olarak çek
                        const imgPath = item.productId?.image || 'https://via.placeholder.com/50';
                        const finalImg = imgPath.startsWith('http') ? imgPath : `${UPLOADS_URL}/${imgPath}`;

                        return `
                            <div class="summary-item d-flex justify-content-between align-items-center mb-3">
                                <div class="d-flex align-items-center">
                                    <img src="${finalImg}" width="45" height="45" class="me-3 rounded shadow-sm" style="object-fit: cover; border: 1px solid rgba(0,0,0,0.05);">
                                    <div class="d-flex flex-column">
                                        <span class="small fw-bold text-dark">${item.name}</span>
                                        <span class="text-muted" style="font-size: 0.75rem;">Menge: ${item.qty}</span>
                                    </div>
                                </div>
                                <span class="small fw-bold text-navy">${euro.format(item.price * item.qty)}</span>
                            </div>
                        `;
                    }).join('');
                }

                const totalEl = document.getElementById('totalAmountText');
                if (totalEl) totalEl.innerText = euro.format(order.totalAmount);

                const addressEl = document.getElementById('addressText');
                if (addressEl) {
                    addressEl.innerText = `${order.customer.firstName} ${order.customer.lastName}, ${order.customer.address}`;
                }

                localStorage.setItem('luxeHasOrdered', 'true');
                localStorage.setItem('luxeReviewSentCount', '0');

                if (typeof AOS !== 'undefined') {
                    setTimeout(() => { AOS.refresh(); }, 500);
                }
            }
        } catch (err) {
            console.error("Sipariş verisi yüklenirken hata oluştu:", err);
        }
    }
}

function copyOrderId() {
    const orderIdText = document.getElementById('orderIdText');
    const idBox = document.getElementById('idBox');
    const orderId = orderIdText?.innerText;

    if (!orderId || orderId === "Laden...") return;

    navigator.clipboard.writeText(orderId).then(() => {
        idBox.classList.add('copied');
        setTimeout(() => {
            idBox.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Kopyalama hatası:', err);
    });
}

document.addEventListener('DOMContentLoaded', loadOrderSuccess);

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
                        offset: 50,
                        disableMutationObserver: false
                    });
                    AOS.refresh();
                }
                window.dispatchEvent(new Event('scroll'));
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});