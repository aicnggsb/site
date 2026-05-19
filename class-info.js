(function () {
    const TROISIEME_CLASSES = new Set(['3E1', '3E2', '3E3', '3E4', '3E5']);
    const CINQUIEME_CLASSES = new Set(['5E1', '5E2', '5E3', '5E4', '5E5']);

    // Remplacer l'URL par le lien CSV publié du fichier "3E - Techno", onglet "Suivi Eleve 3E".
    // Format attendu : https://docs.google.com/spreadsheets/d/e/<ID>/pub?gid=<GID_ONGLET>&single=true&output=csv
    const SHEET_3E_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgz3Y15bbDovMG-vtfT0rBMeR-BDMfSRZsj_m3vlzsbGybW6xe5qWEfzB7fFCQyHmf9qJ7lMsDIUY6/pub?gid=640829844&single=true&output=csv';
    const SHEET_5E_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQz6hxElwi5l0-KHdWwVo98h8_UHKmPS3_07l7GbaqSAeof2I9U8sUBxm8VkQRbYcAoGQJgDqdpmGXO/pub?gid=1527557223&single=true&output=csv';

    const classNameElement = document.getElementById('selected-class-name');
    const studentsCountElement = document.getElementById('selected-class-students');
    const indicatorBElement = document.getElementById('selected-class-indicator-b');
    const indicatorTElement = document.getElementById('selected-class-indicator-t');
    const indicatorAElement = document.getElementById('selected-class-indicator-a');
    const indicatorT1Element = document.getElementById('selected-class-indicator-t1');
    const indicatorT2Element = document.getElementById('selected-class-indicator-t2');
    const indicatorT3Element = document.getElementById('selected-class-indicator-t3');
    const statusElement = document.getElementById('class-info-status');
    const classFilterElement = document.getElementById('progression-class-filter');
    const generateTeamsButton = document.getElementById('generate-teams-button');
    const teamsPopupElement = document.getElementById('teams-popup');
    const closeTeamsPopupButton = document.getElementById('close-teams-popup');
    const teamsPopupListElement = document.getElementById('teams-popup-list');
    const teamsPopupStatusElement = document.getElementById('teams-popup-status');

    let lastClassStudents = [];

    if (!classNameElement || !studentsCountElement || !indicatorBElement || !indicatorTElement || !indicatorAElement || !indicatorT1Element || !indicatorT2Element || !indicatorT3Element || !statusElement) {
        return;
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

    function normalize(value) {
        return (value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function getSelectedClass() {
        const fromFilter = classFilterElement ? classFilterElement.value.trim() : '';
        const fromStorage = (localStorage.getItem('userClasse') || '').trim();
        return fromFilter || fromStorage;
    }

    function parsePercentage(rawValue) {
        const value = (rawValue || '').trim().replace(/\s/g, '').replace(',', '.').replace('%', '');
        if (!value) {
            return null;
        }
        const parsedValue = Number.parseFloat(value);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    function computeAverage(values) {
        if (!values.length) {
            return null;
        }
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    function parseStudentData(row, idxMap) {
        const name = (row[idxMap.nameIdx] || '').trim();
        return {
            name,
            b: parsePercentage(row[idxMap.indicatorBIdx]),
            t: parsePercentage(row[idxMap.indicatorTIdx]),
            a: parsePercentage(row[idxMap.indicatorAIdx]),
            t1: parsePercentage(row[idxMap.indicatorT1Idx]),
            t2: parsePercentage(row[idxMap.indicatorT2Idx]),
            t3: parsePercentage(row[idxMap.indicatorT3Idx]),
        };
    }

    function buildTeams(students) {
        const teams = Array.from({ length: 6 }, () => []);
        const remaining = students.slice();

        const pickTopPerTeam = (key, scoreFn = (student) => student[key] ?? -1) => {
            const sorted = remaining
                .filter((student) => scoreFn(student) !== -1)
                .sort((lhs, rhs) => scoreFn(rhs) - scoreFn(lhs));

            for (let i = 0; i < teams.length && i < sorted.length; i++) {
                const selected = sorted[i];
                const index = remaining.indexOf(selected);
                if (index !== -1) {
                    teams[i].push(selected);
                    remaining.splice(index, 1);
                }
            }
        };

        pickTopPerTeam('b', (student) => (student.b === null ? -1 : 100 - student.b));
        pickTopPerTeam('t');
        pickTopPerTeam('a');
        pickTopPerTeam('t1');
        pickTopPerTeam('t2');
        pickTopPerTeam('t3');

        const sortByLowestTeamSize = () => teams.map((team, index) => ({ team, index })).sort((lhs, rhs) => lhs.team.length - rhs.team.length);
        for (const student of remaining) {
            const teamEntry = sortByLowestTeamSize()[0];
            teamEntry.team.push(student);
        }

        let changed = true;
        while (changed) {
            changed = false;
            const maxTeam = teams.reduce((prev, curr) => (curr.length > prev.length ? curr : prev), teams[0]);
            const minTeam = teams.reduce((prev, curr) => (curr.length < prev.length ? curr : prev), teams[0]);
            if (maxTeam.length > 6 && minTeam.length < 4) {
                minTeam.push(maxTeam.pop());
                changed = true;
            }
        }

        return teams;
    }

    function createIndicatorsRow(valuesByKey) {
        const row = document.createElement('div');
        row.className = 'class-indicators';

        ['b', 't', 'a', 't1', 't2', 't3'].forEach((key) => {
            const light = document.createElement('span');
            light.className = 'indicator-light';
            light.setAttribute('role', 'img');
            light.setAttribute('aria-label', `Indicateur ${key.toUpperCase()}`);
            setIndicatorLight(light, valuesByKey[key] ?? null);
            row.appendChild(light);
        });

        return row;
    }

    function renderTeams(teams) {
        if (!teamsPopupListElement) {
            return;
        }

        teamsPopupListElement.innerHTML = '';
        teams.forEach((team, index) => {
            const card = document.createElement('article');
            card.className = 'team-card';
            const title = document.createElement('h4');
            title.textContent = `Équipe ${index + 1} (${team.length} élèves)`;

            const teamIndicators = createIndicatorsRow({
                b: computeAverage(team.map((student) => student.b).filter((value) => value !== null)),
                t: computeAverage(team.map((student) => student.t).filter((value) => value !== null)),
                a: computeAverage(team.map((student) => student.a).filter((value) => value !== null)),
                t1: computeAverage(team.map((student) => student.t1).filter((value) => value !== null)),
                t2: computeAverage(team.map((student) => student.t2).filter((value) => value !== null)),
                t3: computeAverage(team.map((student) => student.t3).filter((value) => value !== null)),
            });
            teamIndicators.classList.add('team-indicators');

            const detailsButton = document.createElement('button');
            detailsButton.type = 'button';
            detailsButton.className = 'team-details-button';
            detailsButton.textContent = '+';
            detailsButton.setAttribute('aria-pressed', 'false');

            const detailsPanel = document.createElement('div');
            detailsPanel.className = 'team-details-panel';
            detailsPanel.classList.add('indicators-hidden');

            const detailsList = document.createElement('ul');
            detailsList.className = 'team-students-list';
            team.forEach((student) => {
                const item = document.createElement('li');
                item.className = 'team-student-item';

                const name = document.createElement('span');
                name.textContent = student.name;

                const studentIndicators = createIndicatorsRow({
                    b: student.b,
                    t: student.t,
                    a: student.a,
                    t1: student.t1,
                    t2: student.t2,
                    t3: student.t3
                });
                studentIndicators.classList.add('team-student-indicators');

                item.appendChild(name);
                item.appendChild(studentIndicators);
                detailsList.appendChild(item);
            });

            detailsPanel.appendChild(detailsList);

            detailsButton.addEventListener('click', () => {
                const showIndicators = detailsPanel.classList.toggle('indicators-hidden') === false;
                detailsButton.setAttribute('aria-pressed', String(showIndicators));
                detailsButton.textContent = showIndicators ? '−' : '+';
            });

            card.appendChild(title);
            card.appendChild(teamIndicators);
            card.appendChild(detailsButton);
            card.appendChild(detailsPanel);
            teamsPopupListElement.appendChild(card);
        });
    }


    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function setIndicatorLight(indicatorElement, value) {
        if (!indicatorElement) {
            return;
        }

        if (value === null) {
            indicatorElement.style.setProperty('--indicator-color', '#6b7280');
            indicatorElement.style.setProperty('--indicator-glow', 'rgba(107, 114, 128, 0.45)');
            indicatorElement.title = 'Donnée indisponible';
            return;
        }

        const percent = clamp(value, 0, 100);
        const hue = (percent / 100) * 120;
        const color = `hsl(${hue} 88% 48%)`;
        const glow = `hsl(${hue} 92% 55% / 0.6)`;

        indicatorElement.style.setProperty('--indicator-color', color);
        indicatorElement.style.setProperty('--indicator-glow', glow);
        indicatorElement.title = `${percent.toFixed(1)} %`;
    }

    function getClassConfig(selectedClass) {
        const normalizedClass = (selectedClass || '').toUpperCase().trim();

        if (TROISIEME_CLASSES.has(normalizedClass)) {
            return { level: '3E', csvUrl: SHEET_3E_CSV_URL, sheetLabel: 'Suivi Eleve 3E' };
        }
        if (CINQUIEME_CLASSES.has(normalizedClass)) {
            return { level: '5E', csvUrl: SHEET_5E_CSV_URL, sheetLabel: 'Suivi Eleve 5E' };
        }

        return null;
    }

    async function fetchClassData(selectedClass, classConfig) {
        if (!classConfig || !classConfig.csvUrl) {
            throw new Error('URL CSV non configurée pour cette classe.');
        }

        const response = await fetch(`${classConfig.csvUrl}${classConfig.csvUrl.includes('?') ? '&' : '?'}ts=${Date.now()}`);
        if (!response.ok) {
            throw new Error('Impossible de charger les données élèves.');
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText).filter((row) => row.some((cell) => (cell || '').trim()));
        if (!rows.length) {
            return { studentsCount: 0, averageB: null, averageT: null, averageA: null, averageT1: null, averageT2: null, averageT3: null, students: [] };
        }

        const header = rows[0].map((cell) => normalize(cell));
        const classIdx = header.findIndex((col) => col === 'classe');
        const nameIdx = header.findIndex((col) => col === 'nom');
        const indicatorBIdx = header.findIndex((col) => col === 'b');
        const indicatorTIdx = header.findIndex((col) => col === 't');
        const indicatorAIdx = header.findIndex((col) => col === 'a');
        const indicatorT1Idx = header.findIndex((col) => col === 't1');
        const indicatorT2Idx = header.findIndex((col) => col === 't2');
        const indicatorT3Idx = header.findIndex((col) => col === 't3');

        if (classIdx === -1 || nameIdx === -1 || indicatorBIdx === -1 || indicatorTIdx === -1 || indicatorAIdx === -1 || indicatorT1Idx === -1 || indicatorT2Idx === -1 || indicatorT3Idx === -1) {
            throw new Error('Colonnes attendues introuvables (classe / nom / B / T / A / T1 / T2 / T3).');
        }

        const normalizedSelectedClass = normalize(selectedClass);
        const classRows = rows
            .slice(1)
            .filter((row) => normalize(row[classIdx]) === normalizedSelectedClass && (row[nameIdx] || '').trim());

        const bValues = classRows.map((row) => parsePercentage(row[indicatorBIdx])).filter((value) => value !== null);
        const tValues = classRows.map((row) => parsePercentage(row[indicatorTIdx])).filter((value) => value !== null);
        const aValues = classRows.map((row) => parsePercentage(row[indicatorAIdx])).filter((value) => value !== null);
        const t1Values = classRows.map((row) => parsePercentage(row[indicatorT1Idx])).filter((value) => value !== null);
        const t2Values = classRows.map((row) => parsePercentage(row[indicatorT2Idx])).filter((value) => value !== null);
        const t3Values = classRows.map((row) => parsePercentage(row[indicatorT3Idx])).filter((value) => value !== null);

        const students = classRows.map((row) => parseStudentData(row, {
            nameIdx,
            indicatorBIdx,
            indicatorTIdx,
            indicatorAIdx,
            indicatorT1Idx,
            indicatorT2Idx,
            indicatorT3Idx,
        }));

        return {
            studentsCount: classRows.length,
            averageB: computeAverage(bValues),
            averageT: computeAverage(tValues),
            averageA: computeAverage(aValues),
            averageT1: computeAverage(t1Values),
            averageT2: computeAverage(t2Values),
            averageT3: computeAverage(t3Values),
            students,
        };
    }

    async function refreshClassInfo() {
        const className = getSelectedClass();
        const classConfig = getClassConfig(className);

        classNameElement.textContent = `Classe sélectionnée : ${className || 'Aucune'}`;

        if (!className) {
            studentsCountElement.textContent = 'Effectif : -';
            setIndicatorLight(indicatorBElement, null);
            setIndicatorLight(indicatorTElement, null);
            setIndicatorLight(indicatorAElement, null);
            setIndicatorLight(indicatorT1Element, null);
            setIndicatorLight(indicatorT2Element, null);
            setIndicatorLight(indicatorT3Element, null);
            statusElement.textContent = 'Sélectionnez une classe pour afficher ses informations.';
            return;
        }

        if (!classConfig) {
            studentsCountElement.textContent = 'Effectif : -';
            setIndicatorLight(indicatorBElement, null);
            setIndicatorLight(indicatorTElement, null);
            setIndicatorLight(indicatorAElement, null);
            setIndicatorLight(indicatorT1Element, null);
            setIndicatorLight(indicatorT2Element, null);
            setIndicatorLight(indicatorT3Element, null);
            statusElement.textContent = 'Cette classe ne fait pas partie des classes prises en charge (3E ou 5E).';
            return;
        }

        studentsCountElement.textContent = `Effectif (${classConfig.level}) : Chargement...`;
        setIndicatorLight(indicatorBElement, null);
        setIndicatorLight(indicatorTElement, null);
        setIndicatorLight(indicatorAElement, null);
        setIndicatorLight(indicatorT1Element, null);
        setIndicatorLight(indicatorT2Element, null);
        setIndicatorLight(indicatorT3Element, null);
        statusElement.textContent = `Lecture des données de l'onglet "${classConfig.sheetLabel}"...`;

        try {
            const classData = await fetchClassData(className, classConfig);
            studentsCountElement.textContent = `Effectif (${classConfig.level}) : ${classData.studentsCount} élèves`;
            setIndicatorLight(indicatorBElement, classData.averageB);
            setIndicatorLight(indicatorTElement, classData.averageT);
            setIndicatorLight(indicatorAElement, classData.averageA);
            setIndicatorLight(indicatorT1Element, classData.averageT1);
            setIndicatorLight(indicatorT2Element, classData.averageT2);
            setIndicatorLight(indicatorT3Element, classData.averageT3);
            lastClassStudents = classData.students;
            statusElement.textContent = 'Données chargées avec succès.';
        } catch (error) {
            studentsCountElement.textContent = classConfig ? `Effectif (${classConfig.level}) : -` : 'Effectif : -';
            setIndicatorLight(indicatorBElement, null);
            setIndicatorLight(indicatorTElement, null);
            setIndicatorLight(indicatorAElement, null);
            setIndicatorLight(indicatorT1Element, null);
            setIndicatorLight(indicatorT2Element, null);
            setIndicatorLight(indicatorT3Element, null);
            lastClassStudents = [];
            statusElement.textContent = error instanceof Error ? error.message : 'Erreur lors du chargement des données.';
        }
    }

    if (generateTeamsButton && teamsPopupElement && closeTeamsPopupButton) {
        generateTeamsButton.addEventListener('click', () => {
            if (lastClassStudents.length < 24) {
                teamsPopupStatusElement.textContent = 'Impossible de générer 6 équipes de 4 à 6 élèves avec cet effectif.';
                teamsPopupListElement.innerHTML = '';
                teamsPopupElement.hidden = false;
                return;
            }

            const teams = buildTeams(lastClassStudents);
            const allSizesValid = teams.every((team) => team.length >= 4 && team.length <= 6);
            teamsPopupStatusElement.textContent = allSizesValid
                ? ''
                : 'Certaines équipes sortent de la plage 4-6 élèves.';
            renderTeams(teams);
            teamsPopupElement.hidden = false;
        });

        closeTeamsPopupButton.addEventListener('click', () => {
            teamsPopupElement.hidden = true;
        });

        teamsPopupElement.addEventListener('click', (event) => {
            if (event.target === teamsPopupElement) {
                teamsPopupElement.hidden = true;
            }
        });
    }

    if (classFilterElement) {
        classFilterElement.addEventListener('change', refreshClassInfo);
    }

    window.addEventListener('storage', (event) => {
        if (event.key === 'userClasse') {
            refreshClassInfo();
        }
    });

    refreshClassInfo();
})();
