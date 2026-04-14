(function () {
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/pub?output=csv';

    const statusElement = document.getElementById('progression-status');
    const listElement = document.getElementById('progression-steps-list');
    const classFilterElement = document.getElementById('progression-class-filter');
    const showPastElement = document.getElementById('progression-show-past');
    const taskContentElement = document.getElementById('progression-task-content');
    const taskListElement = document.getElementById('progression-task-list');
    const taskToggleButtons = Array.from(document.querySelectorAll('.task-toggle-button'));
    const planningToggleCountButton = document.getElementById('progression-toggle-count');
    const importantMessagesPanelElement = document.getElementById('important-messages-panel');
    const importantMessageTextElement = document.getElementById('important-message-text');

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
    let showAllPlanningDates = false;
    let importantMessagesIntervalId = null;
    let currentImportantMessageIndex = 0;

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

    function parseInlineSubtasks(labelText) {
        const parts = (labelText || '')
            .split(';')
            .map((part) => cleanText(part))
            .filter(Boolean);

        if (parts.length < 2 || parts.length % 2 !== 0) {
            return null;
        }

        const parsed = [];
        for (let i = 0; i < parts.length; i += 2) {
            const name = parts[i];
            const durationRaw = parts[i + 1].replace(',', '.');
            const durationMinutes = Number.parseFloat(durationRaw);
            if (!name || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
                return null;
            }
            parsed.push({
                name,
                durationMinutes
            });
        }

        return parsed.length ? parsed : null;
    }

    function formatRemaining(seconds) {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
        const remainingSeconds = String(safeSeconds % 60).padStart(2, '0');
        return `${minutes}:${remainingSeconds}`;
    }

    function createSubtaskTimerCard(subtask) {
        const totalSeconds = Math.round(subtask.durationMinutes * 60);
        let remainingSeconds = totalSeconds;
        let intervalId = null;

        const card = document.createElement('article');
        card.className = 'task-subtask-card';

        const title = document.createElement('h5');
        title.className = 'task-subtask-title';
        title.textContent = subtask.name;

        const timer = document.createElement('p');
        timer.className = 'task-subtask-timer';
        timer.textContent = formatRemaining(remainingSeconds);

        const actions = document.createElement('div');
        actions.className = 'task-subtask-actions';

        const startButton = document.createElement('button');
        startButton.type = 'button';
        startButton.textContent = 'Démarrer';

        const pauseButton = document.createElement('button');
        pauseButton.type = 'button';
        pauseButton.textContent = 'Pause';

        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.textContent = 'Remise à zéro';

        function updateDisplay() {
            timer.textContent = formatRemaining(remainingSeconds);
            const isDone = remainingSeconds <= 0;
            const progressRatio = totalSeconds > 0 ? Math.min(1, Math.max(0, 1 - (remainingSeconds / totalSeconds))) : 0;

            card.style.setProperty('--timer-progress', String(progressRatio));
            card.classList.toggle('task-subtask-card-complete', isDone);
            card.classList.toggle('task-subtask-card-running', Boolean(intervalId) && !isDone);

            startButton.disabled = isDone;
            pauseButton.disabled = !intervalId;
        }

        function stopTimer() {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            updateDisplay();
        }

        startButton.addEventListener('click', () => {
            if (intervalId || remainingSeconds <= 0) {
                return;
            }

            intervalId = setInterval(() => {
                remainingSeconds -= 1;
                if (remainingSeconds <= 0) {
                    remainingSeconds = 0;
                    stopTimer();
                } else {
                    updateDisplay();
                }
            }, 1000);

            updateDisplay();
        });

        pauseButton.addEventListener('click', stopTimer);
        resetButton.addEventListener('click', () => {
            stopTimer();
            remainingSeconds = totalSeconds;
            updateDisplay();
        });

        actions.appendChild(startButton);
        actions.appendChild(pauseButton);
        actions.appendChild(resetButton);

        card.appendChild(title);
        card.appendChild(timer);
        card.appendChild(actions);

        updateDisplay();
        return card;
    }

    function sanitizeSessionHtml(html) {
        const template = document.createElement('template');
        template.innerHTML = html || '';

        template.content.querySelectorAll('script, style, iframe, object, embed').forEach((node) => {
            node.remove();
        });

        template.content.querySelectorAll('*').forEach((element) => {
            Array.from(element.attributes).forEach((attribute) => {
                const attributeName = attribute.name.toLowerCase();
                const attributeValue = (attribute.value || '').trim().toLowerCase();

                if (attributeName.startsWith('on')) {
                    element.removeAttribute(attribute.name);
                    return;
                }

                if ((attributeName === 'href' || attributeName === 'src') && attributeValue.startsWith('javascript:')) {
                    element.removeAttribute(attribute.name);
                }
            });
        });

        return template.innerHTML.trim();
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
        const sourceText = detailsText || '';
        const importantMessages = [];
        const textWithoutMessages = sourceText.replace(/\$([^$]+)\$/g, (_, message) => {
            const cleanedMessage = cleanText(message);
            if (cleanedMessage) {
                importantMessages.push(cleanedMessage);
            }
            return ' ';
        });

        const parsed = parseBracketContent(textWithoutMessages, 0);
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
            tasks: normalizeTasks(parsed.tasks || []),
            importantMessages
        };
    }

    function stopImportantMessagesRotation() {
        if (importantMessagesIntervalId) {
            clearInterval(importantMessagesIntervalId);
            importantMessagesIntervalId = null;
        }
    }

    function renderImportantMessages(messages) {
        if (!importantMessagesPanelElement || !importantMessageTextElement) {
            return;
        }

        stopImportantMessagesRotation();
        currentImportantMessageIndex = 0;

        if (!messages.length) {
            importantMessagesPanelElement.classList.remove('has-important-messages');
            importantMessageTextElement.className = 'important-messages-empty';
            importantMessageTextElement.textContent = 'Aucun message important.';
            return;
        }

        const uniqueMessages = Array.from(new Set(messages));
        importantMessagesPanelElement.classList.add('has-important-messages');
        importantMessageTextElement.className = 'important-messages-content';
        importantMessageTextElement.textContent = uniqueMessages[currentImportantMessageIndex];

        if (uniqueMessages.length > 1) {
            importantMessagesIntervalId = setInterval(() => {
                currentImportantMessageIndex = (currentImportantMessageIndex + 1) % uniqueMessages.length;
                importantMessageTextElement.textContent = uniqueMessages[currentImportantMessageIndex];
            }, 30000);
        }
    }

    function buildTasksList(tasks) {
        const list = document.createElement('ol');
        list.className = 'task-detail-tasks';

        tasks.forEach((task) => {
            const item = document.createElement('li');
            const label = document.createElement('span');
            const inlineSubtasks = parseInlineSubtasks(task.label);

            if (inlineSubtasks) {
                const subtaskGrid = document.createElement('div');
                subtaskGrid.className = 'task-subtasks-grid';
                inlineSubtasks.forEach((subtask) => {
                    subtaskGrid.appendChild(createSubtaskTimerCard(subtask));
                });
                item.appendChild(subtaskGrid);
            } else {
                label.textContent = task.label || 'Tâche sans titre';
                item.appendChild(label);
            }

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
        taskContentElement.innerHTML = sanitizeSessionHtml(details.content) || 'Contenu non renseigné.';

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

        const displayedEntries = showAllPlanningDates ? entries : entries.slice(0, 3);

        if (planningToggleCountButton) {
            planningToggleCountButton.textContent = showAllPlanningDates ? '-' : '+';
            planningToggleCountButton.setAttribute('aria-expanded', String(showAllPlanningDates));
            planningToggleCountButton.title = showAllPlanningDates ? 'Afficher seulement les 3 prochaines dates' : 'Afficher toutes les dates';
        }

        listElement.innerHTML = '';

        if (!displayedEntries.length) {
            renderTaskDetail(null);
            renderImportantMessages([]);
            setStatus('Aucune tâche trouvée.', true);
            return;
        }

        const importantMessages = displayedEntries
            .flatMap((entry) => parseSessionDetails(entry.detailsText || '').importantMessages || []);
        renderImportantMessages(importantMessages);

        displayedEntries.forEach((entry) => {
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

        if (!displayedEntries.some((entry) => getEntryKey(entry) === selectedEntryKey)) {
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


    function setupTaskSectionToggles() {
        taskToggleButtons.forEach((button) => {
            const targetId = button.dataset.toggleTarget;
            const section = button.closest('[data-collapsible-section]');
            const target = targetId ? document.getElementById(targetId) : null;

            if (!section || !target) {
                return;
            }

            button.addEventListener('click', () => {
                const isCollapsed = section.classList.toggle('is-collapsed');
                button.textContent = isCollapsed ? 'Afficher' : 'Masquer';
                button.setAttribute('aria-expanded', String(!isCollapsed));
            });
        });
    }

    classFilterElement.addEventListener('change', renderSteps);
    showPastElement.addEventListener('change', renderSteps);
    planningToggleCountButton?.addEventListener('click', () => {
        showAllPlanningDates = !showAllPlanningDates;
        renderSteps();
    });

    setupTaskSectionToggles();

    setStatus('Chargement du planning...');
    loadRows().catch((error) => {
        listElement.innerHTML = '';
        renderImportantMessages([]);
        setStatus(`Impossible de charger le suivi : ${error.message}`, true);
    });
})();
