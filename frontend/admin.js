/**
 * LUXE BERLIN - MASTER ADMIN JAVASCRIPT (HARDENED SECURITY VERSION)
 */

// --- GLOBAL DEĞİŞKENLER ---
let currentUser = "Admin";

// --- 1. OTURUM KONTROLÜ (GÜVENLİ YÖNTEM) ---
async function checkInitialAuth() {
    try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
            const user = await res.json();
            currentUser = user.username;
        } else {
            window.location.href = 'login.html';
        }
    } catch (err) {
        window.location.href = 'login.html';
    }
}

// --- GLOBAL YAPILANDIRMA ---
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://kocyigit-trade.com/api';

const API = API_URL;
const UPLOADS_URL = '';
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

let salesChart = null;
let allOrdersData = [];
let currentChartMode = 'monthly';

// Geçici veri saklama (Onay bekleyen işlem için)
let pendingUpdate = { id: null, status: null, selectEl: null };

// --- 💡 LUXE TOAST BİLDİRİM SİSTEMİ ---
function showLuxeAlert(message, type = 'success') {
    let container = document.getElementById('luxe-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'luxe-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `luxe-toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">Luxe Berlin Admin</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// 🛡️ GÜVENLİK GÜNCELLEMESİ: Hata yönetimi
const handleAuthError = (res) => {
    if (res && res.status === 401) {
        showLuxeAlert("Sitzung abgelaufen. Bitte erneut anmelden.", "error");
        setTimeout(() => window.logout(), 2000);
        return null;
    }
    return res;
};

function startAuthWatcher() {
    setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/auth/status`, { credentials: 'include' });
            if (res.status === 401) window.logout();
        } catch (e) {
            console.error("Session check failed");
        }
    }, 60000);
}

// --- 🛡️ KALICI LOG SİSTEMİ: VERİTABANINDAN LOGLARI YÜKLE ---
window.loadLogs = async () => {
    try {
        const res = await fetch(`${API_URL}/logs`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const logs = await res.json();
        const list = document.getElementById('admin-activity-logs');
        if (!list) return;

        list.innerHTML = "";
        logs.forEach(log => {
            const row = `
                <tr class="log-row">
                    <td class="log-date">${new Date(log.timestamp).toLocaleString('de-DE')}</td>
                    <td class="log-action">${log.action}</td>
                    <td class="log-user fw-bold">${log.user}</td>
                    <td><span class="badge ${log.status === 'Success' ? 'bg-success' : (log.status === 'Deleted' ? 'bg-danger' : 'bg-primary')}">
                        ${log.status === 'Success' ? 'Erfolg' : (log.status === 'Deleted' ? 'Gelöscht' : log.status)}
                    </span></td>
                </tr>`;
            list.innerHTML += row;
        });
    } catch (err) { console.error("Loglar yüklenemedi:", err); }
};

// 🛡️ DASHBOARD VE İSTATİSTİK YÖNETİMİ
async function loadDashboard() {
    await window.loadLogs();
    if (typeof window.loadOrders === 'function') await window.loadOrders();
    if (typeof window.loadProducts === 'function') await window.loadProducts();
    if (typeof window.loadAdmins === 'function') await window.loadAdmins();
    if (typeof window.loadArchivedProducts === 'function') await window.loadArchivedProducts();
    if (typeof window.loadReviews === 'function') await window.loadReviews();

    try {
        const res = await fetch(`${API_URL}/admin/stats`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const data = await res.json();
        if (data.success) {
            document.getElementById('stat-count').innerText = data.stats.totalOrders;
            document.getElementById('stat-revenue').innerText = euro.format(data.stats.revenue);
            document.getElementById('stat-customers').innerText = data.stats.pendingOrders;
            if (data.salesChart) { renderSalesChart(allOrdersData, currentChartMode, data.salesChart); }
        }
    } catch (e) { console.error("Dashboard Stats loading failed:", e); }
    window.logActivity("Dashboard erfolgreich geladen", currentUser, "Success");
}

// --- 1. ANALİTİK GRAFİĞİ ---
function renderSalesChart(orders, mode = 'monthly', backendChartData = null) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    currentChartMode = mode;
    let labels = [];
    let data = [];

    if (backendChartData && backendChartData.length > 0) {
        labels = backendChartData.map(d => `${d._id.month}/${d._id.year}`);
        data = backendChartData.map(d => d.total);
    } else {
        const validOrders = orders.filter(o => o.status !== 'Cancelled');
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
        } else if (mode === 'weekly') {
            labels = ["4. Woche", "3. Woche", "2. Woche", "Diese Woche"];
            data = [3, 2, 1, 0].map(w => {
                const start = new Date(); start.setDate(now.getDate() - (w * 7 + 7));
                const end = new Date(); end.setDate(now.getDate() - (w * 7));
                return validOrders.filter(o => { const d = new Date(o.date); return d >= start && d < end; }).reduce((s, o) => s + o.totalAmount, 0);
            });
        } else {
            labels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
            data = labels.map((_, i) => validOrders.filter(o => new Date(o.date).getMonth() === i && new Date(o.date).getFullYear() === now.getFullYear()).reduce((s, o) => s + o.totalAmount, 0));
        }
    }

    if (salesChart) salesChart.destroy();
    if (typeof Chart !== 'undefined') {
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Umsatz (€)`, data: data, borderColor: '#c5a059', borderWidth: 3, backgroundColor: 'rgba(197, 160, 89, 0.1)', fill: true, tension: 0.4, pointRadius: 5
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
        const res = await fetch(`${API_URL}/orders`, { credentials: 'include' }).then(handleAuthError);
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
                        <select class="form-select form-select-sm rounded-pill status-select" data-current="${o.status}" onchange="openStatusConfirmModal('${o._id}', this)">
                            <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Ausstehend</option>
                            <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>⚙️ Bearbeitung</option>
                            <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>🚚 Versandt</option>
                            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>✅ Geliefert</option>
                            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>❌ Storniert</option>
                        </select>
                    </td>
                    <td class="text-end pe-4"><button class="btn-delete" onclick="deleteOrder('${o._id}')">✕</button></td>
                </tr>`;
        });
        calculateStats(orders);
    } catch (err) { console.error("Sipariş Yükleme Hatası:", err); }
};

