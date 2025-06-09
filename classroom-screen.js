// Remplacez TA_CLE_API par votre clé d'API Google (Sheets API activée)
const API_KEY = 'TA_CLE_API';
const SHEET_ID = '1MqJrQnQ3haqTiztDA-yXdMWWR4RHR0pAMHkIBsegFz8';
const RANGE = 'tache!A2:C';
let sheetRows = [];

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    clockEl.textContent = now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    dateEl.textContent = now.toLocaleDateString('fr-FR');
}
setInterval(updateClock, 1000);
updateClock();

let timerSeconds = 0;
let timerInterval = null;
function updateTimer() {
    const hrs = String(Math.floor(timerSeconds/3600)).padStart(2,'0');
    const mins = String(Math.floor((timerSeconds%3600)/60)).padStart(2,'0');
    const secs = String(timerSeconds%60).padStart(2,'0');
    document.getElementById('timer-display').textContent = `${hrs}:${mins}:${secs}`;
}
function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimer();
        }, 1000);
    }
}
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
function resetTimer() {
    stopTimer();
    timerSeconds = 0;
    updateTimer();
}

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('stop-btn').addEventListener('click', stopTimer);
document.getElementById('reset-btn').addEventListener('click', resetTimer);
updateTimer();

document.addEventListener('DOMContentLoaded', () => {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`)
        .then(r => r.json())
        .then(data => {
            sheetRows = data.values || [];
            populateClasses(sheetRows);
        })
        .catch(err => console.error('Erreur de récupération', err));
    document.getElementById('class-select').addEventListener('change', (e) => {
        displayTasks(e.target.value);
    });
});

function populateClasses(rows) {
    const select = document.getElementById('class-select');
    const classes = [...new Set(rows.map(r => r[1]).filter(Boolean))];
    select.innerHTML = '<option value="">-- Classe --</option>' +
        classes.map(c => `<option value="${c}">${c}</option>`).join('');
}

function displayTasks(selectedClass) {
    const container = document.getElementById('tasks');
    container.innerHTML = '';
    if (!selectedClass) return;
    const filtered = sheetRows.filter(r => r[1] === selectedClass);
    filtered.forEach(row => {
        const li = document.createElement('li');
        li.textContent = `${row[0]} - ${row[2]}`;
        container.appendChild(li);
    });
}
