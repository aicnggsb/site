document.addEventListener('DOMContentLoaded', () => {
  // URL de la feuille Google Sheets publiée au format CSV
  const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/pub?output=csv';
  const classFilter = document.getElementById('class-filter');
  const roleFilter = document.getElementById('role-filter');
  const projectSelect = document.getElementById('project-filter');
  const statusFilter = document.getElementById('status-filter');
  const container = document.getElementById('sheet-container');
  const detailBox = document.getElementById('detail-box');
  let classIdx = -1;
  let roleIdx = -1;
  let projectIdx = -1;
  let dateIdx = -1;
  let detailsIdx = -1;
  let tbody = null;
  let rowElements = [];
  let statusCells = [];
  let rowDates = [];
  let evalFlags = [];
  let domIndex = idx => idx;

  const normalize = str =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  function applyFilters() {
    if (!tbody) return;
    if (detailBox) detailBox.textContent = '';
    const selectedStatuses = Array.from(
      statusFilter.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => cb.value.toLowerCase());
    const selectedClasses = Array.from(
      classFilter.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    const selectedRoles = Array.from(
      roleFilter.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    Array.from(tbody.rows).forEach((tr, idx) => {
      const rowClass =
        classIdx !== -1 ? tr.cells[domIndex(classIdx)].textContent.trim() : '';
      const rowRole =
        roleIdx !== -1 ? tr.cells[domIndex(roleIdx)].textContent.trim() : '';
      const rowProject =
        projectIdx !== -1 ? tr.cells[domIndex(projectIdx)].textContent.trim() : '';
      const rowStatus = statusCells[idx]
        ? statusCells[idx].textContent.toLowerCase().trim()
        : '';
      const classOk = !selectedClasses.length || selectedClasses.includes(rowClass);
      const roleOk = !selectedRoles.length || selectedRoles.includes(rowRole);
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
    detailsIdx = cols.findIndex(c => c && normalize(c) === 'details');

    classIdx = cols.findIndex(c => c && c.toLowerCase().trim() === 'classe');
    roleIdx = cols.findIndex(c => c && normalize(c) === 'role');
    projectIdx = cols.findIndex(c => c && normalize(c) === 'projet');
    dateIdx = cols.findIndex(c => c && normalize(c) === 'date');

    domIndex = idx => (detailsIdx !== -1 && idx > detailsIdx ? idx - 1 : idx);

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
    cols.forEach((label, i) => {
      if (i === detailsIdx) return;
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
    rowDates = [];
    evalFlags = [];
    rows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      row.forEach((cell, colIdx) => {
        if (colIdx === detailsIdx) return;
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      const statusTd = document.createElement('td');
      statusTd.textContent = 'A venir';
      tr.appendChild(statusTd);
      statusCells.push(statusTd);

      if (detailsIdx !== -1) {
        tr.dataset.details = row[detailsIdx] || '';
      }

      if (detailBox) {
        tr.addEventListener('mouseenter', () => {
          detailBox.textContent = tr.dataset.details || '';
        });
        tr.addEventListener('mouseleave', () => {
          detailBox.textContent = '';
        });
      }

      const taskValue = tacheIdx !== -1 ? row[tacheIdx] || '' : '';
      const normalizedTask = normalize(taskValue);
      const hasEval =
        evalIdxs.some(i => row[i] && row[i].trim()) ||
        normalizedTask.includes('evaluation');

      const dateParts =
        dateIdx !== -1 && row[dateIdx] ? row[dateIdx].split('/') : [];
      const date =
        dateParts.length === 3
          ? new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
          : null;
      rowDates.push(date);
      evalFlags.push(hasEval);

      if (hasEval) tr.classList.add('evaluation-row');
      tr.style.animationDelay = `${idx * 50}ms`;
      rowElements.push(tr);
      tbody.appendChild(tr);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    evalFlags.forEach((isEval, idx) => {
      const d = rowDates[idx];
      if (isEval && d && d >= today) {
        rowElements[idx].classList.remove('current-row');
        statusCells[idx].textContent = 'Evaluation';
      }
    });

    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);

    if (classes.length) {
      classFilter.innerHTML = '<span>Filtrer par classe :</span>';
      classes.forEach(cl => {
        const id = 'class-' + normalize(cl).replace(/\s+/g, '-');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.value = cl;
        const lab = document.createElement('label');
        lab.htmlFor = id;
        lab.textContent = cl;
        classFilter.appendChild(cb);
        classFilter.appendChild(lab);
      });
    }

    if (roles.length) {
      roleFilter.innerHTML = '<span>Filtrer par r\u00f4le :</span>';
      roles.forEach(r => {
        const id = 'role-' + normalize(r).replace(/\s+/g, '-');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.value = r;
        const lab = document.createElement('label');
        lab.htmlFor = id;
        lab.textContent = r;
        roleFilter.appendChild(cb);
        roleFilter.appendChild(lab);
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

  classFilter.addEventListener('change', evt => {
    if (evt.target && evt.target.matches('input[type="checkbox"]')) {
      if (evt.target.checked) {
        classFilter
          .querySelectorAll('input[type="checkbox"]')
          .forEach(cb => {
            if (cb !== evt.target) cb.checked = false;
          });
      }
      applyFilters();
    }
  });
  roleFilter.addEventListener('change', evt => {
    if (evt.target && evt.target.matches('input[type="checkbox"]')) {
      applyFilters();
    }
  });
  projectSelect.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', evt => {
    if (evt.target && evt.target.matches('input[type="checkbox"]')) {
      applyFilters();
    }
  });
  loadData();
});
