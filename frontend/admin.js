// 1. OTURUM KONTROLÜ (Sayfa Yüklenme Anı)
if (!localStorage.getItem('adminToken')) {
    window.location.href = 'login.html';
}

// --- GLOBAL YAPILANDIRMA (DİNAMİK URL GÜNCELLEMESİ) ---
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

const API = API_URL;
const UPLOADS_URL = '';
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
let salesChart = null;
let allOrdersData = [];
let currentChartMode = 'monthly';

const getAuthToken = () => localStorage.getItem('adminToken');

const handleAuthError = (res) => {
    if (res.status === 401) {
        alert("Sitzung abgelaufen. Bitte melden Sie sich erneut an.");
        window.logout();
        return null;
    }
    return res;
};

function startAuthWatcher() {
    setInterval(() => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
            const now = Date.now();

            if (now > expiry) {
                console.warn("Token süresi doldu, otomatik çıkış yapılıyor...");
                alert("Ihre Sitzung ist abgelaufen.");
                window.logout();
            }
        } catch (e) {
            console.error("Token kontrol hatası:", e);
        }
    }, 5000);
}

async function loadDashboard() {
    if (typeof window.loadOrders === 'function') await window.loadOrders();
    if (typeof window.loadProducts === 'function') await window.loadProducts();
    if (typeof window.loadAdmins === 'function') await window.loadAdmins();
    if (typeof window.loadArchivedProducts === 'function') await window.loadArchivedProducts();
    if (typeof window.loadReviews === 'function') await window.loadReviews();
    window.logActivity("Dashboard vollständig geladen", "Master Admin", "Success");
}

// --- 1. ANALİTİK GRAFİĞİ ---
function renderSalesChart(orders, mode = 'monthly') {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    currentChartMode = mode;

    const validOrders = orders.filter(o => o.status !== 'Cancelled');
    let labels = [];
    let data = [];
    const now = new Date();

    if (mode === 'daily') {
        labels = [...Array(7)].map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            return d.toLocaleDateString('de-DE', { weekday: 'short' });
        });
        data = labels.map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            const ds = d.toLocaleDateString('de-DE');
            return validOrders.filter(o => new Date(o.date).toLocaleDateString('de-DE') === ds).reduce((s, o) => s + o.totalAmount, 0);
        });
    }
    else if (mode === 'weekly') {
        labels = ["4. Woche", "3. Woche", "2. Woche", "Diese Woche"];
        data = [3, 2, 1, 0].map(w => {
            const start = new Date(); start.setDate(now.getDate() - (w * 7 + 7));
            const end = new Date(); end.setDate(now.getDate() - (w * 7));
            return validOrders.filter(o => { const d = new Date(o.date); return d >= start && d < end; }).reduce((s, o) => s + o.totalAmount, 0);
        });
    }
    else {
        labels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        data = labels.map((_, i) => validOrders.filter(o => new Date(o.date).getMonth() === i && new Date(o.date).getFullYear() === now.getFullYear()).reduce((s, o) => s + o.totalAmount, 0));
    }

    if (salesChart) salesChart.destroy();
    if (typeof Chart !== 'undefined') {
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Umsatz (€)`, data: data,
                    borderColor: '#c5a059', borderWidth: 3, backgroundColor: 'rgba(197, 160, 89, 0.1)', fill: true, tension: 0.4, pointRadius: 5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
}

window.changeChartMode = (mode) => {
    const target = event ? event.target : null;
    document.querySelectorAll('.btn-chart-toggle').forEach(btn => btn.classList.remove('active'));
    if (target) target.classList.add('active');
    renderSalesChart(allOrdersData, mode);
};

// --- 2. SİPARİŞ YÖNETİMİ ---
window.loadOrders = async () => {
    try {
        const res = await fetch(`${API_URL}/orders`, {
            headers: { 'x-auth-token': getAuthToken() }
        }).then(handleAuthError);

        if (!res) return;
        const orders = await res.json();
        allOrdersData = orders;

        const list = document.getElementById('admin-order-list');
        if (!list) return;
        list.innerHTML = "";

        orders.forEach(o => {
            const rawMethod = o.paymentMethod ? o.paymentMethod.toUpperCase() : "K.A.";
            const payIcon = rawMethod.includes('KARTE') ? '💳' : (rawMethod.includes('PAYPAL') ? '🅿️' : '❓');

            list.innerHTML += `
                <tr class="order-row">
                    <td class="small text-muted">${new Date(o.date).toLocaleDateString('de-DE')}</td>
                    <td><strong class="customer-name">${o.customer.firstName} ${o.customer.lastName}</strong></td>
                    <td><button class="btn btn-sm btn-link p-0 fw-bold shadow-none" onclick="viewDetails('${o._id}')">Details</button></td>
                    <td><span class="badge bg-light text-dark border">${payIcon} ${rawMethod}</span></td>
                    <td class="fw-bold">${euro.format(o.totalAmount)}</td>
                    <td>
                        <select class="form-select form-select-sm rounded-pill" onchange="updateStatus('${o._id}', this.value)">
                            <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Ausstehend</option>
                            <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>⚙️ Bearbeitung</option>
                            <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>🚚 Versandt</option>
                            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>✅ Geliefert</option>
                            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>❌ Storniert</option>
                        </select>
                    </td>
                    <td class="text-end pe-4"><button class="btn btn-sm btn-outline-danger border-0" onclick="deleteOrder('${o._id}')">✕</button></td>
                </tr>`;
        });

        calculateStats(orders);
        renderSalesChart(orders, currentChartMode);
    } catch (err) { console.error("Sipariş Yükleme Hatası:", err); }
};

window.deleteOrder = async (id) => {
    if (confirm("Möchten Sie diese Bestellung gerçekten löschen?")) {
        try {
            const res = await fetch(`${API_URL}/orders/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': getAuthToken() }
            }).then(handleAuthError);
            if (res && res.ok) {
                window.logActivity(`Bestellung #LB-${id.slice(-6).toUpperCase()} gelöscht`, "Admin", "Deleted");
                await window.loadOrders();
            }
        } catch (err) { console.error(err); }
    }
};

