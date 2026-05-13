// Ganti dengan URL Apps Script Anda
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygYfVSxfC3eokr6KdqsLix7Tz8sdLRAMfLaCRu9yEL5fRSKqRDs_HbKElfLx13e_ZDVg/exec';

document.getElementById('dataForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    
    const data = {
        name: name,
        email: email,
        message: message
    };
    
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Karena Apps Script mungkin tidak set CORS
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        document.getElementById('response').innerText = 'Data berhasil dikirim!';
        document.getElementById('dataForm').reset();
    })
    .catch(error => {
        document.getElementById('response').innerText = 'Error: ' + error.message;
    });
});
