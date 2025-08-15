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

function parseDate(str) {
    const d = new Date(str);
    if (!isNaN(d)) return d;
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
        const [, day, month, year, hh = '0', mm = '0', ss = '0'] = m;
        return new Date(+year, +month - 1, +day, +hh, +mm, +ss);
    }
    return null;
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
    const pIdx = header.findIndex(h => h === 'pseudo');
    const qIdx = header.findIndex(h => h === 'question');
    const sIdx = header.findIndex(h => h === 'score');
    const tIdx = header.findIndex(h => ['timestamp', 'date', 'time'].includes(h));
    if (pIdx === -1 || qIdx === -1 || sIdx === -1 || tIdx === -1) {
        container.innerHTML = '<p>Données invalides.</p>';
        return;
    }

    let globalMinDate = null;
    rows.forEach(r => {
        const d = parseDate(r[tIdx]);
        if (d && (!globalMinDate || d < globalMinDate)) globalMinDate = d;
    });
    if (globalMinDate) globalMinDate.setHours(0, 0, 0, 0);

    rows = rows.filter(r => (r[pIdx] || '').trim().toLowerCase() === user.pseudo.toLowerCase());
    if (!rows.length) {
        container.innerHTML = '<p>Aucune donnée disponible.</p>';
        return;
    }

    const histCanvas = document.getElementById('histogram');
    histCanvas.width = 400;
    histCanvas.height = 300;
    let chart;

    function getWeekNumber(d) {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7; // Lundi=1, Dimanche=7
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    }

    function groupRows(period, srcRows = rows, startDate = globalMinDate) {
        const map = new Map();
        srcRows.forEach(r => {
            const d = parseDate(r[tIdx]);
            if (!d) return;
            let key;
            if (period === 'day') key = d.toISOString().slice(0, 10);
            else {
                key = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
            }
            const entry = map.get(key) || { success: 0, fail: 0 };
            if (parseFloat(r[sIdx] || '0') === 1) entry.success++;
            else entry.fail++;
            map.set(key, entry);
        });
        if (!startDate) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = [];
        if (period === 'day') {
            for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
                const key = d.toISOString().slice(0, 10);
                const v = map.get(key) || { success: 0, fail: 0 };
                result.push({ key, success: v.success, fail: v.fail });
            }
        } else {
            let year = startDate.getFullYear();
            let week = getWeekNumber(startDate);
            const endYear = today.getFullYear();
            const endWeek = getWeekNumber(today);
            while (year < endYear || (year === endYear && week <= endWeek)) {
                const key = `${year}-W${String(week).padStart(2, '0')}`;
                const v = map.get(key) || { success: 0, fail: 0 };
                result.push({ key, success: v.success, fail: v.fail });
                week++;
                const weeksInYear = getWeekNumber(new Date(year, 11, 31));
                if (week > weeksInYear) { week = 1; year++; }
            }
        }
        return result;
    }
    function formatDate(key) {
        const [year, month, day] = key.split('-');
        return `${day}/${month}`;
    }

    const periodInputs = document.querySelectorAll('input[name="period"]');
    function updateHistogram() {
        const period = document.querySelector('input[name="period"]:checked').value;
        const data = groupRows(period);
        const labels = data.map(d => period === 'week' ? `S${d.key.slice(-2)}` : formatDate(d.key));
        const success = data.map(d => d.success);
        const fail = data.map(d => d.fail);
        const chartData = {
            labels,
            datasets: [
                { label: 'Réussies', data: success, backgroundColor: '#0a0' },
                { label: 'Échouées', data: fail, backgroundColor: '#d00' }
            ]
        };
        const options = {
            responsive: false,
            maintainAspectRatio: false,
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

    const stats = {};
    rows.forEach(r => {
        const num = (r[qIdx] || '').trim();
        const theme = themes[num] || 'Inconnu';
        const score = parseFloat(r[sIdx] || '0') || 0;
        if (!stats[theme]) stats[theme] = { count: 0, score: 0, rows: [] };
        stats[theme].count++;
        stats[theme].score += score;
        stats[theme].rows.push(r);
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

        const miniCanvas = document.createElement('canvas');
        miniCanvas.className = 'mini-histogram';
        miniCanvas.width = 400;
        miniCanvas.height = 300;
        box.appendChild(miniCanvas);
        const themeData = groupRows('day', obj.rows);
        const miniLabels = themeData.map(d => formatDate(d.key));
        const miniSuccess = themeData.map(d => d.success);
        const miniFail = themeData.map(d => d.fail);
        new Chart(miniCanvas, {
            type: 'bar',
            data: {
                labels: miniLabels,
                datasets: [
                    { data: miniSuccess, backgroundColor: '#0a0' },
                    { data: miniFail, backgroundColor: '#d00' }
                ]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { stacked: true, grid: { color: 'rgba(0,0,0,0.1)' } },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });

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
