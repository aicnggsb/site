(function () {
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/pub?output=csv';

    const statusElement = document.getElementById('progression-status');
    const listElement = document.getElementById('progression-steps-list');
    const classFilterElement = document.getElementById('progression-class-filter');
    const showPastElement = document.getElementById('progression-show-past');
    const taskContentElement = document.getElementById('progression-task-content');
    const taskListElement = document.getElementById('progression-task-list');

    if (!statusElement || !listElement || !classFilterElement || !showPastElement) {
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

    function cleanText(value) {
        return (value || '').replace(/\s+/g, ' ').trim();
    }

    function parseBracketContent(text, startIndex = 0) {
        let plainText = '';
        const tasks = [];
        let cursor = startIndex;

        while (cursor < text.length) {
            const char = text[cursor];
            if (char === '[') {
                const nested = parseBracketContent(text, cursor + 1);
                tasks.push({
                    label: cleanText(nested.plainText),
                    subtasks: nested.tasks
                });
                cursor = nested.nextIndex;
                continue;
            }

            if (char === ']') {
                return {
                    plainText,
                    tasks,
                    nextIndex: cursor + 1
                };
            }

            plainText += char;
            cursor += 1;
        }

        return {
            plainText,
            tasks,
            nextIndex: cursor
        };
    }

    function parseSessionDetails(detailsText) {
        const parsed = parseBracketContent(detailsText || '', 0);
        const content = cleanText(parsed.plainText);

        function normalizeTasks(tasks) {
            return tasks
                .map((task) => ({
                    label: cleanText(task.label),
                    subtasks: normalizeTasks(task.subtasks || [])
                }))
                .filter((task) => task.label || task.subtasks.length > 0);
        }

        return {
            content,
            tasks: normalizeTasks(parsed.tasks || [])
        };
    }

    function buildTasksList(tasks) {
        const list = document.createElement('ol');
        list.className = 'task-detail-tasks';

        tasks.forEach((task) => {
            const item = document.createElement('li');
            const label = document.createElement('span');
            label.textContent = task.label || 'Tâche sans titre';
            item.appendChild(label);

            if (task.subtasks && task.subtasks.length) {
                item.appendChild(buildTasksList(task.subtasks));
            }

            list.appendChild(item);
        });

        return list;
    }

    function renderTaskDetail(entry) {
        if (!taskContentElement || !taskListElement) {
            return;
        }

        if (!entry) {
            taskContentElement.className = 'task-detail-empty';
            taskContentElement.textContent = 'Cliquez sur une tâche du planning pour afficher son contenu ici.';
            taskListElement.className = 'task-detail-empty';
            taskListElement.textContent = 'Aucune tâche à afficher.';
            return;
        }

        const details = parseSessionDetails(entry.detailsText || '');

        taskContentElement.className = 'task-detail-description';
        taskContentElement.textContent = details.content || 'Contenu non renseigné.';

        taskListElement.innerHTML = '';
        if (!details.tasks.length) {
            taskListElement.className = 'task-detail-empty';
            taskListElement.textContent = 'Aucune tâche définie.';
            return;
        }

        taskListElement.className = 'task-detail-list-container';
        taskListElement.appendChild(buildTasksList(details.tasks));
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
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
            .filter((entry) => {
                if (showPastElement.checked) return true;
                if (!entry.dateValue) return true;
                return entry.dateValue >= today;
            })
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
            if (normalize(entry.stepText).includes('evaluation')) {
                taskButton.classList.add('calendar-task-button-evaluation');
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

        setStatus('');
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
    showPastElement.addEventListener('change', renderSteps);

    setStatus('Chargement du planning...');
    loadRows().catch((error) => {
        listElement.innerHTML = '';
        setStatus(`Impossible de charger le suivi : ${error.message}`, true);
    });
})();
