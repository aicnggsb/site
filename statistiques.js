const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCSH8hh-ykxl1L9joc4opVRARLGfcqi6uTW1bRXyyzsu99zo1OXuOYFwCBzxISzEjt2q3Abd9yU-NJ/pub?gid=1508430174&single=true&output=csv';
const QCM_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRnMUhohCoWDFXkYob051ITZ1tFOlLsmNw5mJxPHrPB7g_RPwhKmyBULgMFQD2droRgam8MsJQ2ORsZ/pub?output=csv';

function parseCSV(text) {
    const rows = [];
    let cur = '';
    let row = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else inQuotes = false;
            } else cur += c;
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ',') { row.push(cur); cur = ''; }
            else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
            else if (c !== '\r') cur += c;
        }
    }
    if (cur || row.length) row.push(cur);
    if (row.length) rows.push(row);
    return rows;
}

async function loadStats() {
    const res = await fetch(CSV_URL + '&t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return parseCSV(await res.text());
}

async function loadThemes() {
    const res = await fetch(QCM_URL + '&t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = parseCSV(await res.text());
    rows.shift();
    const map = {};
    rows.forEach(r => {
        const num = (r[0] || '').trim();
        const theme = (r[1] || 'Inconnu').trim();
        if (num) map[num] = theme;
    });
    return map;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.auth || !auth.getUser()) {
        alert('Vous devez être connecté pour accéder à cette page.');
        window.location.href = 'index.html';
        return;
    }
    const user = auth.getUser();
    if ((user.classe || '').toUpperCase() !== '6E') {
        alert('Cette page est réservée aux 6E.');
        window.location.href = 'index.html';
        return;
    }

    const container = document.getElementById('stats-container');
    let rows, themes;
    try {
        [themes, rows] = await Promise.all([loadThemes(), loadStats()]);
    } catch (e) {
        container.innerHTML = '<p>Impossible de charger les statistiques.</p>';
        return;
    }
    if (!rows.length) {
        container.innerHTML = '<p>Aucune donnée disponible.</p>';
        return;
    }

    const header = rows.shift().map(h => h.trim().toLowerCase());
    const qIdx = header.findIndex(h => h === 'question');
    const sIdx = header.findIndex(h => h === 'score');
    const tIdx = header.findIndex(h => ['timestamp', 'date', 'time'].includes(h));
    if (qIdx === -1 || sIdx === -1 || tIdx === -1) {
        container.innerHTML = '<p>Données invalides.</p>';
        return;
    }

    const histCanvas = document.getElementById('histogram');
    let chart;

    function getWeekNumber(d) {
        const onejan = new Date(d.getFullYear(), 0, 1);
        const diff = d - onejan + (onejan.getTimezoneOffset() - d.getTimezoneOffset()) * 60000;
        return Math.ceil(((diff / 86400000) + onejan.getDay() + 1) / 7);
    }

    function groupRows(period) {
        const map = new Map();
        rows.forEach(r => {
            const d = new Date(r[tIdx]);
            if (isNaN(d)) return;
            let key;
            if (period === 'day') key = d.toISOString().slice(0, 10);
            else {
                key = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
            }
            const entry = map.get(key) || { total: 0, success: 0 };
            entry.total++;
            if (parseFloat(r[sIdx] || '0') > 0) entry.success++;
            map.set(key, entry);
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([key, v]) => ({ key, total: v.total, success: v.success }));
    }
    function formatDate(key) {
        const [year, month, day] = key.split('-');
        return `${day}/${month}`;
    }

    const periodInputs = document.querySelectorAll('input[name="period"]');
    function updateHistogram() {
        const period = document.querySelector('input[name="period"]:checked').value;
        const data = groupRows(period);
        const labels = data.map((d, idx) => period === 'week' ? `S${idx + 1}` : formatDate(d.key));
        const success = data.map(d => d.success);
        const fail = data.map(d => d.total - d.success);
        const chartData = {
            labels,
            datasets: [
                { label: 'Réussies', data: success, backgroundColor: '#0a0' },
                { label: 'Échouées', data: fail, backgroundColor: '#d00' }
            ]
        };
        const options = {
            responsive: true,
            scales: {
                x: { stacked: true, grid: { color: 'rgba(0,0,0,0.1)' } },
                y: { beginAtZero: true, stacked: true, grid: { color: 'rgba(0,0,0,0.1)' }, ticks: { stepSize: 1 } }
            }
        };
        if (chart) {
            chart.data = chartData;
            chart.options = options;
            chart.update();
        } else {
            chart = new Chart(histCanvas, { type: 'bar', data: chartData, options });
        }
    }
    periodInputs.forEach(i => i.addEventListener('change', updateHistogram));
    updateHistogram();

    const goalSection = document.getElementById('goal-container');
    const now = new Date();
    const start = new Date(now);
    start.setHours(now.getHours() < 12 ? 0 : 12, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 12);
    let successCount = 0;
    rows.forEach(r => {
        const d = new Date(r[tIdx]);
        if (d >= start && d < end && parseFloat(r[sIdx] || '0') > 0) successCount++;
    });
    const ratio = Math.min(successCount / 50, 1);
    const goalBox = document.createElement('div');
    goalBox.className = 'filter-box';
    const goalTab = document.createElement('span');
    goalTab.className = 'filter-tab';
    goalTab.textContent = 'Objectif demi-journée';
    goalBox.appendChild(goalTab);
    const progContainer = document.createElement('div');
    progContainer.className = 'progress-container';
    const progBar = document.createElement('div');
    progBar.className = 'progress-bar';
    const progInner = document.createElement('div');
    progInner.className = 'progress-bar-inner';
    progInner.style.width = (ratio * 100) + '%';
    const rCol = Math.round(255 * (1 - ratio));
    const gCol = Math.round(255 * ratio);
    progInner.style.backgroundColor = `rgb(${rCol}, ${gCol}, 0)`;
    progBar.appendChild(progInner);
    progContainer.appendChild(progBar);
    const progInfo = document.createElement('p');
    progInfo.textContent = `${successCount}/50 questions réussies`;
    progContainer.appendChild(progInfo);
    goalBox.appendChild(progContainer);
    goalSection.appendChild(goalBox);

    const stats = {};
    rows.forEach(r => {
        const num = (r[qIdx] || '').trim();
        const theme = themes[num] || 'Inconnu';
        const score = parseFloat(r[sIdx] || '0') || 0;
        if (!stats[theme]) stats[theme] = { count: 0, score: 0 };
        stats[theme].count++;
        stats[theme].score += score;
    });

    container.innerHTML = '';
    Object.entries(stats).forEach(([theme, obj]) => {
        const rate = obj.count ? Math.round((obj.score / obj.count) * 100) : 0;
        const box = document.createElement('div');
        box.className = 'filter-box';
        const tab = document.createElement('span');
        tab.className = 'filter-tab';
        tab.textContent = theme;
        box.appendChild(tab);
        const p1 = document.createElement('p');
        p1.textContent = `Nombre d'apparitions : ${obj.count}`;
        box.appendChild(p1);
        const p2 = document.createElement('p');
        p2.textContent = `Score total : ${obj.score}`;
        box.appendChild(p2);
        const p3 = document.createElement('p');
        p3.textContent = `Taux de réussite : ${rate}%`;
        box.appendChild(p3);

        let smiley = '', messages = [];
        if (rate >= 80) {
            smiley = '😄';
            messages = [
                'Excellent travail, continue ainsi !',
                'Super progression, bravo !',
                'Tu maîtrises ce thème, félicitations !'
            ];
        } else if (rate >= 50) {
            smiley = '🙂';
            messages = [
                'Beau progrès, tu es sur la bonne voie !',
                'Continue comme ça, tu avances bien !',
                'Tu t\'améliores, bravo !'
            ];
        } else {
            smiley = '😟';
            messages = [
                'Ne te décourage pas, tu vas y arriver !',
                'Chaque effort compte, persévère !',
                'Courage, tu progresses à ton rythme !'
            ];
        }
        const message = messages[Math.floor(Math.random() * messages.length)];
        const p4 = document.createElement('p');
        p4.innerHTML = `<span class="smiley">${smiley}</span>${message}`;
        box.appendChild(p4);
        container.appendChild(box);
    });
});
