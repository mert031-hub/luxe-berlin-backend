/**
 * LUXE BERLIN - MASTER ADMIN JAVASCRIPT (HARDENED SECURITY VERSION)
 * Tüm fonksiyonlar korunmuş, oturum yönetimi HttpOnly Cookie sistemine taşınmıştır.
 * LOG SİSTEMİ: Veritabanı tabanlı ve kalıcı hale getirilmiştir.
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
    : '/api';

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

// 🛡️ GÜVENLİK GÜNCELLEMESİ: Hata yönetimi artık 401 alınca direkt logout yapar.
const handleAuthError = (res) => {
    if (res && res.status === 401) {
        showLuxeAlert("Sitzung abgelaufen. Bitte anmelden.", "error");
        setTimeout(() => window.logout(), 2000);
        return null;
    }
    return res;
};

// 🛡️ GÜVENLİK GÜNCELLEMESİ: Token parse etmek yerine backend'e durum sorar.
function startAuthWatcher() {
    setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/auth/status`, { credentials: 'include' });
            if (res.status === 401) window.logout();
        } catch (e) {
            console.error("Session check failed");
        }
    }, 60000); // Dakikada bir kontrol
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
                <tr>
                    <td>${new Date(log.timestamp).toLocaleString('de-DE')}</td>
                    <td>${log.action}</td>
                    <td>${log.user}</td>
                    <td><span class="badge ${log.status === 'Success' ? 'bg-success' : (log.status === 'Deleted' ? 'bg-danger' : 'bg-primary')}">${log.status}</span></td>
                </tr>`;
            list.innerHTML += row;
        });
    } catch (err) { console.error("Loglar yüklenemedi:", err); }
};

async function loadDashboard() {
    await window.loadLogs(); // 🛡️ İlk olarak kalıcı logları çekiyoruz
    if (typeof window.loadOrders === 'function') await window.loadOrders();
    if (typeof window.loadProducts === 'function') await window.loadProducts();
    if (typeof window.loadAdmins === 'function') await window.loadAdmins();
    if (typeof window.loadArchivedProducts === 'function') await window.loadArchivedProducts();
    if (typeof window.loadReviews === 'function') await window.loadReviews();

    // Dashboard yükleme logunu veritabanına kaydet
    window.logActivity("Dashboard vollständig geladen", currentUser, "Success");
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
            credentials: 'include'
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
                        <select class="form-select form-select-sm rounded-pill status-select" 
                                data-current="${o.status}" 
                                onchange="openStatusConfirmModal('${o._id}', this)">
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
        renderSalesChart(orders, currentChartMode);
    } catch (err) { console.error("Sipariş Yükleme Hatası:", err); }
};

window.openStatusConfirmModal = (id, selectElement) => {
    const oldStatus = selectElement.getAttribute('data-current');
    const newStatus = selectElement.value;
    const labels = { 'Pending': 'Ausstehend', 'Processing': 'Bearbeitung', 'Shipped': 'Versandt', 'Delivered': 'Geliefert', 'Cancelled': 'Storniert' };

    if (oldStatus === newStatus) return;

    document.getElementById('modal-old-status').innerText = labels[oldStatus] || oldStatus;
    document.getElementById('modal-new-status').innerText = labels[newStatus] || newStatus;

    pendingUpdate = { id, status: newStatus, selectEl: selectElement };

    const confirmModal = new bootstrap.Modal(document.getElementById('statusConfirmModal'));
    confirmModal.show();
};

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
            await window.loadOrders();
            showLuxeAlert(`Status auf ${status} aktualisiert`, "success");
            // 🛡️ KALICI LOG
            window.logActivity(`Status-Update: ${status}`, currentUser, "Success");
        }
    } catch (err) {
        console.error("Update Hatası:", err);
    }
});

window.deleteOrder = async (id) => {
    if (confirm("Möchten Sie diese Bestellung gerçekten löschen?")) {
        try {
            const res = await fetch(`${API_URL}/orders/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            }).then(handleAuthError);
            if (res && res.ok) {
                showLuxeAlert("Bestellung gelöscht", "success");
                // 🛡️ KALICI LOG
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
                    <div class="p-2 bg-white rounded border">💰 ${o.paymentMethod || 'K.A.'}</div>
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold text-muted d-block mb-1">Kontaktinfo</label>
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
        const res = await fetch(`${API_URL}/products`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const archived = (await res.json()).filter(p => p.isDeleted === true);
        const archivedList = document.getElementById('admin-archived-list');
        if (!archivedList) return;
        archivedList.innerHTML = archived.length ? "" : "<tr><td class='text-muted small text-center p-3'>Keine Archiv.</td></tr>";
        archived.forEach(p => {
            archivedList.innerHTML += `
            <tr>
                <td><img src="${p.image ? (p.image.startsWith('http') ? p.image : `/${p.image}`) : 'https://placehold.co/150'}" width="30" class="grayscale rounded shadow-sm"></td>
                <td class="small text-muted ps-3">${p.name}</td>
                <td class="text-end"><button class="btn btn-sm btn-outline-success border-0 py-0" onclick="restoreProduct('${p._id}')">Geri Getir ♻️</button></td>
            </tr>`;
        });
    } catch (err) { console.error(err); }
};

window.restoreProduct = async (id) => {
    await fetch(`${API_URL}/products/restore/${id}`, {
        method: 'PUT',
        credentials: 'include'
    }).then(handleAuthError);
    showLuxeAlert("Produkt reaktiviert", "success");
    // 🛡️ KALICI LOG
    window.logActivity(`Produkt wiederhergestellt`, currentUser, "Success");
    await loadDashboard();
};

window.deleteProduct = async (id) => {
    if (confirm("Produkt archivieren?")) {
        await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        }).then(handleAuthError);
        showLuxeAlert("Produkt archiviert", "success");
        // 🛡️ KALICI LOG
        window.logActivity(`Produkt archiviert`, currentUser, "Deleted");
        await loadDashboard();
    }
};

document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('productSubmitBtn');
    const originalBtnText = submitBtn.innerHTML;
    const id = document.getElementById('pId').value;

    const formData = new FormData();
    formData.append('name', document.getElementById('pName').value);
    formData.append('price', document.getElementById('pPrice').value);
    formData.append('stock', document.getElementById('pStock').value);
    formData.append('description', document.getElementById('pDesc').value);

    const fileInput = document.getElementById('pImageFile');
    if (fileInput && fileInput.files[0]) formData.append('image', fileInput.files[0]);

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Hochladen...';

        const res = await fetch(id ? `${API_URL}/products/${id}` : `${API_URL}/products`, {
            method: id ? 'PUT' : 'POST',
            body: formData,
            credentials: 'include'
        }).then(handleAuthError);

        if (res && res.ok) {
            showLuxeAlert(id ? "Produkt erfolgreich aktualisiert!" : "Neues Produkt hinzugefügt!", "success");
            // 🛡️ KALICI LOG
            window.logActivity(id ? `Produkt aktualisiert` : `Neues Produkt erstellt`, currentUser, "Success");
            window.resetProductForm();
            await loadDashboard();
        }
    } catch (err) {
        console.error("Yükleme Hatası:", err);
        showLuxeAlert("Fehler beim Hochladen.", "error");
    } finally {
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
        previewImg.src = p.image.startsWith('http') ? p.image : `/${p.image}`;
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
        const res = await fetch(`${API_URL}/reviews`, {
            credentials: 'include'
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
                    <td class="review-text small" style="max-width: 250px;">${r.text}</td>
                    <td>
                        ${r.adminReply
                    ? `<span class="admin-reply-badge">Beantwortet ✓</span>`
                    : `<span class="badge bg-light text-muted border">Keine Antwort</span>`}
                    </td>
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
    document.getElementById('adminReplyText').value = existingReply;
    new bootstrap.Modal(document.getElementById('replyModal')).show();
};

window.submitReply = async () => {
    const id = document.getElementById('replyReviewId').value;
    const replyText = document.getElementById('adminReplyText').value;

    const res = await fetch(`${API_URL}/reviews/reply/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ replyText })
    }).then(handleAuthError);

    if (res && res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
        window.loadReviews();
        showLuxeAlert("Rezension beantwortet", "success");
        // 🛡️ KALICI LOG
        window.logActivity(`Rezension beantwortet`, currentUser, "Success");
    }
};

window.deleteReview = async (id) => {
    if (confirm("Rezension löschen?")) {
        await fetch(`${API_URL}/reviews/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        }).then(handleAuthError);
        showLuxeAlert("Rezension gelöscht", "success");
        // 🛡️ KALICI LOG
        window.logActivity(`Rezension gelöscht`, currentUser, "Deleted");
        window.loadReviews();
    }
};

// --- 5. ADMIN & LOG YÖNETİMİ ---
window.loadAdmins = async () => {
    const res = await fetch(`${API_URL}/auth/users`, {
        credentials: 'include'
    }).then(handleAuthError);
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
    if (confirm("Möchten Sie diesen Admin gerçekten entfernen?")) {
        try {
            const res = await fetch(`${API_URL}/auth/users/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            }).then(handleAuthError);

            if (res && res.ok) {
                showLuxeAlert("Admin wurde entfernt", "success");
                // 🛡️ KALICI LOG
                window.logActivity(`Admin gelöscht`, currentUser, "Deleted");
                await window.loadAdmins();
            }
        } catch (err) {
            console.error("Admin Silme Hatası:", err);
            showLuxeAlert("Fehler beim Entfernen", "error");
        }
    }
};

document.getElementById('addAdminForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('newAdminUser')?.value;
    const password = document.getElementById('newAdminPass')?.value;

    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
    }).then(handleAuthError);
    if (res && res.ok) {
        showLuxeAlert("Admin registriert!", "success");
        // 🛡️ KALICI LOG
        window.logActivity(`Yeni Admin Oluşturuldu: ${username}`, currentUser, "Success");
        document.getElementById('addAdminForm').reset();
        window.loadAdmins();
    }
});

// 🛡️ GÜNCELLEME: Logları veritabanına kaydeder ve arayüzü yeniler.
window.logActivity = async (action, user, status) => {
    try {
        await fetch(`${API_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action, user, status })
        });
        // Kaydettikten sonra listeyi veritabanından güncel olarak çekiyoruz.
        await window.loadLogs();
    } catch (err) {
        console.error("Log kaydedilemedi:", err);
    }
};

// --- ARAMA FİLTRELERİ ---
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
        const name = row.querySelector('.reviewer-name').innerText.toLowerCase();
        const text = row.querySelector('.review-text').innerText.toLowerCase();
        row.style.display = (name.includes(term) || text.includes(term)) ? "" : "none";
    });
});

// 🛡️ GÜVENLİK GÜNCELLEMESİ: Logout artık backend'e çerezi temizletir.
window.logout = async () => {
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
        window.location.href = 'login.html';
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 🛡️ DÜZELTME: Diğer işlemler başlamadan önce kimlik bilgisi alınmalı (await).
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