document.addEventListener('DOMContentLoaded', () => {
  // URL de la feuille Google Sheets publiée au format CSV
  const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/pub?output=csv';
  const classSelect = document.getElementById('class-filter');
  const roleSelect = document.getElementById('role-filter');
  const projectSelect = document.getElementById('project-filter');
  const statusFilter = document.getElementById('status-filter');
  const container = document.getElementById('sheet-container');
  let classIdx = -1;
  let roleIdx = -1;
  let projectIdx = -1;
  let dateIdx = -1;
  let tbody = null;
  let rowElements = [];
  let statusCells = [];

  const normalize = str =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  function applyFilters() {
    if (!tbody) return;
    const selectedStatuses = Array.from(
      statusFilter.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => cb.value.toLowerCase());
    Array.from(tbody.rows).forEach((tr, idx) => {
      const rowClass =
        classIdx !== -1 ? tr.cells[classIdx].textContent.trim() : '';
      const rowRole = roleIdx !== -1 ? tr.cells[roleIdx].textContent.trim() : '';
      const rowProject =
        projectIdx !== -1 ? tr.cells[projectIdx].textContent.trim() : '';
      const rowStatus = statusCells[idx]
        ? statusCells[idx].textContent.toLowerCase().trim()
        : '';
      const classOk = !classSelect.value || rowClass === classSelect.value;
      const roleOk = !roleSelect.value || rowRole === roleSelect.value;
      const projectOk = !projectSelect.value || rowProject === projectSelect.value;
      const statusOk = !selectedStatuses.length || selectedStatuses.includes(rowStatus);
      tr.style.display = classOk && roleOk && projectOk && statusOk ? '' : 'none';
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
    const url = `${baseUrl}&ts=${Date.now()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resText = await res.text();
      const parsed = parseCSV(resText);
      if (!parsed.length) throw new Error('empty data');
      cols = parsed.shift();
      rows = parsed;
      if (!cols.some(c => c && normalize(c) === 'role')) {
        throw new Error('missing role column');
      }
    } catch (e) {
      const localRes = await fetch('suivi_projet_data.json');
      const localData = await localRes.json();
      cols = localData.cols;
      rows = localData.rows;
    }

    const table = document.createElement('table');
    table.className = 'sheet-table';

    const evalIdxs = cols
      .map((c, i) => (c && c.toLowerCase().includes('evalu') ? i : -1))
      .filter(i => i !== -1);


    const tacheIdx = cols.findIndex(c => c && normalize(c) === 'tache');

    classIdx = cols.findIndex(c => c && c.toLowerCase().trim() === 'classe');
    roleIdx = cols.findIndex(c => c && normalize(c) === 'role');
    projectIdx = cols.findIndex(c => c && normalize(c) === 'projet');
    dateIdx = cols.findIndex(c => c && normalize(c) === 'date');

    const classes = classIdx !== -1
      ? Array.from(new Set(rows.map(r => (r[classIdx] || '').trim()).filter(Boolean))).sort()
      : [];
    const roles = roleIdx !== -1
      ? Array.from(new Set(rows.map(r => (r[roleIdx] || '').trim()).filter(Boolean))).sort()
      : [];
    const projects = projectIdx !== -1
      ? Array.from(new Set(rows.map(r => (r[projectIdx] || '').trim()).filter(Boolean))).sort()
      : [];

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    cols.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    const statusTh = document.createElement('th');
    statusTh.textContent = 'Statut';
    headRow.appendChild(statusTh);
    thead.appendChild(headRow);
    table.appendChild(thead);

    tbody = document.createElement('tbody');
    rowElements = [];
    statusCells = [];
    rows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      const statusTd = document.createElement('td');
      statusTd.textContent = 'A venir';
      tr.appendChild(statusTd);
      statusCells.push(statusTd);

      const taskValue = tacheIdx !== -1 ? row[tacheIdx] || '' : '';
      const normalizedTask = normalize(taskValue);
      const hasEval =
        evalIdxs.some(i => row[i] && row[i].trim()) ||
        normalizedTask.includes('evaluation');

      if (hasEval) tr.classList.add('evaluation-row');
      tr.style.animationDelay = `${idx * 50}ms`;
      rowElements.push(tr);
      tbody.appendChild(tr);
    });

    if (
      dateIdx !== -1 &&
      classIdx !== -1 &&
      roleIdx !== -1 &&
      projectIdx !== -1
    ) {
      const groups = new Map();
      rows.forEach((r, i) => {
        const key = `${r[classIdx]}|${r[projectIdx]}|${r[roleIdx]}`;
        const [d, m, y] = (r[dateIdx] || '').split('/');
        const date = d && m && y ? new Date(`${y}-${m}-${d}`) : null;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ index: i, date });
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const arr of groups.values()) {
        arr.sort((a, b) => a.date - b.date);
        for (let i = 0; i < arr.length; i++) {
          const cur = arr[i];
          const next = arr[i + 1];
          const nextDate = next ? next.date : new Date(8640000000000000);
          if (cur.date && nextDate && cur.date < today && nextDate < today) {
            rowElements[cur.index].classList.add('completed-row');
            statusCells[cur.index].textContent = 'Terminée';
          } else if (cur.date && nextDate && cur.date <= today && nextDate > today) {
            rowElements[cur.index].classList.add('current-row');
            statusCells[cur.index].textContent = 'En cours';
          }
        }
      }
    }
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);

    if (classes.length) {
      Array.from(classSelect.querySelectorAll('option:not(:first-child)')).forEach(o => o.remove());
      classes.forEach(cl => {
        const opt = document.createElement('option');
        opt.value = cl;
        opt.textContent = cl;
        classSelect.appendChild(opt);
      });
    }

    if (roles.length) {
      Array.from(roleSelect.querySelectorAll('option:not(:first-child)')).forEach(o => o.remove());
      roles.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        roleSelect.appendChild(opt);
      });
    }

    if (projects.length) {
      Array.from(projectSelect.querySelectorAll('option:not(:first-child)')).forEach(o => o.remove());
      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        projectSelect.appendChild(opt);
      });
    }

    applyFilters();
  }

  classSelect.addEventListener('change', applyFilters);
  roleSelect.addEventListener('change', applyFilters);
  projectSelect.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', evt => {
    if (evt.target && evt.target.matches('input[type="checkbox"]')) {
      applyFilters();
    }
  });
  loadData();
  setInterval(loadData, 60000);
});
