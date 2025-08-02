const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCSH8hh-ykxl1L9joc4opVRARLGfcqi6uTW1bRXyyzsu99zo1OXuOYFwCBzxISzEjt2q3Abd9yU-NJ/pub?gid=1508430174&single=true&output=csv';

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
    let rows;
    try {
        rows = await loadStats();
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
    if (qIdx === -1 || sIdx === -1) {
        container.innerHTML = '<p>Données invalides.</p>';
        return;
    }

    const stats = {};
    rows.forEach(r => {
        const theme = (r[qIdx] || 'Inconnu').trim();
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
        container.appendChild(box);
    });
});
