const AUTH_USER = 'admin';
const AUTH_PASS = 'menteng123';
const STORAGE_KEY = 'mentengjaya_rooms';
const HISTORY_KEY = 'mentengjaya_history';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby76namOrMtVUcD1iQhB888RoVBfeIYbUVvhRsQr-fckIsNFse9KNbdaqjcxaaD7UdZpw/exec';

const state = {
    rooms: [],
    history: []
};

const elements = {
    loginPage: document.getElementById('loginPage'),
    dashboardPage: document.getElementById('dashboardPage'),
    loginForm: document.getElementById('loginForm'),
    loginError: document.getElementById('loginError'),
    logoutBtn: document.getElementById('logoutBtn'),
    userGreeting: document.getElementById('userGreeting'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    occupiedCount: document.getElementById('occupiedCount'),
    emptyCount: document.getElementById('emptyCount'),
    totalRevenue: document.getElementById('totalRevenue'),
    occupiedTable: document.querySelector('#occupiedTable tbody'),
    emptyRooms: document.getElementById('emptyRooms'),
    checkinEmptyRooms: document.getElementById('checkinEmptyRooms'),
    roomSelect: document.getElementById('roomSelect'),
    stayLength: document.getElementById('stayLength'),
    chargeRate: document.getElementById('chargeRate'),
    extraCharge: document.getElementById('extraCharge'),
    totalPayment: document.getElementById('totalPayment'),
    checkinForm: document.getElementById('checkinForm'),
    checkinMessage: document.getElementById('checkinMessage'),
    checkoutTable: document.querySelector('#checkoutTable tbody'),
    totalTransactions: document.getElementById('totalTransactions'),
    reportRevenue: document.getElementById('reportRevenue'),
    reportTable: document.querySelector('#reportTable tbody')
};

function init() {
    loadState();
    initLogin();
    initListeners();
    updateTotalPayment();
}

function loadState() {
    const savedRooms = localStorage.getItem(STORAGE_KEY);
    const savedHistory = localStorage.getItem(HISTORY_KEY);

    state.rooms = savedRooms ? JSON.parse(savedRooms) : createRooms();
    state.history = savedHistory ? JSON.parse(savedHistory) : [];
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rooms));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
}

function createRooms() {
    const rooms = [];
    for (let i = 1; i <= 20; i += 1) {
        rooms.push({
            number: i,
            status: 'empty',
            guest: null
        });
    }
    return rooms;
}

function initLogin() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', handleTabSwitch);
    });
    elements.checkinForm.addEventListener('input', updateTotalPayment);
    elements.checkinForm.addEventListener('submit', handleCheckin);
    renderDashboard();
}

function initListeners() {
    window.addEventListener('keydown', event => {
        if (event.key === 'Enter' && document.activeElement.tagName === 'BUTTON') {
            event.preventDefault();
        }
    });
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (username === AUTH_USER && password === AUTH_PASS) {
        showPage('dashboard');
        elements.loginError.textContent = '';
        elements.userGreeting.textContent = `Selamat datang, ${username}.`;
        renderDashboard();
    } else {
        elements.loginError.textContent = 'Username atau password salah.';
    }
}

function handleLogout() {
    showPage('login');
    resetTabs();
}

function showPage(page) {
    if (page === 'dashboard') {
        elements.loginPage.classList.remove('active');
        elements.loginPage.classList.add('hidden');
        elements.dashboardPage.classList.remove('hidden');
        elements.dashboardPage.classList.add('active');
    } else {
        elements.dashboardPage.classList.remove('active');
        elements.dashboardPage.classList.add('hidden');
        elements.loginPage.classList.remove('hidden');
        elements.loginPage.classList.add('active');
    }
}

function resetTabs() {
    elements.tabButtons.forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById('dashboardHome').classList.add('active');
    document.querySelector('.tab-btn[data-target="dashboardHome"]').classList.add('active');
}

