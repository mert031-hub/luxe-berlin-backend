/**
 * LUXE BERLIN - CORE JAVASCRIPT (ULTRA STABLE)
 * Tüm özellikler: Sepet Onarımı, Miktar Koruması, 1 Yorum Sınırı, Karakter Sayacı, 
 * İsim Sınırı (50 Karakter) ve Küfür Filtresi Onarımı.
 * FIX: Cookie Banner Revert ve yasal onay mantığı eklendi.
 */

// --- GLOBAL DEĞİŞKENLER ---
let products = [];
let cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
let selectedProduct = null, currentQty = 1;
let shownReviewsCount = 6;
let testimonials = [];

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';
const UPLOADS_URL = '';

const badWords = ["küfür1", "küfür2", "argo1", "argo2", "idiot", "badword", "scheiße"];

// --- 1. LUXE TOAST BİLDİRİM FONKSİYONU ---
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

// --- 2. TEMA YÖNETİMİ ---
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
        themeIcon.classList.replace(theme === 'dark' ? 'fa-moon' : 'fa-sun', theme === 'dark' ? 'fa-sun' : 'fa-moon');
        localStorage.setItem('luxeTheme', theme);
    });
}

// --- 3. ÜRÜN İŞLEMLERİ ---
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

    cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];

    grid.innerHTML = listToDisplay.map(p => {
        const inCart = cart.find(i => i.id === p.id)?.qty || 0;
        const avail = p.stock - inCart;
        const tagClass = (p.tag === "Ausverkauft" || avail <= 0) ? 'tag-dark' : 'tag-danger';

        return `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="product-card shadow-sm" data-bs-toggle="modal" data-bs-target="#luxeModal" onclick="setupModal('${p.id}')">
                    ${p.tag ? `<span class="product-tag ${tagClass}">${p.tag}</span>` : ''}
                    <div class="product-img-box"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
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
        p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
    );
    renderProducts(filtered);
}

// --- 4. YORUM YÖNETİMİ ---
function censorText(text) {
    if (!text) return "";
    const regex = new RegExp(badWords.join("|"), "gi");
    return text.replace(regex, (match) => "*".repeat(match.length));
}

async function initTestimonials() {
    const container = document.getElementById('testimonial-container');
    const reviewBox = document.getElementById('verified-review-box');
    const remainingSpan = document.getElementById('remaining-reviews');
    const showMoreWrapper = document.getElementById('show-more-reviews-wrapper');

    if (!container) return;
    try {
        const response = await fetch(`${API_URL}/reviews`);
        if (response.ok) testimonials = await response.json();
    } catch (error) { console.error("Yorumlar yüklenemedi:", error); }

    const hasOrdered = localStorage.getItem('luxeHasOrdered') === 'true';
    let reviewCount = parseInt(localStorage.getItem('luxeReviewSentCount')) || 0;

    if (hasOrdered && reviewBox) {
        if (reviewCount < 1) {
            reviewBox.style.display = "block";
            if (remainingSpan) remainingSpan.innerText = (1 - reviewCount);
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
                ${t.adminReply ? `<div class="admin-reply-box mt-3 p-3 rounded-3" style="background: rgba(197, 160, 89, 0.05); border-left: 3px solid var(--gold);">
                    <small class="fw-bold text-uppercase d-block mb-1" style="color: var(--gold); font-size: 0.7rem;">Luxe Berlin Team</small>
                    <p class="small mb-0 text-muted italic">${t.adminReply}</p>
                </div>` : ''}
                <div class="d-flex justify-content-between align-items-end mt-auto pt-3">
                    <div class="fw-bold text-uppercase small">— ${t.name}</div>
                    <span class="testimonial-date" style="font-size: 0.7rem; color: var(--gold);">${t.date || '13.02.2026'}</span>
                </div>
            </div>
        </div>`).join('');

    if (showMoreWrapper) showMoreWrapper.style.display = testimonials.length > shownReviewsCount ? "block" : "none";
}

function initReviewCounter() {
    const revTextArea = document.getElementById('revText');
    const charCounter = document.getElementById('char-count');
    const revNameInput = document.getElementById('revName');

    if (revTextArea && charCounter) {
        revTextArea.addEventListener('input', function () {
            charCounter.innerText = `${this.value.length} / 500`;
        });
    }

    if (revNameInput) {
        revNameInput.addEventListener('input', function () {
            if (this.value.length > 50) {
                this.value = this.value.substring(0, 50);
            }
        });
    }
}

document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'showMoreReviewsBtn') {
        shownReviewsCount += 6;
        initTestimonials();
    }
});

