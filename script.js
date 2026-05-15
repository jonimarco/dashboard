const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyEoAXjiLpsFdY1sBUC_xpC3CFRuxaVmsmzBauoDkOGnaGTzVmb-3a3gAVz9GUwY0hyNg/exec';

const elements = {
    dashboardMessage: document.getElementById('dashboardMessage'),
    occupiedCount: document.getElementById('occupiedCount'),
    emptyCount: document.getElementById('emptyCount'),
    totalRevenue: document.getElementById('totalRevenue'),
    occupiedTable: document.querySelector('#occupiedTable tbody'),
    emptyRooms: document.getElementById('emptyRooms')
};

function init() {
    if (sessionStorage.getItem('mentengjaya_logged') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    loadDashboardData();
}

function loadDashboardData() {
    const callbackName = 'dashboardDataCallback';
    window[callbackName] = function (data) {
        if (!data) {
            elements.dashboardMessage.textContent = 'Gagal memuat data dashboard dari Google Sheets.';
            return;
        }

        renderDashboard(data);
    };

    const url = `${APPS_SCRIPT_URL}?action=loadDashboard&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => {
        elements.dashboardMessage.textContent = 'Tidak dapat memuat data dari Apps Script. Periksa URL dan izin akses.';
    };
    script.onload = () => setTimeout(() => document.body.removeChild(script), 1000);
    document.body.appendChild(script);
}

function renderDashboard(data) {
    const kamarisi = data.kamarisi || [];
    const kamarkosong = data.kamarkosong || [];
    const laporankeuangan = data.laporankeuangan || [];

    elements.occupiedCount.textContent = kamarisi.length;
    elements.emptyCount.textContent = kamarkosong.length;
    elements.totalRevenue.textContent = formatCurrency(laporankeuangan.reduce((sum, item) => sum + parseFloat(item.total || 0), 0));

    elements.occupiedTable.innerHTML = kamarisi.length > 0
        ? kamarisi.map(room => `
            <tr>
                <td>${room.room}</td>
                <td>${room.name || 'Tidak diketahui'}</td>
                <td>${formatDate(room.checkin)}</td>
                <td>${formatDate(room.checkout)}</td>
            </tr>`).join('')
        : '<tr><td colspan="4">Tidak ada kamar terisi.</td></tr>';

    elements.emptyRooms.innerHTML = kamarkosong.length > 0
        ? kamarkosong.map(room => `<span class="room-pill">Kamar ${room.room}</span>`).join('')
        : '<p>Tidak ada kamar kosong.</p>';
}

function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(value);
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', init);