window.viewDetails = async (id) => {
    const res = await fetch(`${API_URL}/orders`, {
        headers: { 'x-auth-token': getAuthToken() }
    }).then(handleAuthError);
    if (!res) return;
    const orders = await res.json();
    const o = orders.find(item => item._id === id);
    if (!o) return;

    const modalArea = document.getElementById('modal-content-area');
    if (modalArea) {
        modalArea.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="small fw-bold text-muted d-block mb-1">Zahlungsart</label>
                    <div class="p-2 bg-white rounded border">💰 ${o.paymentMethod || 'K.A.'}</div>
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold text-muted d-block mb-1">Kontaktinfo</label>
                    <div class="p-2 bg-white rounded border small">
                        📧 ${o.customer.email}<br>
                        📞 ${o.customer.phone || 'Nicht angegeben'}
                    </div>
                </div>
            </div>
            <div class="mb-4">
                <label class="small fw-bold text-muted d-block mb-1">Lieferadresse</label>
                <div class="p-3 bg-light rounded-3 border">📍 ${o.customer.address}</div>
            </div>
            <div>
                <label class="small fw-bold text-muted d-block mb-1">Bestellte Produkte</label>
                <div class="table-responsive">
                    ${o.items.map(i => `
                        <div class="d-flex justify-content-between align-items-center border-bottom py-2 small">
                            <span>${i.qty}x ${i.name}</span>
                            <strong class="text-navy">${euro.format(i.price * i.qty)}</strong>
                        </div>`).join('')}
                </div>
                <div class="d-flex justify-content-between mt-3 fw-bold fs-5 pt-2 border-top">
                    <span>Gesamt:</span>
                    <span class="text-primary">${euro.format(o.totalAmount)}</span>
                </div>
            </div>`;
        new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
    }
};

window.updateStatus = async (id, status) => {
    await fetch(`${API_URL}/orders/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-auth-token': getAuthToken()
        },
        body: JSON.stringify({ status })
    }).then(handleAuthError);
    window.loadOrders();
    // DETAYLI LOG
    window.logActivity(`Bestellung #LB-${id.slice(-6).toUpperCase()} Status -> ${status}`, "Admin", "Success");
};

