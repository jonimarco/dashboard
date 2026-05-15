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
    // disable while loading
    checkinElements.roomSelect.disabled = true;
    checkinElements.roomSelect.innerHTML = '<option value="">Memuat kamar...</option>';

    const callbackName = 'loadRoomOptionsCallback';
    window[callbackName] = function (data) {
        const kamarkosong = (data && data.kamarkosong) || [];
        const kamarisi = (data && data.kamarisi) || [];

        let available = [];

        if (kamarkosong.length > 0) {
            available = kamarkosong.map(r => parseInt(r.room, 10)).filter(n => !Number.isNaN(n));
        } else {
            // fallback: build rooms 1..20 minus occupied rooms from `kamarisi`
            const occupied = new Set(kamarisi.map(r => parseInt(r.room, 10)).filter(n => !Number.isNaN(n)));
            for (let i = 1; i <= 20; i += 1) {
                if (!occupied.has(i)) available.push(i);
            }
        }

        if (!available.length) {
            checkinElements.roomSelect.innerHTML = '<option value="">Tidak ada kamar tersedia</option>';
            checkinElements.roomSelect.disabled = false;
            return;
        }

        checkinElements.roomSelect.innerHTML = ['<option value="" disabled selected>Pilih kamar</option>']
            .concat(available.map(n => `<option value="${n}">Kamar ${n}</option>`))
            .join('');
        checkinElements.roomSelect.disabled = false;
    };

    const url = `${APPS_SCRIPT_URL}?action=loadDashboard&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => {
        checkinElements.checkinMessage.textContent = 'Gagal memuat daftar kamar kosong dari Google Sheets.';
        // fallback to generate rooms 1..20 (all available)
        const opts = ['<option value="" disabled selected>Pilih kamar</option>'];
        for (let i = 1; i <= 20; i += 1) opts.push(`<option value="${i}">Kamar ${i}</option>`);
        checkinElements.roomSelect.innerHTML = opts.join('');
        checkinElements.roomSelect.disabled = false;
    };
    script.onload = () => setTimeout(() => document.body.removeChild(script), 1000);
    document.body.appendChild(script);

    // If user clicks the select before data loaded, ensure options refresh
    checkinElements.roomSelect.addEventListener('click', () => {
        // if only placeholder present, try reloading
        if (checkinElements.roomSelect.options.length <= 1) {
            loadRoomOptions();
        }
    }, { once: true });
}

function updateTotal() {
    const nights = parseInt(checkinElements.stayLength.value, 10) || 0;
    const price = parseFloat(checkinElements.pricePerNight.value) || 0;
    const total = nights * price;
    checkinElements.totalPayment.textContent = formatCurrency(total);
}

function handleCheckin(event) {
    event.preventDefault();

    const roomValue = checkinElements.roomSelect.value;
    const room = roomValue ? parseInt(roomValue, 10) : null;
    const name = checkinElements.guestName.value.trim();
    const checkin = checkinElements.checkinDate.value;
    const nights = parseInt(checkinElements.stayLength.value, 10);
    const rate = parseFloat(checkinElements.pricePerNight.value);
    const total = nights * rate;

    if (!roomValue || !room || !name || !checkin || nights < 1 || rate <= 0) {
        checkinElements.checkinMessage.textContent = 'Lengkapi semua data check in dengan benar.';
        return;
    }

    // verify room availability just before sending
    checkinElements.checkinMessage.textContent = 'Memeriksa ketersediaan kamar...';
    verifyRoomAvailable(room, function (isAvailable) {
        if (!isAvailable) {
            checkinElements.checkinMessage.textContent = `Kamar ${room} tidak tersedia untuk check in.`;
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
    });
}

function verifyRoomAvailable(roomNumber, callback) {
    const cbName = `verifyRoomAvailableCb_${Date.now()}`;
    window[cbName] = function (data) {
        try {
            const kamarkosong = (data && data.kamarkosong) || [];
            const kamarisi = (data && data.kamarisi) || [];
            let isAvailable = false;

            if (kamarkosong.length > 0) {
                isAvailable = kamarkosong.some(r => parseInt(r.room, 10) === roomNumber);
            } else {
                const occupied = new Set(kamarisi.map(r => parseInt(r.room, 10)).filter(n => !Number.isNaN(n)));
                isAvailable = !occupied.has(roomNumber);
            }

            callback(Boolean(isAvailable));
        } catch (e) {
            callback(false);
        } finally {
            try { delete window[cbName]; } catch (e) { /* ignore */ }
        }
    };

    const script = document.createElement('script');
    script.src = `${APPS_SCRIPT_URL}?action=loadDashboard&callback=${cbName}`;
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
