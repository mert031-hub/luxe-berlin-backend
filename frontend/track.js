/**
 * LUXE BERLIN - ADVANCED TRACKING LOGIC (FULL & CANCEL-READY)
 * Yorum satırlarından arındırılmış ve eksiksiz tam sürümdür.
 */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

const UPLOADS_URL = '';
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

async function trackOrder() {
    const rawInput = document.getElementById('orderIdInput').value.trim();
    const resultArea = document.getElementById('track-result');
    const itemsList = document.getElementById('order-items-list');
    const header = document.getElementById('status-header');
    const dynamicArea = document.getElementById('dynamic-info-area');

    // ID Normalizasyonu (MongoID ise olduğu gibi bırak, Kısa ID ise büyük harf yap)
    let id;
    if (rawInput.length === 24) {
        id = rawInput; // MongoID (Linkten gelen uzun ID)
    } else {
        id = rawInput.replace('#', '').replace('LB-', '').toUpperCase(); // Manuel kısa ID
    }

    if (!id) return alert("Bitte geben Sie eine Bestellnummer ein!");

    try {
        const res = await fetch(`${API_URL}/orders/${id}`);
        const order = await res.json();

        if (res.ok && order) {
            resultArea.classList.add('d-none');
            dynamicArea.innerHTML = "";

            setTimeout(() => {
                resultArea.classList.remove('d-none');
                if (typeof AOS !== 'undefined') { AOS.refresh(); }
            }, 50);

            // Görüntüleme için ID'yi kısaltıyoruz
            const displayId = order.shortId || `#LB-${id.slice(-6).toUpperCase()}`;
            header.innerHTML = `
                <h6 class="text-muted mb-1">Bestellnummer: ${displayId}</h6>
                <h4 class="fw-bold">Status: <span style="color:#c5a059;">${translateStatus(order.status)}</span></h4>
            `;

            itemsList.innerHTML = (order.items || []).map((item, index) => {
                let imgPath = item.productId?.image;
                let finalImgSrc = 'https://via.placeholder.com/60';
                if (imgPath) {
                    finalImgSrc = imgPath.startsWith('http') ? imgPath : `${UPLOADS_URL}/${imgPath}`;
                }

                return `
                    <div class="product-item d-flex justify-content-between align-items-center py-3" 
                         style="animation: fadeInUp 0.5s ease forwards; animation-delay: ${index * 0.1 + 0.4}s; opacity: 0;">
                        <div class="d-flex align-items-center">
                            <img src="${finalImgSrc}" alt="${item.name}" class="product-thumb me-3 shadow-sm" loading="lazy">
                            <div>
                                <span class="fw-bold text-navy me-1">${item.qty}x</span> 
                                <span class="small fw-semibold">${item.name}</span>
                            </div>
                        </div>
                        <div class="fw-bold text-navy">${euro.format(item.price * item.qty)}</div>
                    </div>`;
            }).join('');

            document.getElementById('display-address').innerText = `📍 ${order.customer?.address || 'K.A.'}`;
            document.getElementById('display-total').innerText = euro.format(order.totalAmount || 0);

            updateProgressSteps(order.status || 'Pending');

            setTimeout(() => {
                resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                if (typeof AOS !== 'undefined') { AOS.refresh(); }
            }, 300);

        } else {
            alert("Bestellung nicht gefunden!");
            resultArea.classList.add('d-none');
        }
    } catch (err) {
        console.error("Tracking Error:", err);
        alert("Ein Fehler ist aufgetreten.");
    }
}

function translateStatus(status) {
    const map = { 'Pending': 'Eingegangen', 'Processing': 'Verarbeitung', 'Shipped': 'Versandt', 'Delivered': 'Geliefert', 'Cancelled': 'Storniert' };
    return map[status] || 'Eingegangen';
}

function updateProgressSteps(status) {
    const steps = [
        document.getElementById('step-pending'),
        document.getElementById('step-processing'),
        document.getElementById('step-shipped'),
        document.getElementById('step-delivered')
    ];
    const progressLine = document.getElementById('progress-line');
    const container = document.getElementById('track-container');
    const dynamicArea = document.getElementById('dynamic-info-area');

    if (status === 'Cancelled') {
        container.classList.add('is-cancelled');
        if (progressLine) { progressLine.style.width = "0%"; progressLine.style.height = "0%"; }

        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === 0) {
                step.classList.add('cancelled-step');
                step.querySelector('.step-icon').innerHTML = "✕";
                step.querySelector('.step-text').innerText = "Storniert";
            }
        });

        dynamicArea.innerHTML = `
            <div class="cancel-notice shadow-sm staggered-item" style="animation: fadeInUp 0.8s ease forwards;">
                <div class="me-3 fs-3">⚠️</div>
                <div>
                    <strong class="d-block">Bestellung Storniert</strong>
                    <span class="small">Diese Bestellung wurde storniert. Bei Fragen kontaktieren Sie unseren Support.</span>
                </div>
            </div>`;
        return;
    }

    container.classList.remove('is-cancelled');
    const originalIcons = ["⏳", "⚙️", "🚚", "✅"];
    const originalTexts = ["Eingegangen", "Verarbeitung", "Versandt", "Geliefert"];

    const statusMap = { 'Pending': 0, 'Processing': 1, 'Shipped': 2, 'Delivered': 3 };
    const progressPercentages = { 'Pending': 0, 'Processing': 33, 'Shipped': 66, 'Delivered': 100 };
    const currentIndex = statusMap[status] !== undefined ? statusMap[status] : 0;

    if (progressLine) {
        if (window.innerWidth < 768) {
            progressLine.style.width = "3px";
            progressLine.style.height = `${progressPercentages[status]}%`;
        } else {
            progressLine.style.height = "3px";
            progressLine.style.width = `${progressPercentages[status]}%`;
        }
    }

    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed', 'cancelled-step');
        step.querySelector('.step-icon').innerHTML = originalIcons[index];
        step.querySelector('.step-text').innerText = originalTexts[index];

        if (index < currentIndex) { step.classList.add('completed'); }
        else if (index === currentIndex) { step.classList.add('active'); }
    });
}

window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') {
                    AOS.init({ duration: 1000, once: true, offset: 50, disableMutationObserver: false });
                    AOS.refresh();
                }
                window.dispatchEvent(new Event('scroll'));
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdFromUrl = urlParams.get('id');
    if (orderIdFromUrl) {
        document.getElementById('orderIdInput').value = orderIdFromUrl;
        setTimeout(() => { trackOrder(); }, 1500);
    }
});