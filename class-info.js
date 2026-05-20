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
    const saveTeamsButton = document.getElementById('save-teams-button');
    const loadTeamsButton = document.getElementById('load-teams-button');
    const classBMinusButton = document.getElementById('class-bminus-button');
    const classTMinusButton = document.getElementById('class-tminus-button');
    const exportBminusCsvButton = document.getElementById('export-bminus-csv-button');
    const TEAMS_COOKIE_PREFIX = 'savedTeams_';
    const SESSION_SCORES_COOKIE_PREFIX = 'sessionScores_';

    let lastClassStudents = [];
    let currentTeams = [];

    if (!classNameElement || !studentsCountElement || !indicatorBElement || !indicatorTElement || !indicatorAElement || !indicatorT1Element || !indicatorT2Element || !indicatorT3Element) {
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

    function getIndicatorDisplayConfig(key) {
        if (['t1', 't2', 't3'].includes(key)) {
            return { maxValue: 20, suffix: '/20' };
        }
        return { maxValue: 100, suffix: '%' };
    }

    function buildTeams(students) {
        const TEAM_COUNT = 6;
        const METRICS = ['b', 't', 'a', 't1', 't2', 't3'];
        const teams = Array.from({ length: TEAM_COUNT }, () => []);
        const remaining = students.slice();

        const totalStudents = students.length;
        const teamTargetSizes = Array.from({ length: TEAM_COUNT }, (_, index) => {
            const minBase = Math.floor(totalStudents / TEAM_COUNT);
            return minBase + (index < totalStudents % TEAM_COUNT ? 1 : 0);
        });

        const globalAverages = METRICS.reduce((acc, key) => {
            acc[key] = computeAverage(
                students
                    .map((student) => student[key])
                    .filter((value) => value !== null),
            );
            return acc;
        }, {});

        const metricGapAfterAssign = (team, key, candidateValue) => {
            const currentValues = team
                .map((student) => student[key])
                .filter((value) => value !== null);
            const baseline = currentValues.length > 0 ? computeAverage(currentValues) : globalAverages[key];
            if (baseline === null || candidateValue === null || globalAverages[key] === null) {
                return 0;
            }

            const nextAverage = ((baseline * currentValues.length) + candidateValue) / (currentValues.length + 1);
            return Math.abs(nextAverage - globalAverages[key]);
        };

        const scoreCandidateForTeam = (student, teamIndex) => {
            const team = teams[teamIndex];
            const sizePenalty = team.length / Math.max(teamTargetSizes[teamIndex], 1);
            const metricsPenalty = METRICS.reduce((sum, key) => sum + metricGapAfterAssign(team, key, student[key]), 0);
            return (sizePenalty * 5) + metricsPenalty;
        };

        const bavards = remaining
            .filter((student) => student.b !== null)
            .sort((lhs, rhs) => rhs.b - lhs.b)
            .slice(0, TEAM_COUNT);

        bavards.forEach((student, index) => {
            teams[index].push(student);
            const remainingIndex = remaining.indexOf(student);
            if (remainingIndex !== -1) {
                remaining.splice(remainingIndex, 1);
            }
        });

        const assignmentOrder = remaining
            .slice()
            .sort((lhs, rhs) => {
                const lhsKnown = METRICS.filter((key) => lhs[key] !== null).length;
                const rhsKnown = METRICS.filter((key) => rhs[key] !== null).length;
                return rhsKnown - lhsKnown;
            });

        assignmentOrder.forEach((student) => {
            let bestTeamIndex = 0;
            let bestScore = Number.POSITIVE_INFINITY;

            for (let i = 0; i < TEAM_COUNT; i++) {
                if (teams[i].length >= teamTargetSizes[i]) {
                    continue;
                }

                const score = scoreCandidateForTeam(student, i);
                if (score < bestScore) {
                    bestScore = score;
                    bestTeamIndex = i;
                }
            }

            teams[bestTeamIndex].push(student);
        });

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
            setIndicatorLight(light, valuesByKey[key] ?? null, getIndicatorDisplayConfig(key));
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
            const teamHeader = document.createElement('div');
            teamHeader.className = 'card-header-with-toggle';
            const title = document.createElement('h4');
            title.textContent = `Équipe ${index + 1} (${team.length} élèves)`;
            teamHeader.appendChild(title);

            const teamBMinusButton = document.createElement('button');
            teamBMinusButton.type = 'button';
            teamBMinusButton.className = 'team-details-button';
            teamBMinusButton.textContent = 'B-';
            teamBMinusButton.title = 'Enregistrer B- pour toute l’équipe (séance en cours)';
            teamBMinusButton.addEventListener('click', () => {
                team.forEach((student) => updateSessionScore(student.name, 'b', -1));
            });
            teamHeader.appendChild(teamBMinusButton);
            const teamTPlusButton = document.createElement('button');
            teamTPlusButton.type = 'button';
            teamTPlusButton.className = 'team-details-button';
            teamTPlusButton.textContent = 'T+';
            teamTPlusButton.addEventListener('click', () => {
                team.forEach((student) => updateSessionScore(student.name, 't', 1));
            });
            teamHeader.appendChild(teamTPlusButton);
            const teamTMinusButton = document.createElement('button');
            teamTMinusButton.type = 'button';
            teamTMinusButton.className = 'team-details-button';
            teamTMinusButton.textContent = 'T-';
            teamTMinusButton.addEventListener('click', () => {
                team.forEach((student) => updateSessionScore(student.name, 't', -1));
            });
            teamHeader.appendChild(teamTMinusButton);

            const teamIndicators = createIndicatorsRow({
                b: computeAverage(team.map((student) => student.b).filter((value) => value !== null)),
                t: computeAverage(team.map((student) => student.t).filter((value) => value !== null)),
                a: computeAverage(team.map((student) => student.a).filter((value) => value !== null)),
                t1: computeAverage(team.map((student) => student.t1).filter((value) => value !== null)),
                t2: computeAverage(team.map((student) => student.t2).filter((value) => value !== null)),
                t3: computeAverage(team.map((student) => student.t3).filter((value) => value !== null)),
            });
            teamIndicators.classList.add('team-indicators');
            title.dataset.teamIndex = String(index);
            card.dataset.teamIndex = String(index);

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
            detailsList.classList.add('hide-action-buttons');
            detailsList.dataset.teamIndex = String(index);
            detailsList.addEventListener('dragover', (event) => {
                event.preventDefault();
                detailsList.classList.add('drag-target-active');
            });
            detailsList.addEventListener('dragleave', () => {
                detailsList.classList.remove('drag-target-active');
            });
            detailsList.addEventListener('drop', (event) => {
                event.preventDefault();
                detailsList.classList.remove('drag-target-active');
                const sourceTeamIndex = Number.parseInt(event.dataTransfer?.getData('text/sourceTeam') || '', 10);
                const studentName = event.dataTransfer?.getData('text/studentName') || '';
                if (!studentName || !Number.isInteger(sourceTeamIndex) || sourceTeamIndex === index) {
                    return;
                }
                moveStudentBetweenTeams(sourceTeamIndex, index, studentName);
            });
            team.forEach((student) => {
                const item = document.createElement('li');
                item.className = 'team-student-item';
                item.draggable = true;
                item.addEventListener('dragstart', (event) => {
                    event.dataTransfer?.setData('text/sourceTeam', String(index));
                    event.dataTransfer?.setData('text/studentName', student.name);
                });

                const name = document.createElement('span');
                name.textContent = student.name;
                const studentBMinusButton = document.createElement('button');
                studentBMinusButton.type = 'button';
                studentBMinusButton.className = 'team-details-button';
                studentBMinusButton.textContent = 'B-';
                studentBMinusButton.title = `Enregistrer B- pour ${student.name} (séance en cours)`;
                studentBMinusButton.addEventListener('click', () => {
                    updateSessionScore(student.name, 'b', -1);
                });
                const studentTPlusButton = document.createElement('button');
                studentTPlusButton.type = 'button';
                studentTPlusButton.className = 'team-details-button';
                studentTPlusButton.textContent = 'T+';
                studentTPlusButton.addEventListener('click', () => updateSessionScore(student.name, 't', 1));
                const studentTMinusButton = document.createElement('button');
                studentTMinusButton.type = 'button';
                studentTMinusButton.className = 'team-details-button';
                studentTMinusButton.textContent = 'T-';
                studentTMinusButton.addEventListener('click', () => updateSessionScore(student.name, 't', -1));

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
                item.appendChild(studentBMinusButton);
                item.appendChild(studentTPlusButton);
                item.appendChild(studentTMinusButton);
                item.appendChild(studentIndicators);
                detailsList.appendChild(item);
            });

            detailsPanel.appendChild(detailsList);

            detailsButton.addEventListener('click', () => {
                const showIndicators = detailsPanel.classList.toggle('indicators-hidden') === false;
                detailsButton.setAttribute('aria-pressed', String(showIndicators));
                detailsButton.textContent = showIndicators ? '−' : '+';
                detailsList.classList.toggle('hide-action-buttons', showIndicators);
            });

            card.appendChild(teamHeader);
            card.appendChild(teamIndicators);
            card.appendChild(detailsButton);
            card.appendChild(detailsPanel);
            teamsPopupListElement.appendChild(card);
        });
    }

    function getSessionDateKey() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function getSessionScoresCookieName() {
        const selectedClass = (getSelectedClass() || 'inconnue').toUpperCase().trim();
        return `${SESSION_SCORES_COOKIE_PREFIX}${selectedClass}_${getSessionDateKey()}`;
    }

    function getSessionScoresMap() {
        const raw = getCookie(getSessionScoresCookieName());
        if (!raw) {
            return {};
        }
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function saveSessionScoresMap(sessionMap) {
        setCookie(getSessionScoresCookieName(), JSON.stringify(sessionMap), 30);
    }

    function updateSessionScore(studentName, indicator, delta) {
        if (!studentName || !['b', 't'].includes(indicator)) {
            return;
        }
        const sessionMap = getSessionScoresMap();
        if (!sessionMap[studentName] || typeof sessionMap[studentName] !== 'object') {
            sessionMap[studentName] = { b: 0, t: 0 };
        }
        sessionMap[studentName][indicator] = (Number(sessionMap[studentName][indicator]) || 0) + delta;
        saveSessionScoresMap(sessionMap);
    }

    function renderSessionTable() {
        const sessionMap = getSessionScoresMap();
        const rows = Object.entries(sessionMap).sort((lhs, rhs) => lhs[0].localeCompare(rhs[0], 'fr'));
        const sessionDate = getSessionDateKey();
        const selectedClass = (getSelectedClass() || 'inconnue').toUpperCase().trim();
        const viewWindow = window.open('', '_blank');
        if (!viewWindow) {
            teamsPopupStatusElement.textContent = 'Impossible d’ouvrir la fenêtre du tableau (popup bloquée).';
            return;
        }
        const tableRows = rows.length ? rows.map(([name, scores]) => {
            const b = Number(scores.b) || 0;
            const t = Number(scores.t) || 0;
            const bHue = ((clamp(b, -5, 5) + 5) / 10) * 120;
            const tHue = ((clamp(t, -5, 5) + 5) / 10) * 120;
            return `<tr><td>${name}</td><td style="background:hsl(${bHue} 90% 50% / .2);color:hsl(${bHue} 90% 38%)">${b}</td><td style="background:hsl(${tHue} 90% 50% / .2);color:hsl(${tHue} 90% 38%)">${t}</td></tr>`;
        }).join('') : '<tr><td colspan="3">Aucune donnée de séance.</td></tr>';
        viewWindow.document.write(`<html><head><title>Tableau séance ${selectedClass}</title><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%;max-width:680px}th,td{border:1px solid #ccc;padding:8px 10px}th{background:#111827;color:#fff;text-align:left}</style></head><body><h3>Tableau séance ${selectedClass} (${sessionDate})</h3><p>Copiez-collez ce tableau dans Excel ou Google Sheets.</p><table><thead><tr><th>Nom</th><th>B</th><th>T</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`);
        viewWindow.document.close();
    }

    function updateTeamStatusMessage() {
        const allSizesValid = currentTeams.every((team) => team.length >= 4 && team.length <= 6);
        teamsPopupStatusElement.textContent = allSizesValid
            ? ''
            : 'Certaines équipes sortent de la plage 4-6 élèves.';
    }

    function moveStudentBetweenTeams(sourceTeamIndex, targetTeamIndex, studentName) {
        const sourceTeam = currentTeams[sourceTeamIndex];
        const targetTeam = currentTeams[targetTeamIndex];
        if (!sourceTeam || !targetTeam) {
            return;
        }
        const studentIndex = sourceTeam.findIndex((student) => student.name === studentName);
        if (studentIndex === -1) {
            return;
        }
        const [student] = sourceTeam.splice(studentIndex, 1);
        targetTeam.push(student);
        renderTeams(currentTeams);
        updateTeamStatusMessage();
    }

    function setCookie(name, value, days = 30) {
        const expires = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    }

    function getCookie(name) {
        const prefix = `${name}=`;
        const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
        return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
    }


    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function setIndicatorLight(indicatorElement, value, options = {}) {
        if (!indicatorElement) {
            return;
        }
        const maxValue = Number.isFinite(options.maxValue) && options.maxValue > 0 ? options.maxValue : 100;
        const suffix = options.suffix || '%';

        if (value === null) {
            indicatorElement.style.setProperty('--indicator-color', '#6b7280');
            indicatorElement.style.setProperty('--indicator-glow', 'rgba(107, 114, 128, 0.45)');
            indicatorElement.title = 'Donnée indisponible';
            return;
        }

        const boundedValue = clamp(value, 0, maxValue);
        const hue = (boundedValue / maxValue) * 120;
        const color = `hsl(${hue} 88% 48%)`;
        const glow = `hsl(${hue} 92% 55% / 0.6)`;

        indicatorElement.style.setProperty('--indicator-color', color);
        indicatorElement.style.setProperty('--indicator-glow', glow);
        indicatorElement.title = suffix === '%' ? `${boundedValue.toFixed(1)} %` : `${boundedValue.toFixed(1)} ${suffix}`;
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
            if (statusElement) {
                statusElement.textContent = 'Sélectionnez une classe pour afficher ses informations.';
            }
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
            if (statusElement) {
                statusElement.textContent = 'Cette classe ne fait pas partie des classes prises en charge (3E ou 5E).';
            }
            return;
        }

        studentsCountElement.textContent = `Effectif (${classConfig.level}) : Chargement...`;
        setIndicatorLight(indicatorBElement, null);
        setIndicatorLight(indicatorTElement, null);
        setIndicatorLight(indicatorAElement, null);
        setIndicatorLight(indicatorT1Element, null);
        setIndicatorLight(indicatorT2Element, null);
        setIndicatorLight(indicatorT3Element, null);
        if (statusElement) {
            statusElement.textContent = `Lecture des données de l'onglet "${classConfig.sheetLabel}"...`;
        }

        try {
            const classData = await fetchClassData(className, classConfig);
            studentsCountElement.textContent = `Effectif (${classConfig.level}) : ${classData.studentsCount} élèves`;
            setIndicatorLight(indicatorBElement, classData.averageB, getIndicatorDisplayConfig('b'));
            setIndicatorLight(indicatorTElement, classData.averageT, getIndicatorDisplayConfig('t'));
            setIndicatorLight(indicatorAElement, classData.averageA, getIndicatorDisplayConfig('a'));
            setIndicatorLight(indicatorT1Element, classData.averageT1, getIndicatorDisplayConfig('t1'));
            setIndicatorLight(indicatorT2Element, classData.averageT2, getIndicatorDisplayConfig('t2'));
            setIndicatorLight(indicatorT3Element, classData.averageT3, getIndicatorDisplayConfig('t3'));
            lastClassStudents = classData.students;
            if (statusElement) {
                statusElement.textContent = 'Données chargées avec succès.';
            }
        } catch (error) {
            studentsCountElement.textContent = classConfig ? `Effectif (${classConfig.level}) : -` : 'Effectif : -';
            setIndicatorLight(indicatorBElement, null);
            setIndicatorLight(indicatorTElement, null);
            setIndicatorLight(indicatorAElement, null);
            setIndicatorLight(indicatorT1Element, null);
            setIndicatorLight(indicatorT2Element, null);
            setIndicatorLight(indicatorT3Element, null);
            lastClassStudents = [];
            if (statusElement) {
                statusElement.textContent = error instanceof Error ? error.message : 'Erreur lors du chargement des données.';
            }
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

            currentTeams = buildTeams(lastClassStudents);
            updateTeamStatusMessage();
            renderTeams(currentTeams);
            teamsPopupElement.hidden = false;
        });
        if (saveTeamsButton) {
            saveTeamsButton.addEventListener('click', () => {
                const className = getSelectedClass();
                if (!className || !currentTeams.length) {
                    teamsPopupStatusElement.textContent = 'Aucune équipe à sauvegarder.';
                    return;
                }
                const payload = currentTeams.map((team) => team.map((student) => student.name));
                setCookie(`${TEAMS_COOKIE_PREFIX}${className.toUpperCase()}`, JSON.stringify(payload));
                teamsPopupStatusElement.textContent = 'Équipes sauvegardées.';
            });
        }
        if (classBMinusButton) {
            classBMinusButton.addEventListener('click', () => {
                currentTeams.flat().forEach((student) => updateSessionScore(student.name, 'b', -1));
            });
        }
        if (classTMinusButton) {
            classTMinusButton.addEventListener('click', () => {
                currentTeams.flat().forEach((student) => updateSessionScore(student.name, 't', -1));
            });
        }
    if (loadTeamsButton) {
            loadTeamsButton.addEventListener('click', () => {
                const className = getSelectedClass();
                if (!className) {
                    teamsPopupStatusElement.textContent = 'Aucune classe sélectionnée.';
                    return;
                }
                const raw = getCookie(`${TEAMS_COOKIE_PREFIX}${className.toUpperCase()}`);
                if (!raw) {
                    teamsPopupStatusElement.textContent = 'Aucune sauvegarde trouvée pour cette classe.';
                    return;
                }
                try {
                    const savedTeams = JSON.parse(raw);
                    const byName = new Map(lastClassStudents.map((student) => [student.name, student]));
                    currentTeams = savedTeams.map((team) => team.map((name) => byName.get(name)).filter(Boolean));
                    renderTeams(currentTeams);
                    updateTeamStatusMessage();
                    teamsPopupStatusElement.textContent = 'Équipes rechargées depuis la sauvegarde.';
                } catch (error) {
                    teamsPopupStatusElement.textContent = 'Sauvegarde invalide.';
                }
            });
        }

        closeTeamsPopupButton.addEventListener('click', () => {
            teamsPopupElement.hidden = true;
        });

        teamsPopupElement.addEventListener('click', (event) => {
            if (event.target === teamsPopupElement) {
                teamsPopupElement.hidden = true;
            }
        });
    }

    if (exportBminusCsvButton) {
        exportBminusCsvButton.addEventListener('click', () => {
            renderSessionTable();
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
