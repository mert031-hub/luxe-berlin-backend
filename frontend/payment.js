let products = [];
let cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];

// --- GLOBAL YAPILANDIRMA (DİNAMİK URL GÜNCELLEMESİ) ---
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

const UPLOADS_URL = '';
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

async function fetchProductsAndLoad() {
    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        products = data.filter(p => !p.isDeleted).map(p => ({
            id: p._id, name: p.name, price: p.price, stock: p.stock,
            img: p.image?.startsWith('http') ? p.image : `${UPLOADS_URL}/${p.image}`
        }));
        loadCheckout();
    } catch (err) { console.error("Ürün yükleme hatası:", err); }
}

function loadCheckout() {
    const container = document.getElementById('checkout-items');
    if (!container) return;
    let sub = 0;

    if (cart.length === 0) {
        container.innerHTML = "<div class='text-center py-5 opacity-50 text-white'>Warenkorb leer.</div>";
    } else {
        container.innerHTML = cart.map((item, index) => {
            const p = products.find(x => x.id === item.id);
            if (!p) return "";
            sub += p.price * item.qty;
            return `
                <div class="d-flex align-items-center mb-4 pb-3 border-bottom border-white border-opacity-10 cart-item-anim" 
                     style="animation-delay: ${index * 0.1}s">
                    <img src="${p.img}" width="55" class="me-3 rounded shadow-sm">
                    <div class="flex-grow-1">
                        <div class="small fw-bold mb-1 text-white">${p.name}</div>
                        <div class="d-flex align-items-center">
                            <button type="button" class="btn btn-xs btn-outline-light py-0 px-2" onclick="updateCartItemQty('${p.id}', -1)">-</button>
                            <span id="qty-${p.id}" class="mx-2 small text-white">${item.qty}</span>
                            <button type="button" class="btn btn-xs btn-outline-light py-0 px-2" onclick="updateCartItemQty('${p.id}', 1)">+</button>
                            <button type="button" onclick="removeFromCart('${p.id}')" class="btn p-0 text-danger border-0 ms-3" style="font-size:0.6rem; font-weight:700;">LÖSCHEN</button>
                        </div>
                    </div>
                    <div class="text-end fw-bold text-white">${euro.format(p.price * item.qty)}</div>
                </div>`;
        }).join('');
    }

    const net = sub / 1.19;
    if (document.getElementById('summary-net')) document.getElementById('summary-net').innerText = euro.format(net);
    if (document.getElementById('summary-tax')) document.getElementById('summary-tax').innerText = euro.format(sub - net);
    if (document.getElementById('summary-total')) document.getElementById('summary-total').innerText = euro.format(sub);

    const btn = document.querySelector('.btn-order-submit');
    if (btn) btn.disabled = sub <= 0;
}

window.clearCartTrigger = () => {
    const modalElement = document.getElementById('confirmClearModal');
    if (modalElement) {
        const modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
    }
};

window.confirmClearFullCart = () => {
    cart = [];
    localStorage.setItem('luxeCartArray', JSON.stringify(cart));
    loadCheckout();
    const modalEl = document.getElementById('confirmClearModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
};

window.updateCartItemQty = (id, d) => {
    const i = cart.find(x => x.id === id), p = products.find(x => x.id === id);
    if (i && p && i.qty + d >= 1 && i.qty + d <= p.stock) {
        i.qty += d;
        localStorage.setItem('luxeCartArray', JSON.stringify(cart));
        loadCheckout();
    }
};

window.removeFromCart = (id) => {
    cart = cart.filter(x => x.id !== id);
    localStorage.setItem('luxeCartArray', JSON.stringify(cart));
    loadCheckout();
};

document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('orderFirstName').value.trim();
    const lastName = document.getElementById('orderLastName').value.trim();
    const email = document.getElementById('orderEmail').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const address = document.getElementById('orderAddress').value.trim();

    const nameRegex = /^[A-Za-zÀ-ž\s]{2,}$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
        return alert("Bitte geben Sie einen gültigen Namen ein (nur Buchstaben, mind. 2 Zeichen).");
    }

    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
        return alert("Bitte geben Sie eine gültige Telefonnummer ein.");
    }

    if (address.length < 10) {
        return alert("Bitte geben Sie eine vollständige Lieferadresse ein.");
    }

    if (!document.getElementById('checkAGB').checked || !document.getElementById('checkPrivacy').checked) {
        return alert("Bitte akzeptieren Sie die AGB und Datenschutzbestimmungen.");
    }

    const currentTotal = cart.reduce((acc, item) => {
        const p = products.find(x => x.id === item.id);
        return acc + (p ? p.price * item.qty : 0);
    }, 0);

    const orderData = {
        customer: { firstName, lastName, email, phone, address },
        items: cart.map(item => {
            const p = products.find(x => x.id === item.id);
            return { productId: p.id, name: p.name, qty: item.qty, price: p.price };
        }),
        totalAmount: currentTotal,
        paymentMethod: document.querySelector('input[name="pay"]:checked')?.parentElement.querySelector('small').innerText.trim() || "KARTE"
    };

    const btn = document.querySelector('.btn-order-submit');
    if (btn) { btn.disabled = true; btn.innerText = "VERARBEITUNG..."; }

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const result = await response.json();
        if (response.ok) {
            localStorage.removeItem('luxeCartArray');
            // Sipariş sonrası yönlendirme
            window.location.href = `./success.html?orderId=${result.orderId}&displayId=${result.shortId}`;
        } else {
            alert("Fehler: " + (result.message || "Bestellung fehlgeschlagen."));
        }
    } catch (err) {
        console.error("Ödeme hatası:", err);
        alert("Serververbindung fehlgeschlagen. Bitte versuchen Sie es später erneut.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "ZAHLUNGSPFLICHTIG BESTELLEN"; }
    }
});

document.addEventListener('DOMContentLoaded', fetchProductsAndLoad);