// --- 3. ÜRÜN YÖNETİMİ ---
window.loadProducts = async () => {
    try {
        const res = await fetch(`${API_URL}/products`).then(handleAuthError);
        if (!res) return;
        const products = await res.json();
        const list = document.getElementById('admin-product-list');
        if (!list) return;
        list.innerHTML = "";
        products.filter(p => p.isDeleted !== true).forEach(p => {
            let imgSrc = p.image ? (p.image.startsWith('http') ? p.image : `/${p.image}`) : 'https://placehold.co/150';

            list.innerHTML += `
                <tr class="product-row">
                    <td><div class="product-img-box-small"><img src="${imgSrc}"></div></td>
                    <td><strong class="product-name">${p.name}</strong></td>
                    <td>${euro.format(p.price)}</td>
                    <td>${p.stock}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary border-0 me-2" onclick="editProduct('${p._id}')">✎</button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteProduct('${p._id}')">🗑️</button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
};

window.loadArchivedProducts = async () => {
    try {
        const res = await fetch(`${API_URL}/products`).then(handleAuthError);
        if (!res) return;
        const archived = (await res.json()).filter(p => p.isDeleted === true);
        const archivedList = document.getElementById('admin-archived-list');
        if (!archivedList) return;
        archivedList.innerHTML = archived.length ? "" : "<tr><td class='text-muted small text-center p-3'>Keine Archiv.</td></tr>";
        archived.forEach(p => { archivedList.innerHTML += `<tr><td><img src="${p.image ? (p.image.startsWith('http') ? p.image : `/${p.image}`) : 'https://placehold.co/150'}" width="30" class="grayscale rounded shadow-sm"></td><td class="small text-muted ps-3">${p.name}</td><td class="text-end"><button class="btn btn-sm btn-outline-success border-0 py-0" onclick="restoreProduct('${p._id}')">Geri Getir ♻️</button></td></tr>`; });
    } catch (err) { console.error(err); }
};

window.restoreProduct = async (id) => {
    await fetch(`${API_URL}/products/restore/${id}`, {
        method: 'PUT',
        headers: { 'x-auth-token': getAuthToken() }
    }).then(handleAuthError);
    window.logActivity(`Produkt (ID: ${id.slice(-4)}) wiederhergestellt`, "Admin", "Success");
    await loadDashboard();
};

window.deleteProduct = async (id) => {
    if (confirm("Produkt archivieren?")) {
        await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': getAuthToken() }
        }).then(handleAuthError);
        window.logActivity(`Produkt (ID: ${id.slice(-4)}) archiviert`, "Admin", "Deleted");
        await loadDashboard();
    }
};

document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pIdEl = document.getElementById('pId');
    if (!pIdEl) return console.error("pId bulunamadı");

    const id = pIdEl.value;
    const formData = new FormData();

    const getValue = (id) => document.getElementById(id)?.value || "";

    formData.append('name', getValue('pName'));
    formData.append('price', getValue('pPrice'));
    formData.append('stock', getValue('pStock'));
    formData.append('tag', getValue('pTag'));
    formData.append('description', getValue('pDesc'));

    const fileInput = document.getElementById('pImageFile');
    if (fileInput && fileInput.files[0]) formData.append('image', fileInput.files[0]);

    const res = await fetch(id ? `${API_URL}/products/${id}` : `${API_URL}/products`, {
        method: id ? 'PUT' : 'POST',
        body: formData,
        headers: { 'x-auth-token': getAuthToken() }
    }).then(handleAuthError);

    if (res && res.ok) {
        alert("Erfolgreich!");
        window.logActivity(id ? `Produkt aktualisiert: ${getValue('pName')}` : `Neues Produkt erstellt: ${getValue('pName')}`, "Admin", "Success");
        window.resetProductForm();
        loadDashboard();
    }
});

window.editProduct = async (id) => {
    const res = await fetch(`${API_URL}/products`).then(handleAuthError);
    if (!res) return;
    const p = (await res.json()).find(i => i._id === id);
    if (!p) return;

    const setVal = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.value = val;
    };

    setVal('pId', p._id);
    setVal('pName', p.name);
    setVal('pPrice', p.price);
    setVal('pStock', p.stock);
    setVal('pTag', p.tag || "");
    setVal('pDesc', p.description || "");

    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    if (preview && previewImg && p.image) {
        preview.classList.remove('d-none');
        previewImg.src = p.image.startsWith('http') ? p.image : `/${p.image}`;
    }

    const title = document.getElementById('productFormTitle');
    const submitBtn = document.getElementById('productSubmitBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (title) title.innerText = "Produkt bearbeiten";
    if (submitBtn) submitBtn.innerText = "Aktualisieren";
    if (cancelBtn) cancelBtn.classList.remove('d-none');

    const form = document.getElementById('productForm');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.resetProductForm = () => {
    const form = document.getElementById('productForm');
    if (!form) return;
    form.reset();

    const pId = document.getElementById('pId');
    if (pId) pId.value = "";

    const pTag = document.getElementById('pTag');
    if (pTag) pTag.value = "";

    const preview = document.getElementById('imagePreview');
    if (preview) preview.classList.add('d-none');

    const title = document.getElementById('productFormTitle');
    if (title) title.innerText = "Produkt hinzufügen";

    const submitBtn = document.getElementById('productSubmitBtn');
    if (submitBtn) submitBtn.innerText = "Speichern";

    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.classList.add('d-none');
};

function calculateStats(orders) {
    const valid = orders.filter(o => o.status !== 'Cancelled');
    const countEl = document.getElementById('stat-count');
    const revEl = document.getElementById('stat-revenue');
    const custEl = document.getElementById('stat-customers');
    if (countEl) countEl.innerText = valid.length;
    if (revEl) revEl.innerText = euro.format(valid.reduce((s, o) => s + o.totalAmount, 0));
    if (custEl) custEl.innerText = new Set(valid.map(o => o.customer.email)).size;
}

// --- 4. YORUM YÖNETİMİ ---
window.loadReviews = async () => {
    try {
        const res = await fetch(`${API_URL}/reviews`, {
            headers: { 'x-auth-token': getAuthToken() }
        }).then(handleAuthError);

        if (!res) return;
        const reviews = await res.json();
        const list = document.getElementById('admin-review-list');
        if (!list) return;
        list.innerHTML = "";

        reviews.forEach(r => {
            list.innerHTML += `
                <tr class="review-row">
                    <td class="small text-muted">${new Date(r.createdAt).toLocaleDateString('de-DE')}</td>
                    <td class="reviewer-name fw-bold">${r.name}</td>
                    <td>${"⭐".repeat(r.stars)}</td>
                    <td class="review-text small" style="max-width: 200px;">${r.text}</td>
                    <td>
                        ${r.adminReply
                    ? `<span class="admin-reply-badge">Beantwortet ✓</span><br><small class="text-muted">${r.adminReply.substring(0, 20)}...</small>`
                    : `<span class="badge bg-light text-muted border">Keine Antwort</span>`}
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-gold me-2" onclick="openReplyModal('${r._id}', '${r.adminReply || ''}')">💬</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${r._id}')">🗑️</button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error("Yorum Yükleme Hatası:", err); }
};

window.openReplyModal = (id, existingReply) => {
    document.getElementById('replyReviewId').value = id;
    document.getElementById('adminReplyText').value = existingReply;
    new bootstrap.Modal(document.getElementById('replyModal')).show();
};

window.submitReply = async () => {
    const id = document.getElementById('replyReviewId').value;
    const replyText = document.getElementById('adminReplyText').value;

    const res = await fetch(`${API_URL}/reviews/reply/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-auth-token': getAuthToken()
        },
        body: JSON.stringify({ replyText })
    }).then(handleAuthError);

    if (res && res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
        window.loadReviews();
        window.logActivity(`Antwort auf Rezension (ID: ${id.slice(-4)}) gesendet`, "Admin", "Success");
    }
};

window.deleteReview = async (id) => {
    if (confirm("Rezension unwiderruflich löschen?")) {
        const res = await fetch(`${API_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': getAuthToken() }
        }).then(handleAuthError);

        if (res && res.ok) {
            window.loadReviews();
            window.logActivity(`Rezension (ID: ${id.slice(-4)}) gelöscht`, "Admin", "Deleted");
        }
    }
};

// --- 5. ADMIN & LOG YÖNETİMİ ---
window.loadAdmins = async () => {
    const res = await fetch(`${API_URL}/auth/users`, {
        headers: { 'x-auth-token': getAuthToken() }
    }).then(handleAuthError);
    if (!res) return;
    const users = await res.json();
    const list = document.getElementById('admin-list-body');
    if (!list) return;
    list.innerHTML = "";
    users.forEach(u => { list.innerHTML += `<tr><td class="fw-bold text-navy">${u.username}</td><td class="text-end"><button class="btn btn-sm btn-outline-danger border-0" onclick="deleteAdmin('${u._id}')">Entfernen</button></td></tr>`; });
};

document.getElementById('addAdminForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('newAdminUser')?.value;
    const password = document.getElementById('newAdminPass')?.value;

    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-auth-token': getAuthToken()
        },
        body: JSON.stringify({ username, password })
    }).then(handleAuthError);
    if (res && res.ok) {
        alert("Admin registriert!");
        window.logActivity(`Neuer Admin registriert: ${username}`, "Master Admin", "Success");
        window.loadAdmins();
    }
});

