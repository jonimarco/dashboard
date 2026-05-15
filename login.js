const AUTH_USER = 'admin';
const AUTH_PASS = 'menteng123';
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

function initLoginPage() {
    if (sessionStorage.getItem('mentengjaya_logged') === 'true') {
        window.location.href = 'dashboard.html';
        return;
    }

    loginForm.addEventListener('submit', event => {
        event.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (username === AUTH_USER && password === AUTH_PASS) {
            sessionStorage.setItem('mentengjaya_logged', 'true');
            window.location.href = 'dashboard.html';
        } else {
            loginError.textContent = 'Username atau password salah.';
        }
    });
}

document.addEventListener('DOMContentLoaded', initLoginPage);