document.getElementById('reviewForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    let reviewCount = parseInt(localStorage.getItem('luxeReviewSentCount')) || 0;

    if (reviewCount >= 1) {
        new bootstrap.Modal(document.getElementById('reviewLimitModal')).show();
        return;
    }

    const nameValue = document.getElementById('revName').value;
    const textValue = document.getElementById('revText').value;

    if (nameValue.length > 50) {
        showLuxeAlert("Der Name ist zu lang (max. 50 Zeichen).", "warning");
        return;
    }

    const newReview = {
        name: nameValue,
        stars: parseInt(document.getElementById('revStars').value),
        text: censorText(textValue),
        date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
            document.getElementById('char-count').innerText = "0 / 500";
            new bootstrap.Modal(document.getElementById('reviewLimitModal')).show();
        }
    } catch (err) {
        console.error("Yorum hatası:", err);
    }
});

// --- 5. MODAL VE MİKTAR KORUMASI ---
window.setupModal = function (id) {
    selectedProduct = products.find(p => p.id === id);
    if (!selectedProduct) return;

    cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];
    const inCart = cart.find(i => i.id === selectedProduct.id)?.qty || 0;
    const avail = selectedProduct.stock - inCart;
    currentQty = avail > 0 ? 1 : 0;

    const qtyInput = document.getElementById('qtyInput');
    document.getElementById('mImg').src = selectedProduct.img;
    document.getElementById('mTitle').innerText = selectedProduct.name;

    if (qtyInput) {
        qtyInput.onfocus = function () { this.select(); };
        qtyInput.onblur = function () {
            if (this.value === "" || parseInt(this.value) < 1) {
                currentQty = avail > 0 ? 1 : 0;
                this.value = currentQty;
                updateModalUI();
            }
        };
    }

    const errorDisplay = document.getElementById('mQtyError');
    if (errorDisplay) { errorDisplay.innerText = ""; errorDisplay.style.display = "none"; }

    const features = selectedProduct.description.split(',');
    document.getElementById('mDesc').innerHTML = `<ul class="list-unstyled mt-3">
        ${features.map(f => `<li class="mb-2">✅ ${f.trim()}</li>`).join('')}
    </ul>`;

    updateModalUI();
}

function updateModalUI() {
    if (!selectedProduct) return;
    const inCart = cart.find(i => i.id === selectedProduct.id)?.qty || 0;
    const avail = selectedProduct.stock - inCart;

    const qtyInput = document.getElementById('qtyInput');
    if (qtyInput && document.activeElement !== qtyInput) {
        qtyInput.value = currentQty;
    }

    document.getElementById('mPriceDisplay').innerText = euro.format(selectedProduct.price * currentQty);

    const addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn) addBtn.disabled = avail <= 0 || currentQty <= 0;

    const statusBox = document.getElementById('mStockStatus');
    if (statusBox) {
        statusBox.innerText = avail > 0 ? `VORRÄTIG: ${avail}` : "AUSVERKAUFT";
        statusBox.className = avail > 0 ? "bg-light text-dark fw-bold border p-2 px-3 d-inline-block rounded-1" : "bg-danger text-white fw-bold border-0 p-2 px-3 d-inline-block rounded-1";
    }
}

window.changeQty = function (val) {
    if (!selectedProduct) return;
    const inCart = cart.find(i => i.id === selectedProduct.id)?.qty || 0;
    const avail = selectedProduct.stock - inCart;
    const next = currentQty + val;
    const errorDisplay = document.getElementById('mQtyError');

    if (next >= 1 && next <= avail) {
        currentQty = next;
        if (errorDisplay) errorDisplay.style.display = "none";
        updateModalUI();
    } else if (next > avail && errorDisplay) {
        errorDisplay.innerText = `Maximal ${avail} Stück verfügbar.`;
        errorDisplay.style.display = "block";
    }
}

window.validateManualQty = function (input) {
    if (!selectedProduct) return;
    const inCart = cart.find(i => i.id === selectedProduct.id)?.qty || 0;
    const avail = selectedProduct.stock - inCart;
    const errorDisplay = document.getElementById('mQtyError');

    let valStr = input.value.replace(/[^0-9]/g, '');

    if (valStr === "") {
        currentQty = 0;
        document.getElementById('mPriceDisplay').innerText = euro.format(0);
        const addBtn = document.getElementById('add-to-cart-btn');
        if (addBtn) addBtn.disabled = true;
        return;
    }

    let val = parseInt(valStr);

    if (val > avail) {
        val = avail;
        if (errorDisplay) {
            errorDisplay.innerText = `Maximal ${avail} Stück verfügbar.`;
            errorDisplay.style.display = "block";
        }
    } else {
        if (errorDisplay) errorDisplay.style.display = "none";
    }

    currentQty = val;
    input.value = val;
    updateModalUI();
}

