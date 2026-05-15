const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby76namOrMtVUcD1iQhB888RoVBfeIYbUVvhRsQr-fckIsNFse9KNbdaqjcxaaD7UdZpw/exec';

const checkinElements = {
    roomSelect: document.getElementById('roomSelect'),
    guestName: document.getElementById('guestName'),
    checkinDate: document.getElementById('checkinDate'),
    stayLength: document.getElementById('stayLength'),
    pricePerNight: document.getElementById('pricePerNight'),
    totalPayment: document.getElementById('totalPayment'),
    checkinForm: document.getElementById('checkinForm'),
    checkinMessage: document.getElementById('checkinMessage')
};

function initCheckinPage() {
    if (sessionStorage.getItem('mentengjaya_logged') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    checkinElements.stayLength.addEventListener('input', updateTotal);
    checkinElements.pricePerNight.addEventListener('input', updateTotal);
    checkinElements.checkinForm.addEventListener('submit', handleCheckin);
    loadRoomOptions();
    updateTotal();
}

function loadRoomOptions() {
    const callbackName = 'loadRoomOptionsCallback';
    window[callbackName] = function (data) {
        const rooms = (data && data.kamarkosong) || [];
        if (!rooms.length) {
            checkinElements.roomSelect.innerHTML = '<option value="">Tidak ada kamar tersedia</option>';
            return;
        }
        checkinElements.roomSelect.innerHTML = rooms.map(room => `<option value="${room.room}">Kamar ${room.room}</option>`).join('');
    };

    const url = `${APPS_SCRIPT_URL}?action=loadDashboard&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => {
        checkinElements.checkinMessage.textContent = 'Gagal memuat daftar kamar kosong dari Google Sheets.';
    };
    script.onload = () => setTimeout(() => document.body.removeChild(script), 1000);
    document.body.appendChild(script);
}

function updateTotal() {
    const nights = parseInt(checkinElements.stayLength.value, 10) || 0;
    const price = parseFloat(checkinElements.pricePerNight.value) || 0;
    const total = nights * price;
    checkinElements.totalPayment.textContent = formatCurrency(total);
}

function handleCheckin(event) {
    event.preventDefault();

    const room = parseInt(checkinElements.roomSelect.value, 10);
    const name = checkinElements.guestName.value.trim();
    const checkin = checkinElements.checkinDate.value;
    const nights = parseInt(checkinElements.stayLength.value, 10);
    const rate = parseFloat(checkinElements.pricePerNight.value);
    const total = nights * rate;

    if (!room || !name || !checkin || nights < 1 || rate <= 0) {
        checkinElements.checkinMessage.textContent = 'Lengkapi semua data check in dengan benar.';
        return;
    }

    const checkout = formatDate(addDays(new Date(checkin), nights));
    const payload = {
        action: 'checkin',
        room,
        name,
        phone: '',
        checkin,
        checkout,
        nights,
        rate,
        extra: 0,
        total
    };

    sendRequest(payload, 'Data check in berhasil disimpan.');
}

function sendRequest(payload, successMessage) {
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).catch(() => {
        checkinElements.checkinMessage.textContent = 'Tidak dapat mengirim data ke Google Sheets.';
    });

    checkinElements.checkinMessage.textContent = successMessage;
    checkinElements.checkinForm.reset();
    checkinElements.pricePerNight.value = 250000;
    updateTotal();
    setTimeout(loadRoomOptions, 1200);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', initCheckinPage);