window.openStatusConfirmModal = (id, selectElement) => {
    const oldStatus = selectElement.getAttribute('data-current');
    const newStatus = selectElement.value;
    const labels = { 'Pending': 'Ausstehend', 'Processing': 'Bearbeitung', 'Shipped': 'Versandt', 'Delivered': 'Geliefert', 'Cancelled': 'Storniert' };
    if (oldStatus === newStatus) return;
    pendingUpdate = { id, status: newStatus, selectEl: selectElement };
    const oldEl = document.getElementById('modal-old-status');
    const newEl = document.getElementById('modal-new-status');
    if (oldEl) oldEl.innerText = labels[oldStatus] || oldStatus;
    if (newEl) newEl.innerText = labels[newStatus] || newStatus;
    const confirmModal = new bootstrap.Modal(document.getElementById('statusConfirmModal'));
    confirmModal.show();
};

document.getElementById('statusConfirmModal')?.addEventListener('hidden.bs.modal', function () {
    if (pendingUpdate.id && pendingUpdate.selectEl) {
        pendingUpdate.selectEl.value = pendingUpdate.selectEl.getAttribute('data-current');
        pendingUpdate = { id: null, status: null, selectEl: null };
    }
});

document.getElementById('confirmStatusBtn')?.addEventListener('click', async () => {
    const { id, status, selectEl } = pendingUpdate;
    if (!id) return;
    try {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status })
        }).then(handleAuthError);
        if (res && res.ok) {
            selectEl.setAttribute('data-current', status);
            pendingUpdate = { id: null, status: null, selectEl: null };
            bootstrap.Modal.getInstance(document.getElementById('statusConfirmModal')).hide();
            await loadDashboard();
            showLuxeAlert(`Status erfolgreich aktualisiert`, "success");
            window.logActivity(`Status-Update: ${status}`, currentUser, "Success");
        }
    } catch (err) { console.error("Update Hatası:", err); }
});

