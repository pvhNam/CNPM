/* ===================================
   Auth Client - Login/Register Logic
   =================================== */

let currentUser = null;

// Check if already logged in
async function checkAuth() {
    try {
        const res = await fetch(SERVER_URL + '/api/profile', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            showMenuScreen();
            updateUserUI();
            return true;
        }
    } catch (err) {
        console.log('Not logged in');
    }
    return false;
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';

    try {
        const res = await fetch(SERVER_URL + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            currentUser = data.user;
            showMenuScreen();
            updateUserUI();
        } else {
            errorEl.textContent = data.error;
        }
    } catch (err) {
        errorEl.textContent = 'Lỗi kết nối server';
    }

    btn.disabled = false;
    btn.textContent = 'Đăng Nhập';
}

// Register
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const displayName = document.getElementById('reg-display-name').value.trim();
    const errorEl = document.getElementById('reg-error');
    const btn = document.getElementById('reg-btn');

    errorEl.textContent = '';

    if (password !== confirmPassword) {
        errorEl.textContent = 'Mật khẩu xác nhận không khớp';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Đang đăng ký...';

    try {
        const res = await fetch(SERVER_URL + '/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password, displayName: displayName || username })
        });

        const data = await res.json();

        if (res.ok) {
            currentUser = data.user;
            showMenuScreen();
            updateUserUI();
        } else {
            errorEl.textContent = data.error;
        }
    } catch (err) {
        errorEl.textContent = 'Lỗi kết nối server';
    }

    btn.disabled = false;
    btn.textContent = 'Đăng Ký';
}

// Logout
async function handleLogout() {
    try {
        await fetch(SERVER_URL + '/api/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
        console.error('Logout error:', err);
    }

    currentUser = null;
    if (typeof socket !== 'undefined' && socket) {
        socket.disconnect();
    }
    showAuthScreen();
}

// Switch between login and register forms
function showLoginForm() {
    document.getElementById('login-form-container').classList.add('active');
    document.getElementById('register-form-container').classList.remove('active');
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
}

function showRegisterForm() {
    document.getElementById('login-form-container').classList.remove('active');
    document.getElementById('register-form-container').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.add('active');
}

// Screen management
function showAuthScreen() {
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.remove('active');
}

function showMenuScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.remove('active');
}

function updateUserUI() {
    if (currentUser) {
        document.getElementById('user-display-name').textContent = currentUser.displayName;
        document.getElementById('user-stats').textContent =
            `${currentUser.wins}W / ${currentUser.losses}L / ${currentUser.draws}D`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    checkAuth();
});
