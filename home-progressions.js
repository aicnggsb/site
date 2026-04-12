(function () {
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/pub?output=csv';

    const classSelect = document.getElementById('progression-classe');
    const projectSelect = document.getElementById('progression-projet');
    const statusElement = document.getElementById('progression-status');
    const listElement = document.getElementById('progression-steps-list');

    if (!classSelect || !projectSelect || !statusElement || !listElement) {
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

    function fillSelect(select, values) {
        select.innerHTML = '';
        values.forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
        select.disabled = values.length === 0;
    }

    function renderSteps() {
        const selectedClass = classSelect.value;
        const selectedProject = projectSelect.value;

        const filtered = allRows
            .filter((row) => row[classIdx] === selectedClass && row[projectIdx] === selectedProject)
            .map((row) => ({
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

        if (!filtered.length) {
            setStatus('Aucune étape trouvée pour cette sélection.', true);
            return;
        }

        filtered.forEach((entry) => {
            const item = document.createElement('li');
            const strong = document.createElement('strong');
            strong.textContent = entry.dateText || 'Date non renseignée';

            const details = document.createElement('div');
            details.textContent = `Étape : ${entry.stepText}`;

            item.appendChild(strong);
            item.appendChild(details);
            listElement.appendChild(item);
        });

        setStatus(`${filtered.length} étape(s) affichée(s).`);
    }

    function updateProjects() {
        const selectedClass = classSelect.value;
        const projects = Array.from(
            new Set(
                allRows
                    .filter((row) => row[classIdx] === selectedClass)
                    .map((row) => row[projectIdx])
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b, 'fr'));

        fillSelect(projectSelect, projects);
        if (projects.length) {
            projectSelect.value = projects[0];
            renderSteps();
        } else {
            listElement.innerHTML = '';
            setStatus('Aucun projet disponible pour cette classe.', true);
        }
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

        allRows = rows.filter((row) => row[classIdx] && row[projectIdx]);

        const classes = Array.from(new Set(allRows.map((row) => row[classIdx]))).sort((a, b) =>
            a.localeCompare(b, 'fr')
        );

        fillSelect(classSelect, classes);
        if (!classes.length) {
            setStatus('Aucune classe trouvée dans le suivi.', true);
            return;
        }

        classSelect.value = classes[0];
        updateProjects();

        setStatus('Sélectionnez une classe et un projet.');
    }

    classSelect.addEventListener('change', updateProjects);
    projectSelect.addEventListener('change', renderSteps);

    setStatus('Chargement du suivi des progressions...');
    loadRows().catch((error) => {
        listElement.innerHTML = '';
        setStatus(`Impossible de charger le suivi : ${error.message}`, true);
    });
})();