window.deleteOrder = async (id) => {
    if (confirm("Möchten Sie diese Bestellung wirklich unwiderruflich löschen?")) {
        try {
            const res = await fetch(`${API_URL}/orders/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            }).then(handleAuthError);
            if (res && res.ok) {
                showLuxeAlert("Bestellung gelöscht", "success");
                window.logActivity(`Bestellung #LB-${id.slice(-6).toUpperCase()} gelöscht`, currentUser, "Deleted");
                await window.loadOrders();
            }
        } catch (err) { console.error(err); }
    }
};

window.viewDetails = async (id) => {
    const o = allOrdersData.find(item => item._id === id);
    if (!o) return;
    const modalArea = document.getElementById('modal-content-area');
    if (modalArea) {
        modalArea.innerHTML = `
            <div class="mb-4 p-3 rounded-3 text-center" style="background: rgba(197, 160, 89, 0.05); border: 1px dashed var(--gold);">
                <span class="small text-uppercase fw-bold text-muted d-block mb-1">Bestell-ID</span>
                <h4 class="fw-bold mb-0 text-navy" style="letter-spacing: 1px;">${o.shortId || '#LB-' + o._id.slice(-6).toUpperCase()}</h4>
            </div>
            <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                    <label class="small fw-bold text-muted d-block mb-1">Zahlungsart</label>
                    <div class="p-2 bg-white rounded border">💰 ${o.paymentMethod || 'Unbekannt'}</div>
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold text-muted d-block mb-1">Kontaktinformationen</label>
                    <div class="p-2 bg-white rounded border small" style="word-break: break-all;">
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
                    ${o.items.map(i => `<div class="d-flex justify-content-between align-items-center border-bottom py-2 small"><span>${i.qty}x ${i.name}</span><strong class="text-navy">${euro.format(i.price * i.qty)}</strong></div>`).join('')}
                </div>
                <div class="d-flex justify-content-between mt-3 fw-bold fs-5 pt-2 border-top">
                    <span>Gesamtbetrag:</span><span class="text-primary">${euro.format(o.totalAmount)}</span>
                </div>
            </div>`;
        new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
    }
};