window.deleteAdmin = async (id) => {
    if (confirm("Entfernen?")) {
        try {
            await fetch(`${API_URL}/auth/users/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': getAuthToken() }
            }).then(handleAuthError);
            window.logActivity(`Admin-Konto entfernt (ID: ${id.slice(-4)})`, "Admin", "Deleted");
            window.loadAdmins();
        } catch (err) { console.error(err); }
    }
};

window.logActivity = (action, user, status) => {
    const list = document.getElementById('admin-activity-logs');
    if (!list) return;
    const row = `<tr><td>${new Date().toLocaleTimeString()}</td><td>${action}</td><td>${user}</td><td><span class="badge ${status === 'Success' ? 'bg-success' : (status === 'Deleted' ? 'bg-danger' : 'bg-primary')}">${status}</span></td></tr>`;
    list.insertAdjacentHTML('afterbegin', row);
};

// --- ARAMA FİLTRELERİ ---
document.getElementById('orderSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.order-row').forEach(row => {
        const customerName = row.querySelector('.customer-name')?.innerText.toLowerCase() || "";
        row.style.display = customerName.includes(term) ? "" : "none";
    });
});

document.getElementById('productSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.product-row').forEach(row => {
        const productName = row.querySelector('.product-name')?.innerText.toLowerCase() || "";
        row.style.display = productName.includes(term) ? "" : "none";
    });
});

// YENİ: Yorum Arama Filtresi (Eksiksiz Eklendi)
document.getElementById('reviewSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.review-row').forEach(row => {
        const reviewerName = row.querySelector('.reviewer-name')?.innerText.toLowerCase() || "";
        const reviewText = row.querySelector('.review-text')?.innerText.toLowerCase() || "";
        row.style.display = (reviewerName.includes(term) || reviewText.includes(term)) ? "" : "none";
    });
});

window.logout = () => { localStorage.removeItem('adminToken'); window.location.href = 'login.html'; };

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    startAuthWatcher();
});
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