document.addEventListener('DOMContentLoaded', async () => {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/gviz/tq?gid=0&pub=1&tqx=out:json';
  try {
    const res = await fetch(url);
    const text = await res.text();
    const m = text.match(/setResponse\(([^)]+)\)/);
    if (!m) throw new Error('Bad response');
    const data = JSON.parse(m[1]);
    const cols = data.table.cols.map(c => c.label);
    const rows = data.table.rows;

    const table = document.createElement('table');
    table.className = 'sheet-table';

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
    rows.forEach(r => {
      const tr = document.createElement('tr');
      cols.forEach((_, i) => {
        const td = document.createElement('td');
        td.textContent = r.c[i] ? r.c[i].v : '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const container = document.getElementById('sheet-container');
    container.innerHTML = '';
    container.appendChild(table);
  } catch (e) {
    const container = document.getElementById('sheet-container');
    container.textContent = 'Erreur de chargement des données';
  }
});
