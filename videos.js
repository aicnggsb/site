// Video page script

document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('videos-table');
    if (!table) return;
    if (!window.auth || !auth.getUser()) return;
    loadVideos(table);
});

async function loadVideos(table) {
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRi1sJUVl5z4tPh_spOSkZDMlyhl9OqrEdXp34u3xBYVmnc0YWMPBfurz8tsCv50QMDnckKxeL4ci6l/pub?output=csv';
    try {
        const res = await fetch(SHEET_URL + '&t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        const rows = parseCSV(text);
        if (!rows.length) throw new Error('no data');
        const header = rows.shift().map(h => h.trim().toLowerCase());
        const classIdx = header.findIndex(h => h.startsWith('classe'));
        const urlIdx = header.findIndex(h => h === 'url');
        const titleIdx = header.findIndex(h => h.startsWith('titre'));
        const catIdx = header.findIndex(h => h.startsWith('cat'));
        const tbody = document.createElement('tbody');
        rows.forEach(r => {
            const tr = document.createElement('tr');
            const tdClass = document.createElement('td');
            tdClass.textContent = (r[classIdx] || '').trim();
            const tdTitle = document.createElement('td');
            const a = document.createElement('a');
            a.href = (r[urlIdx] || '').trim();
            a.textContent = (r[titleIdx] || '').trim() || a.href;
            a.target = '_blank';
            tdTitle.appendChild(a);
            const tdCat = document.createElement('td');
            tdCat.textContent = (r[catIdx] || '').trim();
            tr.appendChild(tdClass);
            tr.appendChild(tdTitle);
            tr.appendChild(tdCat);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
    } catch (e) {
        table.textContent = 'Impossible de charger les vidéos';
    }
}

function parseCSV(text) {
    const rows = [];
    let cur = '';
    let row = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else { cur += c; }
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