// --- 3. ÜRÜN YÖNETİMİ ---
window.loadProducts = async () => {
    try {
        const res = await fetch(`${API_URL}/products`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const products = await res.json();
        const list = document.getElementById('admin-product-list');
        if (!list) return;
        list.innerHTML = "";
        products.filter(p => p.isDeleted !== true).forEach(p => {
            let imgSrc = p.image && p.image.startsWith('http') ? p.image : 'https://placehold.co/150';
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
        const res = await fetch(`${API_URL}/products`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const archived = (await res.json()).filter(p => p.isDeleted === true);
        const archivedList = document.getElementById('admin-archived-list');
        if (!archivedList) return;
        archivedList.innerHTML = archived.length ? "" : "<tr><td class='text-muted small text-center p-3'>Keine Archiv vorhanden.</td></tr>";
        archived.forEach(p => {
            let imgSrc = p.image && p.image.startsWith('http') ? p.image : 'https://placehold.co/150';
            archivedList.innerHTML += `<tr><td><img src="${imgSrc}" width="30" class="grayscale rounded shadow-sm"></td><td class="small text-muted ps-3">${p.name}</td><td class="text-end"><button class="btn btn-sm btn-outline-success border-0 py-0" onclick="restoreProduct('${p._id}')">Wiederherstellen ♻️</button></td></tr>`;
        });
    } catch (err) { console.error(err); }
};

window.restoreProduct = async (id) => {
    await fetch(`${API_URL}/products/restore/${id}`, { method: 'PUT', credentials: 'include' }).then(handleAuthError);
    showLuxeAlert("Produkt erfolgreich reaktiviert", "success");
    window.logActivity(`Produkt wiederhergestellt`, currentUser, "Success");
    await loadDashboard();
};

window.deleteProduct = async (id) => {
    if (confirm("Möchten Sie dieses Produkt wirklich archivieren?")) {
        await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', credentials: 'include' }).then(handleAuthError);
        showLuxeAlert("Produkt erfolgreich archiviert", "success");
        window.logActivity(`Produkt archiviert`, currentUser, "Deleted");
        await loadDashboard();
    }
};

// 🛡️ SENIOR FIX: KRİTİK ÜRÜN EKLEME (TAKILMA KORUMALI)
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('productSubmitBtn');
    const originalBtnText = submitBtn.innerHTML;
    const id = document.getElementById('pId').value;
    const fileInput = document.getElementById('pImageFile');

    if (fileInput.files[0] && fileInput.files[0].size > 4 * 1024 * 1024) {
        showLuxeAlert("Datei zu groß! Max. 4MB erlaubt.", "error");
        return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('pName').value);
    formData.append('price', document.getElementById('pPrice').value);
    formData.append('stock', document.getElementById('pStock').value);
    formData.append('description', document.getElementById('pDesc').value);
    if (fileInput && fileInput.files[0]) formData.append('image', fileInput.files[0]);

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Wird hochgeladen...';

        const res = await fetch(id ? `${API_URL}/products/${id}` : `${API_URL}/products`, {
            method: id ? 'PUT' : 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({ message: "Serverfehler" }));
            throw new Error(errData.message || "Unerwarteter Fehler");
        }

        showLuxeAlert(id ? "Aktualisiert!" : "Produkt erfolgreich erstellt!", "success");
        window.logActivity(id ? `Produkt aktualisiert` : `Neues Produkt erstellt`, currentUser, "Success");
        window.resetProductForm();
        await loadDashboard();

    } catch (err) {
        console.error("Yükleme Hatası:", err);
        showLuxeAlert("Fehler: " + err.message, "error");
    } finally {
        // ✅ KRİTİK: Butonu her koşulda resetleyerek takılı kalmayı önler
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

window.editProduct = async (id) => {
    const res = await fetch(`${API_URL}/products`, { credentials: 'include' }).then(handleAuthError);
    if (!res) return;
    const products = await res.json();
    const p = products.find(i => i._id === id);
    if (!p) return;
    document.getElementById('pId').value = p._id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pDesc').value = p.description || "";

    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    if (preview && previewImg && p.image) {
        preview.classList.remove('d-none');
        previewImg.src = p.image.startsWith('http') ? p.image : 'https://placehold.co/150';
    }

    document.getElementById('productFormTitle').innerText = "Produkt bearbeiten";
    document.getElementById('productSubmitBtn').innerText = "Aktualisieren";
    document.getElementById('cancelEditBtn').classList.remove('d-none');
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
};

window.resetProductForm = () => {
    document.getElementById('productForm').reset();
    document.getElementById('pId').value = "";
    const preview = document.getElementById('imagePreview');
    if (preview) preview.classList.add('d-none');
    document.getElementById('productFormTitle').innerText = "Produkt hinzufügen";
    document.getElementById('productSubmitBtn').innerText = "Speichern";
    document.getElementById('cancelEditBtn').classList.add('d-none');
};

function calculateStats(orders) {
    const valid = orders.filter(o => o.status !== 'Cancelled');
    const statCount = document.getElementById('stat-count');
    const statRev = document.getElementById('stat-revenue');
    const statCust = document.getElementById('stat-customers');
    if (statCount) statCount.innerText = valid.length;
    if (statRev) statRev.innerText = euro.format(valid.reduce((s, o) => s + o.totalAmount, 0));
    if (statCust) statCust.innerText = new Set(valid.map(o => o.customer.email)).size;
}

// --- 4. YORUM YÖNETİMİ ---
window.loadReviews = async () => {
    try {
        const res = await fetch(`${API_URL}/reviews`, { credentials: 'include' }).then(handleAuthError);
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
                    <td>${"⭐".repeat(r.rating || r.stars)}</td>
                    <td class="review-text small" style="max-width: 250px;">${r.text}</td>
                    <td>${r.adminReply ? `<span class="admin-reply-badge">✓</span>` : `<span class="badge bg-light text-muted border">Keine Antwort</span>`}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-gold me-2" onclick="openReplyModal('${r._id}', '${r.adminReply || ''}')">💬</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${r._id}')">🗑️</button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
};

window.openReplyModal = (id, existingReply) => {
    document.getElementById('replyReviewId').value = id;
    document.getElementById('adminReplyText').value = existingReply !== 'undefined' ? existingReply : "";
    new bootstrap.Modal(document.getElementById('replyModal')).show();
};

window.submitReply = async () => {
    const id = document.getElementById('replyReviewId').value;
    const replyText = document.getElementById('adminReplyText').value;
    const res = await fetch(`${API_URL}/reviews/reply/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ replyText })
    }).then(handleAuthError);
    if (res && res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
        window.loadReviews();
        showLuxeAlert("Antwort erfolgreich gespeichert", "success");
        window.logActivity(`Rezension beantwortet`, currentUser, "Success");
    }
};

window.deleteReview = async (id) => {
    if (confirm("Möchten Sie diese Rezension wirklich löschen?")) {
        await fetch(`${API_URL}/reviews/${id}`, { method: 'DELETE', credentials: 'include' }).then(handleAuthError);
        showLuxeAlert("Rezension erfolgreich gelöscht", "success");
        window.logActivity(`Rezension gelöscht`, currentUser, "Deleted");
        window.loadReviews();
    }
}

// --- 5. ADMIN & LOG YÖNETİMİ ---
window.loadAdmins = async () => {
    const res = await fetch(`${API_URL}/auth/users`, { credentials: 'include' }).then(handleAuthError);
    if (!res) return;
    const users = await res.json();
    const list = document.getElementById('admin-list-body');
    if (!list) return;
    list.innerHTML = "";
    users.forEach(u => {
        list.innerHTML += `<tr><td class="fw-bold text-navy">${u.username}</td><td class="text-end"><button class="btn btn-sm btn-outline-danger border-0" onclick="deleteAdmin('${u._id}')">Entfernen</button></td></tr>`;
    });
};

window.deleteAdmin = async (id) => {
    if (confirm("Möchten Sie diesen Administrator wirklich entfernen?")) {
        try {
            const res = await fetch(`${API_URL}/auth/users/${id}`, { method: 'DELETE', credentials: 'include' }).then(handleAuthError);
            if (res && res.ok) {
                showLuxeAlert("Administrator wurde entfernt", "success");
                window.logActivity(`Admin gelöscht`, currentUser, "Deleted");
                await window.loadAdmins();
            }
        } catch (err) { console.error("Admin Silme Hatası:", err); showLuxeAlert("Fehler beim Entfernen", "error"); }
    }
};

document.getElementById('addAdminForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('newAdminUser')?.value;
    const password = document.getElementById('newAdminPass')?.value;
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ username, password })
    }).then(handleAuthError);
    if (res && res.ok) {
        showLuxeAlert("Neuer Administrator erfolgreich registriert!", "success");
        window.logActivity(`Neuer Admin erstellt: ${username}`, currentUser, "Success");
        document.getElementById('addAdminForm').reset();
        window.loadAdmins();
    }
});

window.logActivity = async (action, user, status) => {
    try {
        await fetch(`${API_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ action, user, status })
        });
        await window.loadLogs();
    } catch (err) { console.error("Log kaydedilemedi:", err); }
};

// --- ARAMA FİLTRELERİ (FIXED & EKSİKSİZ) ---
document.getElementById('logSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.log-row');
    rows.forEach(row => {
        const rowContent = row.innerText.toLowerCase();
        row.style.display = rowContent.includes(term) ? "" : "none";
    });
});

document.getElementById('orderSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.order-row').forEach(row => {
        const name = row.querySelector('.customer-name').innerText.toLowerCase();
        row.style.display = name.includes(term) ? "" : "none";
    });
});

document.getElementById('productSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.product-row').forEach(row => {
        const name = row.querySelector('.product-name').innerText.toLowerCase();
        row.style.display = name.includes(term) ? "" : "none";
    });
});

document.getElementById('reviewSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.review-row').forEach(row => {
        const text = row.querySelector('.review-text').innerText.toLowerCase();
        row.style.display = text.includes(term) ? "" : "none";
    });
});

// 🛡️ GÜVENLİK GÜNCELLEMESİ: Logout
window.logout = async () => {
    try { await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); }
    finally { window.location.href = 'login.html'; }
};

document.addEventListener('DOMContentLoaded', async () => {
    await checkInitialAuth();
    loadDashboard();
    startAuthWatcher();
});

window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') { AOS.init({ duration: 1000, once: true }); }
                const content = document.getElementById('adminMainContent');
                if (content) content.classList.remove('d-none');
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});