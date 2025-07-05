// Video page script

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('videos-grid');
    if (!container) return;
    if (!window.auth || !auth.getUser()) return;
    loadVideos(container);
});

async function loadVideos(container) {
    const SHEET_URL =
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRi1sJUVl5z4tPh_spOSkZDMlyhl9OqrEdXp34u3xBYVmnc0YWMPBfurz8tsCv50QMDnckKxeL4ci6l/pub?output=csv';
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
        const levelIdx = header.findIndex(h => h === 'niveau' || h === 'level');
        const catIdx = header.findIndex(h => h.startsWith('cat'));

        // Regroup data by category first, then by level
        const groups = {};
        rows.forEach(r => {
            const rawLevel = (r[levelIdx] || '').trim();
            const level = rawLevel || 'Autre';
            const cat = ((r[catIdx] || '').trim()) || 'Autre';
            // skip generic categories or levels named "Autre"
            if (cat.toLowerCase().startsWith('autre')) return;
            if (level.toLowerCase().startsWith('autre')) return;
            const url = (r[urlIdx] || '').trim();
            if (!url) return;
            const title = (r[titleIdx] || '').trim() || url;
            let thumb = thumbIdx !== -1 ? (r[thumbIdx] || '').trim() : '';
            if (!thumb && url.includes('youtu')) {
                const m = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
                if (m) thumb = `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
            }
            if (!groups[cat]) groups[cat] = {};
            if (!groups[cat][level]) groups[cat][level] = [];
            groups[cat][level].push({ url, title, thumb });
        });

        container.innerHTML = '';
        const sortLevels = level => {
            const order = ['6e', '5e', '4e', '3e', '2de', '1ere', 'Tle', 'Autre'];
            const idx = order.indexOf(level);
            return idx === -1 ? order.length : idx;
        };

        Object.keys(groups).sort((a, b) => a.localeCompare(b)).forEach(cat => {
            const catBox = document.createElement('div');
            catBox.className = 'video-box';
            const catTitle = document.createElement('h3');
            catTitle.textContent = cat;
            catBox.appendChild(catTitle);

            Object.keys(groups[cat]).sort((a, b) => sortLevels(a) - sortLevels(b)).forEach(level => {
                const levelBox = document.createElement('div');
                levelBox.className = 'video-subbox';
                const levelTitle = document.createElement('h4');
                levelTitle.textContent = level;
                levelBox.appendChild(levelTitle);
                const grid = document.createElement('div');
                grid.className = 'video-grid';

                groups[cat][level].forEach(v => {
                    const a = document.createElement('a');
                    a.href = v.url;
                    a.target = '_blank';
                    const img = document.createElement('img');
                    img.src = v.thumb || 'background.png';
                    img.alt = v.title;
                    const caption = document.createElement('div');
                    caption.textContent = v.title;
                    caption.className = 'video-title';
                    a.appendChild(img);
                    a.appendChild(caption);
                    grid.appendChild(a);
                });

                levelBox.appendChild(grid);
                catBox.appendChild(levelBox);
            });

            container.appendChild(catBox);
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