window.blockNonIntegers = function (e) {
    if ([".", ",", "e", "E", "+", "-"].includes(e.key)) e.preventDefault();
}

// --- 6. SEPET YÖNETİMİ ---
window.addToCart = function () {
    if (currentQty <= 0) return;

    cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];

    const item = cart.find(i => i.id === selectedProduct.id);
    if (item) item.qty += currentQty;
    else cart.push({ id: selectedProduct.id, qty: currentQty });

    localStorage.setItem('luxeCartArray', JSON.stringify(cart));
    updateCartUI();
    renderProducts(products);

    bootstrap.Modal.getInstance(document.getElementById('luxeModal')).hide();
    showLuxeAlert("Artikel zum Warenkorb hinzugefügt.", "success");
}

window.handleCheckoutNavigation = function (e) {
    const currentCart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];
    if (currentCart.length === 0) {
        if (e) e.preventDefault();
        showLuxeAlert("Ihr Warenkorb ist leer. Bitte fügen Sie zuerst ein Produkt hinzu.", "warning");
        return false;
    }
    return true;
}

function updateCartUI() {
    const validCartItems = cart.filter(item => products.some(p => p.id === item.id));
    const totalQty = validCartItems.reduce((acc, i) => acc + i.qty, 0);
    const totalPrice = validCartItems.reduce((acc, i) => {
        const p = products.find(x => x.id === i.id);
        return acc + (p ? p.price * i.qty : 0);
    }, 0);

    const badge = document.getElementById('cart-badge');
    if (badge) { badge.innerText = totalQty; badge.style.display = totalQty > 0 ? "block" : "none"; }

    const floatBar = document.getElementById('luxe-floating-cart');
    const floatTotal = document.getElementById('float-total-amount');

    if (floatBar && floatTotal) {
        if (totalQty > 0) {
            floatBar.classList.add('active');
            floatTotal.innerText = euro.format(totalPrice);
            floatBar.onclick = (e) => handleCheckoutNavigation(e);
        } else {
            floatBar.classList.remove('active');
            floatBar.onclick = null;
        }
    }

    if (validCartItems.length !== cart.length) {
        cart = validCartItems;
        localStorage.setItem('luxeCartArray', JSON.stringify(cart));
    }
}

// --- 🍪 🛡️ 7. DSVGO COOKIE CONSENT LOGIC ---
function initCookieConsent() {
    const banner = document.getElementById('luxe-cookie-banner');
    const btnAccept = document.getElementById('btn-cookie-accept');
    const btnReject = document.getElementById('btn-cookie-reject');

    if (!banner || !btnAccept || !btnReject) return;

    // LocalStorage kontrolü
    const consent = localStorage.getItem('luxeCookieConsent');

    if (!consent) {
        // Kullanıcı daha önce seçim yapmamışsa 1.5 sn sonra göster
        setTimeout(() => {
            banner.style.display = 'block';
        }, 1500);
    }

    btnAccept.addEventListener('click', () => {
        localStorage.setItem('luxeCookieConsent', 'accepted');
        banner.style.animation = 'toastFadeOut 0.5s ease forwards';
        setTimeout(() => { banner.style.display = 'none'; }, 500);
    });

    btnReject.addEventListener('click', () => {
        localStorage.setItem('luxeCookieConsent', 'rejected');
        banner.style.animation = 'toastFadeOut 0.5s ease forwards';
        setTimeout(() => { banner.style.display = 'none'; }, 500);
    });
}

// --- 8. BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    initTheme();
    initTestimonials();
    initReviewCounter();
    initCookieConsent(); // 🛡️ Çerez korumasını devreye al

    document.querySelectorAll('a[href*="checkout"], a[href*="payment"], a[href*="cart.html"]').forEach(link => {
        link.addEventListener('click', (e) => handleCheckoutNavigation(e));
    });
});

window.addEventListener('pageshow', (event) => {
    cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];
    if (products.length > 0) renderProducts(products);
    updateCartUI();
});

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
                        offset: 10,
                        disableMutationObserver: false
                    });
                    AOS.refresh();
                }
                window.scrollBy(0, 1); window.scrollBy(0, -1);
                window.dispatchEvent(new Event('scroll'));

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