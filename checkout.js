const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby76namOrMtVUcD1iQhB888RoVBfeIYbUVvhRsQr-fckIsNFse9KNbdaqjcxaaD7UdZpw/exec';

const checkoutElements = {
    tableBody: document.querySelector('#checkoutTable tbody'),
    checkoutDetails: document.getElementById('checkoutDetails'),
    selectedInfo: document.getElementById('selectedInfo'),
    charges: document.getElementById('charges'),
    checkoutTotal: document.getElementById('checkoutTotal'),
    confirmCheckout: document.getElementById('confirmCheckout'),
    checkoutMessage: document.getElementById('checkoutMessage')
};

let selectedRecord = null;

function initCheckoutPage() {
    if (sessionStorage.getItem('mentengjaya_logged') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    checkoutElements.charges.addEventListener('input', updateTotal);
    checkoutElements.confirmCheckout.addEventListener('click', handleCheckoutSubmit);
    loadCheckinData();
}

function loadCheckinData() {
    const callbackName = 'loadCheckinCallback';
    window[callbackName] = function (data) {
        const records = (data && data.checkin) || [];
        renderCheckinTable(records);
    };

    const url = `${APPS_SCRIPT_URL}?action=loadCheckin&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => {
        checkoutElements.checkoutMessage.textContent = 'Gagal memuat data checkin dari Google Sheets.';
    };
    script.onload = () => setTimeout(() => document.body.removeChild(script), 1000);
    document.body.appendChild(script);
}

function renderCheckinTable(records) {
    checkoutElements.tableBody.innerHTML = records.length > 0
        ? records.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.room}</td>
                <td>${item.name}</td>
                <td>${item.checkin}</td>
                <td>${item.checkout}</td>
                <td><button class="btn-primary" data-index="${index}">Pilih</button></td>
            </tr>`).join('')
        : '<tr><td colspan="6">Tidak ada data check in aktip.</td></tr>';

    document.querySelectorAll('#checkoutTable button').forEach(button => {
        button.addEventListener('click', () => selectCheckoutRecord(records[parseInt(button.dataset.index, 10)]));
    });
}

function selectCheckoutRecord(record) {
    selectedRecord = record;
    checkoutElements.checkoutDetails.style.display = 'block';
    checkoutElements.selectedInfo.textContent = `Nama: ${record.name} | Kamar: ${record.room} | Check In: ${record.checkin} | Estimasi Checkout: ${record.checkout}`;
    checkoutElements.charges.value = 0;
    updateTotal();
    checkoutElements.checkoutMessage.textContent = '';
}

function updateTotal() {
    if (!selectedRecord) {
        checkoutElements.checkoutTotal.textContent = 'Rp 0';
        return;
    }

    const charges = parseFloat(checkoutElements.charges.value) || 0;
    const originalTotal = parseFloat(selectedRecord.total || 0);
    checkoutElements.checkoutTotal.textContent = formatCurrency(originalTotal + charges);
}

function handleCheckoutSubmit(event) {
    event.preventDefault();
    if (!selectedRecord) {
        checkoutElements.checkoutMessage.textContent = 'Pilih tamu terlebih dahulu sebelum checkout.';
        return;
    }
    // verify the room is still in checkin sheet before processing checkout
    checkoutElements.checkoutMessage.textContent = 'Memeriksa status checkin...';
    verifyRoomCheckedIn(selectedRecord.room, selectedRecord.name, function (exists) {
        if (!exists) {
            checkoutElements.checkoutMessage.textContent = `Data check in untuk kamar ${selectedRecord.room} tidak ditemukan.`;
            return;
        }

        const charges = parseFloat(checkoutElements.charges.value) || 0;
        const originalTotal = parseFloat(selectedRecord.total || 0);
        const newTotal = originalTotal + charges;
        const payload = {
            action: 'checkout',
            room: selectedRecord.room,
            name: selectedRecord.name,
            phone: selectedRecord.phone || '',
            checkin: selectedRecord.checkin,
            checkout: formatDate(new Date()),
            nights: selectedRecord.nights,
            rate: selectedRecord.rate,
            extra: charges,
            total: newTotal
        };

        sendRequest(payload, `Check out tamu ${selectedRecord.name} berhasil diproses.`);
    });
}

function verifyRoomCheckedIn(roomNumber, guestName, callback) {
    const cbName = `verifyRoomCheckedInCb_${Date.now()}`;
    window[cbName] = function (data) {
        try {
            const records = (data && data.checkin) || [];
            const exists = records.some(r => parseInt(r.room, 10) === parseInt(roomNumber, 10) && (!guestName || (r.name === guestName)));
            callback(Boolean(exists));
        } catch (e) {
            callback(false);
        } finally {
            try { delete window[cbName]; } catch (e) { }
        }
    };

    const script = document.createElement('script');
    script.src = `${APPS_SCRIPT_URL}?action=loadCheckin&callback=${cbName}`;
    script.onerror = () => {
        callback(false);
        try { delete window[cbName]; } catch (e) { }
    };
    script.onload = () => setTimeout(() => document.body.removeChild(script), 1000);
    document.body.appendChild(script);
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
        checkoutElements.checkoutMessage.textContent = 'Tidak dapat mengirim data ke Google Sheets.';
    });

    checkoutElements.checkoutMessage.textContent = successMessage;
    selectedRecord = null;
    checkoutElements.checkoutDetails.style.display = 'none';
    setTimeout(loadCheckinData, 1200);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', initCheckoutPage);
