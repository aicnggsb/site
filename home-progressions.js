(function () {
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/pub?output=csv';

    const statusElement = document.getElementById('progression-status');
    const listElement = document.getElementById('progression-steps-list');
    const classFilterElement = document.getElementById('progression-class-filter');

    if (!statusElement || !listElement || !classFilterElement) {
        return;
    }

    let allRows = [];
    let classIdx = -1;
    let projectIdx = -1;
    let dateIdx = -1;
    let stepIdx = -1;

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
        const parts = [entry.classText];
        if (entry.projectText) {
            parts.push(entry.projectText);
        }
        parts.push(`Étape : ${entry.stepText}`);
        return parts.join(' — ');
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
                stepText: row[stepIdx] || 'Étape non renseignée'
            }))
            .sort((a, b) => {
                if (!a.dateValue && !b.dateValue) return 0;
                if (!a.dateValue) return 1;
                if (!b.dateValue) return -1;
                return a.dateValue - b.dateValue;
            });

        listElement.innerHTML = '';

        if (!entries.length) {
            setStatus('Aucune étape trouvée.', true);
            return;
        }

        entries.forEach((entry) => {
            const item = document.createElement('li');
            const strong = document.createElement('strong');
            strong.textContent = entry.dateText || 'Date non renseignée';

            const details = document.createElement('div');
            details.textContent = formatDetails(entry);

            item.appendChild(strong);
            item.appendChild(details);
            listElement.appendChild(item);
        });

        setStatus(`${entries.length} étape(s) affichée(s).`);
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
