/**
 * LUXE BERLIN - ADMIN LOGIN LOGIC (SECURE VERSION)
 */

// --- DINAMİK API YAPILANDIRMASI ---
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

// 1. PRELOADER & AOS INITIALIZATION
window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') {
                    AOS.init({ duration: 1000, once: true, offset: 100 });
                }
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});

// 2. LOGIN FORM LOGIC
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginBtn = document.getElementById('loginBtn');
    const username = document.getElementById('user').value;
    const password = document.getElementById('pass').value;

    // Butonu geçici olarak devre dışı bırak
    loginBtn.disabled = true;
    loginBtn.innerText = "Authentifizierung...";

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            // 🛡️ KRİTİK: Backend'den gelen HttpOnly çerezini kabul et
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            // ❌ localStorage.setItem('adminToken', ...) SİLİNDİ!
            // Tarayıcı çerezi otomatik olarak kilitledi.
            window.location.href = 'admin.html';
        } else {
            alert("Zugriff verweigert: " + (data.message || "Falsche Daten"));
            loginBtn.disabled = false;
            loginBtn.innerText = "Internal Access";
        }
    } catch (err) {
        console.error("Login Fehler:", err);
        alert("Serververbindung fehlgeschlagen! Bitte prüfen Sie Ihre Verbindung.");
        loginBtn.disabled = false;
        loginBtn.innerText = "Internal Access";
    }
});