(function () {
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/pub?output=csv';

    const statusElement = document.getElementById('progression-status');
    const listElement = document.getElementById('progression-steps-list');
    const classFilterElement = document.getElementById('progression-class-filter');
    const taskDetailElement = document.getElementById('progression-task-detail');

    if (!statusElement || !listElement || !classFilterElement) {
        return;
    }

    let allRows = [];
    let classIdx = -1;
    let projectIdx = -1;
    let dateIdx = -1;
    let stepIdx = -1;
    let detailsIdx = -1;
    let selectedEntryKey = '';

    function normalize(value) {
        return (value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function parseCSV(text) {
        const rows = [];
        let current = '';
        let row = [];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuotes) {
                if (char === '"') {
                    if (text[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += char;
                }
            } else if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(current);
                current = '';
            } else if (char === '\n') {
                row.push(current);
                rows.push(row);
                row = [];
                current = '';
            } else if (char !== '\r') {
                current += char;
            }
        }

        if (current || row.length) {
            row.push(current);
        }
        if (row.length) {
            rows.push(row);
        }

        return rows;
    }

    function parseDate(value) {
        const [d, m, y] = (value || '').split('/');
        if (!d || !m || !y) {
            return null;
        }
        const date = new Date(`${y}-${m}-${d}`);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function setStatus(message, isError) {
        statusElement.textContent = message;
        statusElement.classList.toggle('calendar-error', Boolean(isError));
    }

    function formatDetails(entry) {
        return `${entry.classText} - ${entry.stepText}`;
    }

    function getEntryKey(entry) {
        return `${entry.classText}|${entry.projectText}|${entry.dateText}|${entry.stepText}`;
    }

    function renderTaskDetail(entry) {
        if (!taskDetailElement) {
            return;
        }

        if (!entry) {
            taskDetailElement.className = 'task-detail-empty';
            taskDetailElement.textContent = 'Cliquez sur une tâche du planning pour afficher son contenu ici.';
            return;
        }

        const safeDetails = entry.detailsText || 'Détails non renseignés.';

        taskDetailElement.className = '';
        taskDetailElement.innerHTML = `
            <p class="task-detail-description">${safeDetails}</p>
        `;
    }

    function populateClassFilter() {
        const classes = Array.from(
            new Set(
                allRows
                    .map((row) => (row[classIdx] || '').trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b));

        classFilterElement.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'Toutes les classes';
        classFilterElement.appendChild(allOption);

        classes.forEach((className) => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classFilterElement.appendChild(option);
        });
    }

    function renderSteps() {
        const selectedClass = classFilterElement.value;
        const entries = allRows
            .filter((row) => {
                if (!selectedClass) return true;
                return (row[classIdx] || '').trim() === selectedClass;
            })
            .map((row) => ({
                classText: row[classIdx] || 'Classe non renseignée',
                projectText: (row[projectIdx] || '').trim(),
                dateText: row[dateIdx] || '',
                dateValue: parseDate(row[dateIdx]),
                stepText: row[stepIdx] || 'Étape non renseignée',
                detailsText: detailsIdx >= 0 ? (row[detailsIdx] || '').trim() : ''
            }))
            .sort((a, b) => {
                if (!a.dateValue && !b.dateValue) return 0;
                if (!a.dateValue) return 1;
                if (!b.dateValue) return -1;
                return a.dateValue - b.dateValue;
            });

        listElement.innerHTML = '';

        if (!entries.length) {
            renderTaskDetail(null);
            setStatus('Aucune tâche trouvée.', true);
            return;
        }

        entries.forEach((entry) => {
            const item = document.createElement('li');
            const entryKey = getEntryKey(entry);
            const taskButton = document.createElement('button');
            taskButton.type = 'button';
            taskButton.className = 'calendar-task-button';
            if ((entry.stepText || '').toUpperCase().includes('DST')) {
                taskButton.classList.add('calendar-task-button-dst');
            }
            if ((entry.stepText || '').toLowerCase().includes('annul')) {
                taskButton.classList.add('calendar-task-button-cancelled');
            }
            if (entryKey === selectedEntryKey) {
                taskButton.classList.add('active');
            }

            const strong = document.createElement('strong');
            strong.textContent = entry.dateText || 'Date non renseignée';

            const details = document.createElement('div');
            details.textContent = formatDetails(entry);

            taskButton.appendChild(strong);
            taskButton.appendChild(details);
            taskButton.addEventListener('click', () => {
                selectedEntryKey = entryKey;
                renderSteps();
                renderTaskDetail(entry);
            });

            item.appendChild(taskButton);
            listElement.appendChild(item);
        });

        if (!entries.some((entry) => getEntryKey(entry) === selectedEntryKey)) {
            selectedEntryKey = '';
            renderTaskDetail(null);
        }

        setStatus('Planning mis à jour.');
    }

    async function loadRows() {
        let header = [];
        let rows = [];

        try {
            const response = await fetch(`${SHEET_CSV_URL}&ts=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const csvText = await response.text();
            const parsed = parseCSV(csvText);
            if (!parsed.length) {
                throw new Error('Données vides');
            }
            header = parsed.shift() || [];
            rows = parsed;
        } catch (error) {
            const localResponse = await fetch('suivi_projet_data.json');
            const localData = await localResponse.json();
            header = localData.cols || [];
            rows = localData.rows || [];
            setStatus('Google Sheets indisponible : affichage des données locales.', true);
        }

        classIdx = header.findIndex((col) => normalize(col) === 'classe');
        projectIdx = header.findIndex((col) => normalize(col) === 'projet');
        dateIdx = header.findIndex((col) => normalize(col) === 'date');
        stepIdx = header.findIndex((col) => ['tache', 'etape'].includes(normalize(col)));
        detailsIdx = header.findIndex((col) => ['details', 'detail', 'description'].includes(normalize(col)));

        if (classIdx === -1 || projectIdx === -1 || dateIdx === -1 || stepIdx === -1) {
            throw new Error('Colonnes attendues introuvables (classe/projet/date/tache-etape).');
        }

        allRows = rows.filter((row) => row[dateIdx] || row[stepIdx] || row[classIdx] || row[projectIdx]);
        if (!allRows.length) {
            listElement.innerHTML = '';
            setStatus('Aucune donnée trouvée dans le suivi.', true);
            return;
        }
        populateClassFilter();
        renderSteps();
    }

    classFilterElement.addEventListener('change', renderSteps);

    setStatus('Chargement du planning...');
    loadRows().catch((error) => {
        listElement.innerHTML = '';
        setStatus(`Impossible de charger le suivi : ${error.message}`, true);
    });
})();
