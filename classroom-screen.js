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

async function fetchRows() {
    const url =
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/gviz/tq?gid=0&pub=1&tqx=out:json';
    const res = await fetch(url);
    const text = await res.text();
    const rawMatch = text.match(/setResponse\(([^)]+)\)/);
    if (!rawMatch) return [];
    const obj = JSON.parse(rawMatch[1]);
    return obj.table.rows;
}

function getClasses(rows) {
    return [...new Set(rows.map(r => r.c[1]?.v).filter(Boolean))];
}

function filterTasks(rows, clazz) {
    return rows
        .filter(r => r.c[1]?.v === clazz)
        .map(r => ({ date: r.c[0]?.v, tache: r.c[2]?.v }));
}

document.addEventListener('DOMContentLoaded', async () => {
    const rows = await fetchRows();
    sheetRows = rows;
    const sel = document.getElementById('classe-select');
    getClasses(rows).forEach(c => sel.append(new Option(c, c)));
    sel.onchange = () => {
        const filtered = filterTasks(rows, sel.value);
        document.getElementById('taches').innerHTML =
            filtered.map(t => `<li>${t.date} – ${t.tache}</li>`).join('');
    };
});
