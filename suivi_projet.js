document.addEventListener('DOMContentLoaded', async () => {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/gviz/tq?gid=0&pub=1&tqx=out:json';
  let cols, rows;
  try {
    const res = await fetch(url);
    const text = await res.text();
    const m = text.match(/setResponse\(([^)]+)\)/);
    if (!m) throw new Error('Bad response');
    const data = JSON.parse(m[1]);
    cols = data.table.cols.map(c => c.label);
    rows = data.table.rows.map(r => r.c.map(c => (c ? c.v : '')));
  } catch (e) {
    const localRes = await fetch('suivi_projet_data.json');
    const localData = await localRes.json();
    cols = localData.cols;
    rows = localData.rows;
  }

  const table = document.createElement('table');
  table.className = 'sheet-table';

  // Determine index of the "Classe" column for filtering (case insensitive)
  const classIdx = cols.findIndex(c => c && c.toLowerCase().trim() === 'classe');
  const classes = classIdx !== -1
    ? Array.from(new Set(rows
        .map(r => (r[classIdx] || '').trim())
        .filter(Boolean)))
        .sort()
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

  const tbody = document.createElement('tbody');
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

  const container = document.getElementById('sheet-container');
  container.innerHTML = '';

  // Build the class filter if the "Classe" column exists
  if (classes.length) {
    const select = document.getElementById('class-filter');
    classes.forEach(cl => {
      const opt = document.createElement('option');
      opt.value = cl;
      opt.textContent = cl;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      const value = select.value;
      Array.from(tbody.rows).forEach(tr => {
        const rowClass = tr.cells[classIdx].textContent;
        tr.style.display = !value || rowClass === value ? '' : 'none';
      });
    });
  }

  container.appendChild(table);
});
