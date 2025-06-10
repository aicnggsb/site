document.addEventListener('DOMContentLoaded', () => {
  // URL de la feuille Google Sheets publiée au format CSV
  const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/pub?output=csv';
  const select = document.getElementById('class-filter');
  const container = document.getElementById('sheet-container');
  const rawContainer = document.getElementById('csv-raw');
  let classIdx = -1;
  let tbody = null;
  let rawText = '';

  function applyClassFilter(value) {
    if (!tbody || classIdx === -1) return;
    Array.from(tbody.rows).forEach(tr => {
      const rowClass = tr.cells[classIdx].textContent;
      tr.style.display = !value || rowClass === value ? '' : 'none';
    });
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
        } else {
          cur += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          row.push(cur);
          cur = '';
        } else if (c === '\n') {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = '';
        } else if (c !== '\r') {
          cur += c;
        }
      }
    }
    if (cur || row.length) row.push(cur);
    if (row.length) rows.push(row);
    return rows;
  }

  async function loadData() {
    let cols, rows;
    rawText = '';
    const url = `${baseUrl}&ts=${Date.now()}`;
    try {
      const res = await fetch(url);
      rawText = await res.text();
      const parsed = parseCSV(rawText);
      cols = parsed.shift();
      rows = parsed;
    } catch (e) {
      const localRes = await fetch('suivi_projet_data.json');
      const localData = await localRes.json();
      cols = localData.cols;
      rows = localData.rows;
    }

    const table = document.createElement('table');
    table.className = 'sheet-table';

    classIdx = cols.findIndex(c => c && c.toLowerCase().trim() === 'classe');
    const classes = classIdx !== -1
      ? Array.from(new Set(rows.map(r => (r[classIdx] || '').trim()).filter(Boolean))).sort()
      : [];

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    cols.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    tbody = document.createElement('tbody');
    rows.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);

    if (rawText) {
      rawContainer.textContent = rawText;
      rawContainer.style.display = 'block';
    } else {
      rawContainer.style.display = 'none';
    }

    if (classes.length) {
      Array.from(select.querySelectorAll('option:not(:first-child)')).forEach(o => o.remove());
      classes.forEach(cl => {
        const opt = document.createElement('option');
        opt.value = cl;
        opt.textContent = cl;
        select.appendChild(opt);
      });
      applyClassFilter(select.value);
    }
  }

  select.addEventListener('change', () => applyClassFilter(select.value));
  loadData();
  setInterval(loadData, 60000);
});
