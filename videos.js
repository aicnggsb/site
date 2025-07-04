// Video page script

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('videos-grid');
    if (!grid) return;
    if (!window.auth || !auth.getUser()) return;
    loadVideos(grid);
});

async function loadVideos(container) {
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRi1sJUVl5z4tPh_spOSkZDMlyhl9OqrEdXp34u3xBYVmnc0YWMPBfurz8tsCv50QMDnckKxeL4ci6l/pub?output=csv';
    try {
        const res = await fetch(SHEET_URL + '&t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        const rows = parseCSV(text);
        if (!rows.length) throw new Error('no data');
        const header = rows.shift().map(h => h.trim().toLowerCase());
        const urlIdx = header.findIndex(h => h === 'url');
        const titleIdx = header.findIndex(h => h.startsWith('titre'));
        const thumbIdx = header.findIndex(h => h.startsWith('mini') || h.includes('thumb'));
        container.classList.add('video-grid');
        rows.forEach(r => {
            const url = (r[urlIdx] || '').trim();
            const title = (r[titleIdx] || '').trim() || url;
            let thumb = thumbIdx !== -1 ? (r[thumbIdx] || '').trim() : '';
            if (!thumb && url.includes('youtu')) {
                const m = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
                if (m) thumb = `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
            }
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            const img = document.createElement('img');
            img.src = thumb || 'background.png';
            img.alt = title;
            const caption = document.createElement('div');
            caption.textContent = title;
            caption.className = 'video-title';
            a.appendChild(img);
            a.appendChild(caption);
            container.appendChild(a);
        });
    } catch (e) {
        container.textContent = 'Impossible de charger les vidéos';
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
