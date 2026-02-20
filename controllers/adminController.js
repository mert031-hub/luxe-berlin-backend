/**
 * LUXE BERLIN - ADMIN PANEL LOGIC (FRONTEND)
 * Bu dosya admin.html sayfasındaki işlemleri yönetir.
 */

// API URL Belirleme
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

// ---------------------------------------------------------
// 1. GLOBAL FONKSİYONLAR (Window nesnesine bağlanır)
// ---------------------------------------------------------

// Admin Silme Fonksiyonu
window.deleteAdmin = async function (id) {
    if (!confirm("Sind Sie sicher, dass Sie diesen Administrator löschen möchten?")) return;

    try {
        const response = await fetch(`${API_URL}/auth/admin/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert("Administrator erfolgreich gelöscht.");
            window.location.reload();
        } else {
            alert("Fehler: " + (data.message || "Löschen fehlgeschlagen"));
        }
    } catch (err) {
        console.error("Delete Admin Error:", err);
        alert("Verbindungsfehler.");
    }
};

// Yorum Silme Fonksiyonu
window.deleteReview = async function (id) {
    if (!confirm("Möchten Sie diese Bewertung wirklich löschen?")) return;

    try {
        const response = await fetch(`${API_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert("Bewertung erfolgreich gelöscht.");
            window.location.reload();
        } else {
            alert("Fehler: " + (data.message || "Löschen fehlgeschlagen"));
        }
    } catch (err) {
        console.error("Delete Review Error:", err);
        alert("Verbindungsfehler.");
    }
};

// Çıkış Yapma (Logout)
window.logout = async function () {
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
        window.location.href = 'login.html';
    } catch (err) {
        console.error("Logout Error:", err);
        window.location.href = 'login.html';
    }
};

// ---------------------------------------------------------
// 2. DASHBOARD VERİLERİNİ YÜKLEME
// ---------------------------------------------------------
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/admin/stats`, { credentials: 'include' });

        // Yetkisiz erişim kontrolü
        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        if (data.success) {
            // İstatistikleri UI'a yaz
            if (document.getElementById('stat-count'))
                document.getElementById('stat-count').innerText = data.stats.totalOrders;
            if (document.getElementById('stat-revenue'))
                document.getElementById('stat-revenue').innerText = data.stats.revenue.toFixed(2) + ' €';
            if (document.getElementById('stat-customers'))
                document.getElementById('stat-customers').innerText = data.stats.pendingOrders;

            // Sipariş Tablosunu Doldur
            const orderList = document.getElementById('admin-order-list');
            if (orderList && data.recentOrders) {
                orderList.innerHTML = data.recentOrders.map(order => `
                    <tr>
                        <td>${new Date(order.date).toLocaleDateString('de-DE')}</td>
                        <td>${order.customer.firstName} ${order.customer.lastName}</td>
                        <td><small>${order.shortId}</small></td>
                        <td><span class="badge bg-secondary">Stripe</span></td>
                        <td>${order.totalAmount.toFixed(2)} €</td>
                        <td><span class="badge bg-secondary">${order.status}</span></td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-dark">Details</button>
                        </td>
                    </tr>
                `).join('');
            }

            // Admin Listesini Doldur
            const adminList = document.getElementById('admin-list-body');
            if (adminList && data.admins) {
                adminList.innerHTML = data.admins.map(admin => `
                    <tr>
                        <td><span class="fw-bold">${admin.username}</span></td>
                        <td class="text-end">
                            <button class="btn-delete ms-auto" onclick="deleteAdmin('${admin._id}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // Yorum Listesini Doldur
            const reviewList = document.getElementById('admin-review-list');
            if (reviewList && data.reviews) {
                reviewList.innerHTML = data.reviews.map(review => `
                    <tr>
                        <td>${new Date(review.createdAt).toLocaleDateString('de-DE')}</td>
                        <td><span class="fw-bold">${review.name}</span></td>
                        <td><span class="text-gold">${'★'.repeat(review.rating)}</span></td>
                        <td><div class="review-text small text-muted">${review.text}</div></td>
                        <td>${review.adminReply ? '<span class="badge bg-success">Beantwortet</span>' : '<span class="badge bg-warning text-dark">Offen</span>'}</td>
                        <td class="text-end">
                            <button class="btn-delete d-inline-flex" onclick="deleteReview('${review._id}')"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
}

// ---------------------------------------------------------
// 3. BAŞLATMA VE PRELOADER YÖNETİMİ
// ---------------------------------------------------------
function initAdminPanel() {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        preloader.style.opacity = "0";
        preloader.style.transition = "opacity 0.5s ease";
        setTimeout(() => {
            preloader.style.display = "none";
            const mainContent = document.getElementById('adminMainContent');
            if (mainContent) mainContent.classList.remove('d-none');
            if (typeof AOS !== 'undefined') {
                AOS.init({ duration: 1000, once: true, offset: 100 });
            }
        }, 500);
    }
    loadDashboardData();
}

window.addEventListener("load", initAdminPanel);

setTimeout(() => {
    const preloader = document.getElementById("preloader");
    if (preloader && preloader.style.display !== 'none') {
        console.warn("Preloader timeout - forcing init...");
        initAdminPanel();
    }
}, 2000);