function handleTabSwitch(event) {
    const targetId = event.currentTarget.dataset.target;

    elements.tabButtons.forEach(button => button.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(targetId).classList.remove('hidden');
    document.getElementById(targetId).classList.add('active');

    if (targetId === 'checkinPage') {
        renderCheckinPage();
    } else if (targetId === 'checkoutPage') {
        renderCheckoutPage();
    } else if (targetId === 'reportPage') {
        renderReportPage();
    }
}

function updateTotalPayment() {
    const stayLength = parseInt(elements.stayLength.value, 10) || 0;
    const chargeRate = parseFloat(elements.chargeRate.value) || 0;
    const extraCharge = parseFloat(elements.extraCharge.value) || 0;
    const payment = (stayLength * chargeRate) + extraCharge;
    elements.totalPayment.textContent = formatCurrency(payment);
}

function handleCheckin(event) {
    event.preventDefault();
    const roomNumber = parseInt(elements.roomSelect.value, 10);
    const guestName = document.getElementById('guestName').value.trim();
    const guestPhone = document.getElementById('guestPhone').value.trim();
    const checkinDate = document.getElementById('checkinDate').value;
    const stayLength = parseInt(elements.stayLength.value, 10);
    const chargeRate = parseFloat(elements.chargeRate.value);
    const extraCharge = parseFloat(elements.extraCharge.value);

    if (!roomNumber || !guestName || !guestPhone || !checkinDate || stayLength < 1) {
        elements.checkinMessage.textContent = 'Isi semua data dengan benar.';
        return;
    }

    const checkoutDate = formatDate(addDays(new Date(checkinDate), stayLength));
    const totalPayment = (stayLength * chargeRate) + extraCharge;

    const room = state.rooms.find(r => r.number === roomNumber);
    if (!room || room.status === 'occupied') {
        elements.checkinMessage.textContent = 'Kamar tidak tersedia.';
        return;
    }

    room.status = 'occupied';
    room.guest = {
        name: guestName,
        phone: guestPhone,
        checkinDate,
        stayLength,
        chargeRate,
        extraCharge,
        totalPayment,
        checkoutDate
    };

    const payload = {
        action: 'checkin',
        room: roomNumber,
        name: guestName,
        phone: guestPhone,
        checkin: checkinDate,
        checkout: checkoutDate,
        nights: stayLength,
        rate: chargeRate,
        extra: extraCharge,
        total: totalPayment
    };

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Error posting to Apps Script:', err));

    saveState();
    renderDashboard();
    renderCheckinPage();
    elements.checkinMessage.textContent = `Check in berhasil di kamar ${roomNumber}. Data dikirim ke Google Drive.`;
    elements.checkinForm.reset();
    elements.chargeRate.value = 250000;
    elements.extraCharge.value = 0;
    updateTotalPayment();
}

function renderDashboard() {
    const occupiedRooms = state.rooms.filter(room => room.status === 'occupied');
    const emptyRooms = state.rooms.filter(room => room.status === 'empty');

    elements.occupiedCount.textContent = occupiedRooms.length;
    elements.emptyCount.textContent = emptyRooms.length;
    elements.totalRevenue.textContent = formatCurrency(state.history.reduce((sum, item) => sum + item.totalPayment, 0));

    elements.occupiedTable.innerHTML = occupiedRooms.map(room => {
        return `
        <tr>
          <td>${room.number}</td>
          <td>${room.guest.name}</td>
          <td>${formatDate(new Date(room.guest.checkinDate))}</td>
          <td>${room.guest.checkoutDate}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="4">Tidak ada kamar terisi.</td></tr>';

    elements.emptyRooms.innerHTML = emptyRooms.map(room => `<span class="room-pill">Kamar ${room.number}</span>`).join('') || '<p>Tidak ada kamar kosong.</p>';
}

function renderCheckinPage() {
    const emptyRooms = state.rooms.filter(room => room.status === 'empty');
    if (!emptyRooms.length) {
        elements.checkinEmptyRooms.innerHTML = '<p>Tidak ada kamar kosong.</p>';
        elements.roomSelect.innerHTML = '<option value="">Tidak ada kamar</option>';
        return;
    }

    elements.checkinEmptyRooms.innerHTML = emptyRooms.map(room => `<span class="room-pill">Kamar ${room.number}</span>`).join('');
    elements.roomSelect.innerHTML = emptyRooms.map(room => `<option value="${room.number}">Kamar ${room.number}</option>`).join('');
}

function renderCheckoutPage() {
    const occupiedRooms = state.rooms.filter(room => room.status === 'occupied');
    elements.checkoutTable.innerHTML = occupiedRooms.map(room => {
        return `
        <tr>
            <td>${room.number}</td>
            <td>${room.guest.name}</td>
            <td>${formatDate(new Date(room.guest.checkinDate))}</td>
            <td>${room.guest.checkoutDate}</td>
            <td><button class="btn-primary" data-room="${room.number}">Check Out</button></td>
        </tr>`;
    }).join('') || '<tr><td colspan="5">Tidak ada kamar terisi.</td></tr>';

    document.querySelectorAll('#checkoutTable button').forEach(button => {
        button.addEventListener('click', () => handleCheckout(parseInt(button.dataset.room, 10)));
    });
}

function handleCheckout(roomNumber) {
    const room = state.rooms.find(r => r.number === roomNumber);
    if (!room || room.status !== 'occupied') {
        return;
    }

    const currentDate = new Date();
    const checkoutDateFormatted = formatDate(currentDate);

    const payload = {
        action: 'checkout',
        room: roomNumber,
        name: room.guest.name,
        phone: room.guest.phone,
        checkin: room.guest.checkinDate,
        checkout: checkoutDateFormatted,
        nights: room.guest.stayLength,
        rate: room.guest.chargeRate,
        extra: room.guest.extraCharge,
        total: room.guest.totalPayment
    };

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Error posting to Apps Script:', err));

    state.history.unshift({
        roomNumber,
        guestName: room.guest.name,
        checkinDate: room.guest.checkinDate,
        checkoutDate: checkoutDateFormatted,
        totalPayment: room.guest.totalPayment
    });

    room.status = 'empty';
    room.guest = null;
    saveState();
    renderDashboard();
    renderCheckoutPage();
    renderReportPage();
}

function renderReportPage() {
    elements.totalTransactions.textContent = state.history.length;
    elements.reportRevenue.textContent = formatCurrency(state.history.reduce((sum, item) => sum + item.totalPayment, 0));
    elements.reportTable.innerHTML = state.history.map((item, index) => {
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${item.roomNumber}</td>
            <td>${item.guestName}</td>
            <td>${formatDate(new Date(item.checkinDate))}</td>
            <td>${item.checkoutDate}</td>
            <td>${formatCurrency(item.totalPayment)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="6">Belum ada transaksi.</td></tr>';
}

function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(date) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return '-';
    }
    return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

init();
