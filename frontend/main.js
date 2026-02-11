/**
 * LUXE BERLIN - CORE JAVASCRIPT
 */

// Global Değişkenler
let products = [];
let cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
let selectedProduct = null, currentQty = 1;
let shownReviewsCount = 6; // Başlangıçta gösterilecek yorum sayısı

// Yapılandırma
const API_URL = '/api';
const UPLOADS_URL = '';

// Sansür Listesi
const badWords = ["küfür1", "küfür2", "argo1", "argo2", "idiot", "badword", "scheiße"];

// --- YENİ: LUXE TOAST BİLDİRİM FONKSİYONU (Eksiksiz Eklendi) ---
function showLuxeAlert(message, type = 'success') {
    const container = document.getElementById('luxe-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'luxe-toast';

    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">Luxe Berlin</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- 1. TEMA YÖNETİMİ ---
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    if (!themeToggleBtn || !themeIcon) return;

    const currentTheme = localStorage.getItem('luxeTheme') || 'light';

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';

        if (theme === 'dark') {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
        localStorage.setItem('luxeTheme', theme);
    });
}

// --- 2. ÜRÜN İŞLEMLERİ ---
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();

        products = data.filter(p => p.isDeleted !== true).map(p => ({
            id: p._id,
            name: p.name,
            price: p.price,
            stock: p.stock || 0,
            tag: p.tag || (p.stock <= 0 ? "Ausverkauft" : "Neu"),
            img: p.image ? (p.image.startsWith('http') ? p.image : `${UPLOADS_URL}/${p.image}`) : 'https://via.placeholder.com/400',
            description: p.description || ""
        }));

        renderProducts(products);
        updateCartUI();
    } catch (error) {
        console.error("Backend bağlantı hatası:", error);
    }
}

function renderProducts(listToDisplay) {
    const grid = document.getElementById('product-grid-container');
    if (!grid) return;

    grid.innerHTML = listToDisplay.map(p => {
        const inCart = cart.find(i => i.id === p.id)?.qty || 0;
        const avail = p.stock - inCart;
        const tagClass = (p.tag === "Ausverkauft" || avail <= 0) ? 'tag-dark' : 'tag-danger';

        return `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="product-card shadow-sm" data-bs-toggle="modal" data-bs-target="#luxeModal" onclick="setupModal('${p.id}')">
                    ${p.tag ? `<span class="product-tag ${tagClass}">${p.tag}</span>` : ''}
                    <div class="product-img-box"><img src="${p.img}" alt="${p.name}"></div>
                    <div class="product-info p-4 text-center">
                        <h3 class="h5 mb-2" style="font-family:'Playfair Display';">${p.name}</h3>
                        <span class="price">${euro.format(p.price)}</span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

window.filterProducts = function () {
    const term = document.getElementById('mainSearchInput')?.value.toLowerCase() || "";
    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
    renderProducts(filtered);
}

// --- 3. YORUM SİSTEMİ (API ENTEGRASYONU & ADMIN CEVAPLARI) ---
let testimonials = [];

function censorText(text) {
    let censoredText = text;
    const regex = new RegExp(badWords.join("|"), "gi");
    censoredText = censoredText.replace(regex, (match) => "*".repeat(match.length));
    return censoredText;
}

async function initTestimonials() {
    const container = document.getElementById('testimonial-container');
    const reviewBox = document.getElementById('verified-review-box');
    const remainingSpan = document.getElementById('remaining-reviews');
    const showMoreWrapper = document.getElementById('show-more-reviews-wrapper');

    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/reviews`);
        if (response.ok) {
            testimonials = await response.json();
        }
    } catch (error) {
        console.error("Yorumlar yüklenemedi:", error);
    }

    const hasOrdered = localStorage.getItem('luxeHasOrdered') === 'true';
    let reviewCount = parseInt(localStorage.getItem('luxeReviewSentCount')) || 0;

    if (hasOrdered && reviewBox) {
        if (reviewCount < 2) {
            reviewBox.style.display = "block";
            if (remainingSpan) remainingSpan.innerText = (2 - reviewCount);
        } else {
            reviewBox.style.display = "none";
        }
    }

    const reviewsToDisplay = testimonials.slice(0, shownReviewsCount);
    container.innerHTML = reviewsToDisplay.map(t => `
        <div class="col-md-4">
            <div class="testimonial-card">
                <div class="stars mb-2">${"⭐".repeat(t.stars)}</div>
                <p class="testimonial-text">"${t.text}"</p>
                
                ${t.adminReply ? `
                <div class="admin-reply-box mt-3 p-3 rounded-3" style="background: rgba(197, 160, 89, 0.05); border-left: 3px solid var(--gold);">
                    <small class="fw-bold text-uppercase d-block mb-1" style="color: var(--gold); font-size: 0.7rem;">Luxe Berlin Team</small>
                    <p class="small mb-0 text-muted italic">${t.adminReply}</p>
                </div>` : ''}

                <div class="d-flex justify-content-between align-items-end mt-auto pt-3">
                    <div class="fw-bold text-uppercase small" style="letter-spacing:1px;">— ${t.name}</div>
                    <span class="testimonial-date" style="font-size: 0.7rem; color: var(--gold);">${t.date || '10.02.2026'}</span>
                </div>
            </div>
        </div>
    `).join('');

    if (showMoreWrapper) {
        showMoreWrapper.style.display = testimonials.length > shownReviewsCount ? "block" : "none";
    }
}

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'showMoreReviewsBtn') {
        shownReviewsCount += 6;
        initTestimonials();
    }
});

