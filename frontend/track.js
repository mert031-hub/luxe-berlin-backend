/**
 * LUXE BERLIN - ADVANCED TRACKING LOGIC (OPTIMIZED)
 */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

const UPLOADS_URL = '';
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

async function trackOrder() {
    const rawId = document.getElementById('orderIdInput').value.trim();
    const resultArea = document.getElementById('track-result');
    const itemsList = document.getElementById('order-items-list');
    const header = document.getElementById('status-header');

    const id = rawId.replace('#', '').replace('LB-', '').toUpperCase();
    if (!id) return alert("Bitte geben Sie eine gültige Bestellnummer ein!");

    try {
        const res = await fetch(`${API_URL}/orders/${id}`);
        const order = await res.json();

        if (res.ok && order) {
            resultArea.classList.add('d-none');
            setTimeout(() => { resultArea.classList.remove('d-none'); }, 50);

            header.innerHTML = `
                <h6 class="text-muted mb-1">Bestellnummer: #LB-${id.slice(-6).toUpperCase()}</h6>
                <h4 class="fw-bold">Status: <span style="color:#c5a059;">${translateStatus(order.status || 'Pending')}</span></h4>
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
                            <img src="${finalImgSrc}" alt="${item.name}" class="product-thumb me-3 shadow-sm">
                            <div>
                                <span class="fw-bold text-navy me-1">${item.qty}x</span> 
                                <span class="small fw-semibold">${item.name}</span>
                            </div>
                        </div>
                        <div class="fw-bold text-navy">${euro.format((item.price || 0) * (item.qty || 0))}</div>
                    </div>
                `;
            }).join('');

            document.getElementById('display-address').innerText = `📍 ${order.customer?.address || 'K.A.'}`;
            document.getElementById('display-total').innerText = euro.format(order.totalAmount || 0);

            updateProgressSteps(order.status || 'Pending');
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } else {
            alert("Bestellung nicht gefunden!");
            resultArea.classList.add('d-none');
        }
    } catch (err) {
        console.error("Tracking Error:", err);
        alert("Ein technischer Fehler ist aufgetreten.");
    }
}

function translateStatus(status) {
    const map = {
        'Pending': 'Eingegangen',
        'Processing': 'In Verarbeitung',
        'Shipped': 'Versandt',
        'Delivered': 'Geliefert',
        'Cancelled': 'Storniert'
    };
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

    const statusMap = { 'Pending': 0, 'Processing': 1, 'Shipped': 2, 'Delivered': 3 };
    // Mobilde çizgiyi tam doldurmak için 0, 33, 66, 100 oranları
    const progressPercentages = { 'Pending': 0, 'Processing': 33, 'Shipped': 66, 'Delivered': 100 };

    const currentIndex = statusMap[status] !== undefined ? statusMap[status] : 0;

    if (progressLine) {
        if (window.innerWidth < 768) {
            // Mobil: Dikey yükseklik
            progressLine.style.width = "3px";
            progressLine.style.height = `${progressPercentages[status] || 0}%`;
        } else {
            // Desktop: Yatay genişlik
            progressLine.style.height = "3px";
            progressLine.style.width = `${progressPercentages[status] || 0}%`;
        }
    }

    steps.forEach((step, index) => {
        if (!step) return;
        step.classList.remove('active', 'completed');
        if (index < currentIndex) {
            step.classList.add('completed');
        } else if (index === currentIndex) {
            step.classList.add('active');
        }
    });
}