document.getElementById('revText')?.addEventListener('input', function () {
    const count = this.value.length;
    const counterDisplay = document.getElementById('char-count');
    if (counterDisplay) counterDisplay.innerText = `${count} / 500`;
});

document.getElementById('reviewForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    let reviewCount = parseInt(localStorage.getItem('luxeReviewSentCount')) || 0;

    if (reviewCount >= 2) {
        const limitModal = new bootstrap.Modal(document.getElementById('reviewLimitModal'));
        limitModal.show();
        return;
    }

    const name = document.getElementById('revName').value;
    const text = document.getElementById('revText').value;
    const stars = parseInt(document.getElementById('revStars').value);
    const currentDate = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const newReview = {
        name: name,
        stars: stars,
        text: censorText(text),
        date: currentDate
    };

    try {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newReview)
        });

        if (response.ok) {
            reviewCount++;
            localStorage.setItem('luxeReviewSentCount', reviewCount.toString());
            await initTestimonials();
            e.target.reset();
            if (document.getElementById('char-count')) document.getElementById('char-count').innerText = "0 / 500";

            if (reviewCount === 2) {
                new bootstrap.Modal(document.getElementById('reviewLimitModal')).show();
            } else {
                // ALERT YERİNE TOAST GÜNCELLEMESİ
                showLuxeAlert("Vielen Dank für Ihre Bewertung!", "success");
            }
        }
    } catch (err) {
        console.error("Yorum gönderilemedi:", err);
    }
});

// --- 4. MODAL & MİKTAR MANTIĞI ---
window.setupModal = function (id) {
    selectedProduct = products.find(p => p.id === id);
    if (!selectedProduct) return;

    const inCart = cart.find(i => i.id === selectedProduct.id)?.qty || 0;
    const avail = selectedProduct.stock - inCart;
    currentQty = avail > 0 ? 1 : 0;

    document.getElementById('mImg').src = selectedProduct.img;
    document.getElementById('mTitle').innerText = selectedProduct.name;

    const features = selectedProduct.description.split(',');
    document.getElementById('mDesc').innerHTML = `
        <ul class="list-unstyled mt-3">
            ${features.map(f => `<li class="mb-2">✅ ${f.trim()}</li>`).join('')}
        </ul>`;

    updateModalUI();
}

function updateModalUI() {
    if (!selectedProduct) return;
    const inCart = cart.find(i => i.id === selectedProduct.id)?.qty || 0;
    const avail = selectedProduct.stock - inCart;

    document.getElementById('qtyInput').value = currentQty;
    document.getElementById('mPriceDisplay').innerText = euro.format(selectedProduct.price * currentQty);

    const addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn) addBtn.disabled = avail <= 0;

    const statusBox = document.getElementById('mStockStatus');
    if (statusBox) {
        statusBox.innerText = avail > 0 ? `VORRÄTIG: ${avail}` : "AUSVERKAUFT";
        statusBox.className = avail > 0 ? "bg-light text-dark fw-bold border p-2 px-3" : "bg-danger text-white fw-bold border-0 p-2 px-3";
    }
}

window.changeQty = function (val) {
    if (!selectedProduct) return;
    const inCart = cart.find(i => i.id === selectedProduct.id)?.qty || 0;
    const avail = selectedProduct.stock - inCart;
    const next = currentQty + val;

    if (next >= 1 && next <= avail) {
        currentQty = next;
        updateModalUI();
    }
}

window.validateManualQty = function (input) {
    if (!selectedProduct) return;
    const inCart = cart.find(i => i.id === selectedProduct.id)?.qty || 0;
    const avail = selectedProduct.stock - inCart;
    let val = parseInt(input.value);

    if (isNaN(val) || val < 1) val = 1;
    if (val > avail) val = avail;

    currentQty = val;
    input.value = val;
    updateModalUI();
}

window.blockNonIntegers = function (e) {
    if ([".", ",", "e", "E", "+", "-"].includes(e.key)) e.preventDefault();
}

// --- 5. SEPET YÖNETİMİ (GÜNCEL YÜZEN SEPET) ---
window.addToCart = function () {
    if (currentQty <= 0) return;

    const item = cart.find(i => i.id === selectedProduct.id);
    if (item) {
        item.qty += currentQty;
    } else {
        cart.push({ id: selectedProduct.id, qty: currentQty });
    }

    localStorage.setItem('luxeCartArray', JSON.stringify(cart));
    updateCartUI();
    renderProducts(products);

    const luxeModal = bootstrap.Modal.getInstance(document.getElementById('luxeModal'));
    if (luxeModal) luxeModal.hide();

    // ALERT YERİNE TOAST GÜNCELLEMESİ
    showLuxeAlert("Artikel zum Warenkorb hinzugefügt.", "success");
}

function updateCartUI() {
    const totalQty = cart.reduce((acc, i) => acc + i.qty, 0);
    const totalPrice = cart.reduce((acc, i) => {
        const p = products.find(x => x.id === i.id);
        return acc + (p ? p.price * i.qty : 0);
    }, 0);

    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = totalQty;
        badge.style.display = totalQty > 0 ? "block" : "none";
    }

    const floatBar = document.getElementById('luxe-floating-cart');
    const floatTotal = document.getElementById('float-total-amount');

    if (floatBar && floatTotal) {
        if (totalQty > 0) {
            floatBar.classList.add('active');
            floatTotal.innerText = euro.format(totalPrice);
        } else {
            floatBar.classList.remove('active');
        }
    }
}

// --- BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    initTheme();
    initTestimonials();
});