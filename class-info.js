(function () {
    const TROISIEME_CLASSES = new Set(['3E1', '3E2', '3E3', '3E4', '3E5']);
    const QUATRIEME_CLASSES = new Set(['4E1', '4E2', '4E3', '4E4', '4E5']);
    const CINQUIEME_CLASSES = new Set(['5E1', '5E2', '5E3', '5E4', '5E5']);

    // Remplacer l'URL par le lien CSV publié du fichier "3E - Techno", onglet "Suivi Eleve 3E".
    // Format attendu : https://docs.google.com/spreadsheets/d/e/<ID>/pub?gid=<GID_ONGLET>&single=true&output=csv
    const SHEET_3E_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgz3Y15bbDovMG-vtfT0rBMeR-BDMfSRZsj_m3vlzsbGybW6xe5qWEfzB7fFCQyHmf9qJ7lMsDIUY6/pub?gid=640829844&single=true&output=csv';
    const SHEET_4E_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTm93EOw24n1lgpSXfhmyjIQznJuYfBVuA0lD3QUP1dm6rRCMOQxhKgcTtaQI-dkSPl49szSFur0Uvd/pub?gid=823965694&single=true&output=csv';
    const SHEET_5E_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQz6hxElwi5l0-KHdWwVo98h8_UHKmPS3_07l7GbaqSAeof2I9U8sUBxm8VkQRbYcAoGQJgDqdpmGXO/pub?gid=1527557223&single=true&output=csv';

    const classNameElement = document.getElementById('selected-class-name');
    const studentsCountElement = document.getElementById('selected-class-students');
    const indicatorT1BElement = document.getElementById('selected-class-indicator-t1b');
    const indicatorT1TElement = document.getElementById('selected-class-indicator-t1t');
    const indicatorT1AElement = document.getElementById('selected-class-indicator-t1a');
    const indicatorT2BElement = document.getElementById('selected-class-indicator-t2b');
    const indicatorT2TElement = document.getElementById('selected-class-indicator-t2t');
    const indicatorT2AElement = document.getElementById('selected-class-indicator-t2a');
    const indicatorT3BElement = document.getElementById('selected-class-indicator-t3b');
    const indicatorT3TElement = document.getElementById('selected-class-indicator-t3t');
    const indicatorT3AElement = document.getElementById('selected-class-indicator-t3a');
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
    const regenerateTeamsButton = document.getElementById('regenerate-teams-button');
    const classEvalButton = document.getElementById('class-eval-button');
    const exportBminusCsvButton = document.getElementById('export-bminus-csv-button');
    const evalPopupElement = document.getElementById('eval-popup');
    const evalPopupTitle = document.getElementById('eval-popup-title');
    const evalBMinusButton = document.getElementById('eval-bminus');
    const evalTPlusButton = document.getElementById('eval-tplus');
    const evalBMinus1Button = document.getElementById('eval-bminus1');
    const evalBPlusButton = document.getElementById('eval-bplus');
    const evalTMinus1Button = document.getElementById('eval-tminus1');
    const evalTPlus2Button = document.getElementById('eval-tplus2');
    const evalAPlusButton = document.getElementById('eval-aplus');
    const evalAPlus2Button = document.getElementById('eval-aplus2');
    const evalAMinusButton = document.getElementById('eval-aminus');
    const evalAbsentButton = document.getElementById('eval-absent');
    const evalSessionLedB = document.getElementById('eval-session-led-b');
    const evalSessionLedT = document.getElementById('eval-session-led-t');
    const evalSessionLedA = document.getElementById('eval-session-led-a');
    const evalCommentElement = document.getElementById('eval-comment');
    const evalValidateButton = document.getElementById('eval-validate');
    const classInfoExportButton = document.getElementById('class-info-export-button');
    const TEAMS_COOKIE_PREFIX = 'savedTeams_';
    const SESSION_SCORES_COOKIE_PREFIX = 'sessionScores_';

    let lastClassStudents = [];
    let currentTeams = [];
    let pendingEvaluation = null;
    let hasSelectedSession = false;
    let selectedSessionKey = '';
    let selectedSessionLabel = '';

    if (!classNameElement || !studentsCountElement || !indicatorT1BElement || !indicatorT1TElement || !indicatorT1AElement || !indicatorT2BElement || !indicatorT2TElement || !indicatorT2AElement || !indicatorT3BElement || !indicatorT3TElement || !indicatorT3AElement || !indicatorT1Element || !indicatorT2Element || !indicatorT3Element) {
        return;
    }
    const classIndicatorElements = {
        t1b: indicatorT1BElement, t1t: indicatorT1TElement, t1a: indicatorT1AElement,
        t2b: indicatorT2BElement, t2t: indicatorT2TElement, t2a: indicatorT2AElement,
        t3b: indicatorT3BElement, t3t: indicatorT3TElement, t3a: indicatorT3AElement,
        t1: indicatorT1Element, t2: indicatorT2Element, t3: indicatorT3Element
    };

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

    function computeMergedIndicator(row, indexes) {
        const values = indexes
            .filter((idx) => Number.isInteger(idx) && idx >= 0)
            .map((idx) => parsePercentage(row[idx]))
            .filter((value) => value !== null);
        return computeAverage(values);
    }

    function numberOrDefault(value, defaultValue) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : defaultValue;
    }

    function parseStudentData(row, idxMap) {
        const name = (row[idxMap.nameIdx] || '').trim();
        return {
            name,
            t1b: parsePercentage(row[idxMap.indicatorT1BIdx]),
            t1t: parsePercentage(row[idxMap.indicatorT1TIdx]),
            t1a: parsePercentage(row[idxMap.indicatorT1AIdx]),
            t2b: parsePercentage(row[idxMap.indicatorT2BIdx]),
            t2t: parsePercentage(row[idxMap.indicatorT2TIdx]),
            t2a: parsePercentage(row[idxMap.indicatorT2AIdx]),
            t3b: parsePercentage(row[idxMap.indicatorT3BIdx]),
            t3t: parsePercentage(row[idxMap.indicatorT3TIdx]),
            t3a: parsePercentage(row[idxMap.indicatorT3AIdx]),
            b: computeMergedIndicator(row, [idxMap.indicatorT1BIdx, idxMap.indicatorT2BIdx, idxMap.indicatorT3BIdx]),
            t: computeMergedIndicator(row, [idxMap.indicatorT1TIdx, idxMap.indicatorT2TIdx, idxMap.indicatorT3TIdx]),
            a: computeMergedIndicator(row, [idxMap.indicatorT1AIdx, idxMap.indicatorT2AIdx, idxMap.indicatorT3AIdx]),
            cpc: parsePercentage(row[idxMap.indicatorCpcIdx]),
            c3d: parsePercentage(row[idxMap.indicatorC3dIdx]),
            cmq: parsePercentage(row[idxMap.indicatorCmqIdx]),
            cprez: parsePercentage(row[idxMap.indicatorCPrezIdx]),
            t1: parsePercentage(row[idxMap.indicatorT1Idx]),
            t2: parsePercentage(row[idxMap.indicatorT2Idx]),
            t3: parsePercentage(row[idxMap.indicatorT3Idx]),
            at1: (row[idxMap.appreciationT1Idx] || '').trim(),
            at2: (row[idxMap.appreciationT2Idx] || '').trim(),
            at3: (row[idxMap.appreciationT3Idx] || '').trim(),
            ct1: (row[idxMap.commentT1Idx] || '').trim(),
            ct2: (row[idxMap.commentT2Idx] || '').trim(),
            ct3: (row[idxMap.commentT3Idx] || '').trim(),
        };
    }


    function resolveCsvColumnIndex(header, expectedName, fallbackIndex) {
        const byName = header.findIndex((col) => col === expectedName);
        if (byName !== -1) {
            return byName;
        }
        if (Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < header.length) {
            return fallbackIndex;
        }
        return -1;
    }


    function resolveFirstExistingColumn(header, expectedNames, fallbackIndex) {
        for (const name of expectedNames) {
            const idx = header.findIndex((col) => col === name);
            if (idx !== -1) return idx;
        }
        if (Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < header.length) {
            return fallbackIndex;
        }
        return -1;
    }

    function getIndicatorDisplayConfig(key) {
        const labels = {
            b: 'B',
            t: 'T',
            a: 'A',
            t1b: 'T1B',
            t1t: 'T1T',
            t1a: 'T1A',
            t2b: 'T2B',
            t2t: 'T2T',
            t2a: 'T2A',
            t3b: 'T3B',
            t3t: 'T3T',
            t3a: 'T3A',
            cpc: 'CPC',
            c3d: 'C3D',
            cmq: 'CMQ',
            cprez: 'CPREZ',
            t1: 'T1',
            t2: 'T2',
            t3: 'T3',
        };

        if (['t1', 't2', 't3'].includes(key)) {
            return { maxValue: 20, suffix: '/20', label: labels[key] || key.toUpperCase() };
        }
        if (['cpc', 'c3d', 'cmq', 'cprez'].includes(key)) {
            return { minValue: -3, maxValue: 3, suffix: '', label: labels[key] || key.toUpperCase() };
        }
        return { maxValue: 100, suffix: '%', label: labels[key] || key.toUpperCase() };
    }

    function buildTeams(students) {
        const TEAM_COUNT = 6;
        const METRICS = ['b', 't', 'a', 't1b', 't1t', 't1a', 't2b', 't2t', 't2a', 't3b', 't3t', 't3a', 'cpc', 'c3d', 'cmq', 'cprez', 't1', 't2', 't3'];
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

        const weakestBStudents = remaining
            .filter((student) => [student.t1b, student.t2b, student.t3b].some((value) => value !== null))
            .sort((lhs, rhs) => {
                const lhsScore = computeAverage([lhs.t1b, lhs.t2b, lhs.t3b].filter((value) => value !== null)) ?? 100;
                const rhsScore = computeAverage([rhs.t1b, rhs.t2b, rhs.t3b].filter((value) => value !== null)) ?? 100;
                return lhsScore - rhsScore;
            })
            .slice(0, TEAM_COUNT);

        weakestBStudents.forEach((student, index) => {
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

    function createIndicatorsRow(valuesByKey, keys) {
        const row = document.createElement('div');
        row.className = 'class-indicators';

        keys.forEach((key) => {
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

            const teamEvalButton = document.createElement('button');
            teamEvalButton.type = 'button';
            teamEvalButton.className = 'team-details-button';
            teamEvalButton.textContent = '📝';
            teamEvalButton.title = 'Évaluer toute l’équipe';
            teamEvalButton.addEventListener('click', () => openEvaluationPopup(`Équipe ${index + 1}`, team.map((student) => student.name)));
            teamHeader.appendChild(teamEvalButton);

            const teamIndicators = createIndicatorsRow({
                t1b: computeAverage(team.map((student) => student.t1b).filter((value) => value !== null)),
                t1t: computeAverage(team.map((student) => student.t1t).filter((value) => value !== null)),
                t1a: computeAverage(team.map((student) => student.t1a).filter((value) => value !== null)),
                t2b: computeAverage(team.map((student) => student.t2b).filter((value) => value !== null)),
                t2t: computeAverage(team.map((student) => student.t2t).filter((value) => value !== null)),
                t2a: computeAverage(team.map((student) => student.t2a).filter((value) => value !== null)),
                t3b: computeAverage(team.map((student) => student.t3b).filter((value) => value !== null)),
                t3t: computeAverage(team.map((student) => student.t3t).filter((value) => value !== null)),
                t3a: computeAverage(team.map((student) => student.t3a).filter((value) => value !== null)),
                cpc: computeAverage(team.map((student) => student.cpc).filter((value) => value !== null)),
                c3d: computeAverage(team.map((student) => student.c3d).filter((value) => value !== null)),
                cmq: computeAverage(team.map((student) => student.cmq).filter((value) => value !== null)),
                cprez: computeAverage(team.map((student) => student.cprez).filter((value) => value !== null)),
                t1: computeAverage(team.map((student) => student.t1).filter((value) => value !== null)),
                t2: computeAverage(team.map((student) => student.t2).filter((value) => value !== null)),
                t3: computeAverage(team.map((student) => student.t3).filter((value) => value !== null)),
            }, ['t1b', 't1t', 't1a', 't2b', 't2t', 't2a', 't3b', 't3t', 't3a', 't1', 't2', 't3', 'cpc', 'c3d', 'cmq', 'cprez']);
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
                name.className = 'team-student-name';
                name.textContent = student.name;
                const isAbsent = isStudentAbsentInSession(student.name);
                item.classList.toggle('team-student-item-absent', isAbsent);
                name.classList.toggle('team-student-name-absent', isAbsent);
                const studentEvalButton = document.createElement('button');
                studentEvalButton.type = 'button';
                studentEvalButton.className = 'team-details-button';
                studentEvalButton.textContent = '📝';
                studentEvalButton.title = `Évaluer ${student.name}`;
                studentEvalButton.addEventListener('click', () => openEvaluationPopup(student.name, [student.name]));

                const studentIndicators = createIndicatorsRow({
                    t1b: student.t1b,
                    t1t: student.t1t,
                    t1a: student.t1a,
                    t2b: student.t2b,
                    t2t: student.t2t,
                    t2a: student.t2a,
                    t3b: student.t3b,
                    t3t: student.t3t,
                    t3a: student.t3a,
                    cpc: student.cpc,
                    c3d: student.c3d,
                    cmq: student.cmq,
                    cprez: student.cprez,
                    t1: student.t1,
                    t2: student.t2,
                    t3: student.t3
                }, ['t1b', 't1t', 't1a', 't2b', 't2t', 't2a', 't3b', 't3t', 't3a', 't1', 't2', 't3', 'cpc', 'c3d', 'cmq', 'cprez']);
                studentIndicators.classList.add('team-student-indicators');

                const studentActions = document.createElement('div');
                studentActions.className = 'team-student-actions';
                studentActions.appendChild(studentEvalButton);
                const quickActions = [
                    { label: 'B-', payload: { bDelta: -1 } },
                    { label: 'T-', payload: { tDelta: -1 } },
                    { label: 'T+', payload: { tDelta: 1 } },
                    { label: 'C-', payload: { bDelta: -1, tDelta: -1 } },
                    { label: 'A-', payload: { aDelta: -1 } },
                ];
                quickActions.forEach((action) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'team-quick-action-button';
                    button.textContent = action.label;
                    button.title = `${action.label} sur ${student.name}`;
                    button.addEventListener('click', () => applySessionEvaluation([student.name], action.payload));
                    studentActions.appendChild(button);
                });

                item.appendChild(name);
                item.appendChild(studentActions);
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

            teamHeader.appendChild(detailsButton);
            card.appendChild(teamHeader);
            card.appendChild(teamIndicators);
            card.appendChild(detailsPanel);
            teamsPopupListElement.appendChild(card);
        });
    }
    function ensureSessionScoresInitialized(studentNames) {
        const sessionMap = getSessionScoresMap();
        let changed = false;
        studentNames.forEach((studentName) => {
            if (!sessionMap[studentName] || typeof sessionMap[studentName] !== 'object') {
                sessionMap[studentName] = { b: 3, t: 3, a: 3, comments: [] };
                changed = true;
            } else {
                if (!Array.isArray(sessionMap[studentName].comments)) {
                    sessionMap[studentName].comments = [];
                    changed = true;
                }
                if (!Number.isFinite(Number(sessionMap[studentName].b))) {
                    sessionMap[studentName].b = 3;
                    changed = true;
                }
                if (!Number.isFinite(Number(sessionMap[studentName].t))) {
                    sessionMap[studentName].t = 3;
                    changed = true;
                }
                if (!Number.isFinite(Number(sessionMap[studentName].a))) {
                    sessionMap[studentName].a = 3;
                    changed = true;
                }
            }
        });
        if (changed) {
            saveSessionScoresMap(sessionMap);
        }
    }

    function openEvaluationPopup(label, studentNames) {
        if (!evalPopupElement || !studentNames.length) {
            return;
        }
        const sessionMap = getSessionScoresMap();
        const shouldMarkAbsentByDefault = studentNames.length > 0 && studentNames.every((studentName) => Boolean(sessionMap[studentName] && sessionMap[studentName].absent));
        pendingEvaluation = { studentNames, bDelta: 0, tDelta: 0, aDelta: 0, markAbsent: shouldMarkAbsentByDefault, isClassEvaluation: label === 'Classe' };
        const evaluatedSessionLabel = getEvaluatedSessionLabel();
        evalPopupTitle.textContent = `Évaluer : ${label} (${evaluatedSessionLabel})`;
        evalCommentElement.value = '';
        [evalBMinusButton, evalBMinus1Button, evalBPlusButton, evalTMinus1Button, evalTPlusButton, evalTPlus2Button, evalAPlusButton, evalAPlus2Button, evalAMinusButton, evalAbsentButton].forEach((button) => button && button.classList.remove('selected'));
        evalAbsentButton.classList.toggle('selected', pendingEvaluation.markAbsent);
        updateSessionLeds(studentNames);
        evalPopupElement.hidden = false;
    }

    function getEvaluatedSessionLabel() {
        if (hasSelectedSession && selectedSessionLabel) {
            return selectedSessionLabel;
        }
        const today = new Date();
        return today.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    function getActiveSessionKey() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function getSessionScoresCookieName() {
        const selectedClass = (getSelectedClass() || 'inconnue').toUpperCase().trim();
        const sessionKey = hasSelectedSession && selectedSessionKey ? selectedSessionKey : getActiveSessionKey();
        return `${SESSION_SCORES_COOKIE_PREFIX}${selectedClass}_${sessionKey}`;
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
            sessionMap[studentName] = { b: 3, t: 3, a: 3, comments: [] };
        }
        sessionMap[studentName][indicator] = (Number(sessionMap[studentName][indicator]) || 0) + delta;
        saveSessionScoresMap(sessionMap);
    }

    function updateSessionDependentButtonsState() {
        const shouldDisable = !hasSelectedSession;
        if (classEvalButton) {
            classEvalButton.disabled = shouldDisable;
            classEvalButton.hidden = shouldDisable;
        }
        if (exportBminusCsvButton) {
            exportBminusCsvButton.disabled = shouldDisable;
            exportBminusCsvButton.hidden = shouldDisable;
        }
    }

    function renderSessionTable() {
        const sessionMap = getSessionScoresMap();
        const classComments = Array.isArray(sessionMap.__classComments) ? sessionMap.__classComments : [];
        const rows = lastClassStudents.map((student) => [student.name, sessionMap[student.name] || { b: 3, t: 3, a: 3, comments: [] }]);
        const sessionDate = selectedSessionLabel || getActiveSessionKey();
        const selectedClass = (getSelectedClass() || 'inconnue').toUpperCase().trim();
        const viewWindow = window.open('', '_blank');
        if (!viewWindow) {
            teamsPopupStatusElement.textContent = 'Impossible d’ouvrir la fenêtre du tableau (popup bloquée).';
            return;
        }
        const tableRows = rows.length ? rows.map(([name, scores]) => {
            const isAbsent = Boolean(scores && scores.absent);
            const b = numberOrDefault(scores.b, 3);
            const t = numberOrDefault(scores.t, 3);
            const a = numberOrDefault(scores.a, 3);
            const bHue = ((clamp(b, -3, 3) + 3) / 6) * 120;
            const tHue = ((clamp(t, -3, 3) + 3) / 6) * 120;
            const aHue = ((clamp(a, -3, 3) + 3) / 6) * 120;
            const comments = Array.isArray(scores.comments) ? scores.comments.join(' | ') : '';
            if (isAbsent) {
                return `<tr style="background:#f3f4f6;color:#6b7280"><td>${selectedClass}</td><td>${getTeamLabelForStudent(name)}</td><td>${name}</td><td>-</td><td>-</td><td>-</td><td>${comments}</td></tr>`;
            }
            return `<tr><td>${selectedClass}</td><td>${getTeamLabelForStudent(name)}</td><td>${name}</td><td style="background:hsl(${bHue} 90% 50% / .2);color:hsl(${bHue} 90% 38%)">${b}</td><td style="background:hsl(${tHue} 90% 50% / .2);color:hsl(${tHue} 90% 38%)">${t}</td><td style="background:hsl(${aHue} 90% 50% / .2);color:hsl(${aHue} 90% 38%)">${a}</td><td>${comments}</td></tr>`;
        }).join('') : '<tr><td colspan="7">Aucune donnée de séance.</td></tr>';
        const classCommentsHtml = classComments.length
            ? `<div style="border:1px solid #ccc;padding:10px;margin:12px 0 16px 0;background:#f8fafc"><strong>Commentaire classe</strong><br>${classComments.join('<br>')}</div>`
            : `<div style="border:1px solid #ccc;padding:10px;margin:12px 0 16px 0;background:#f8fafc"><strong>Commentaire classe</strong><br>Aucun commentaire classe.</div>`;
        viewWindow.document.write(`<html><head><title>Tableau séance ${selectedClass}</title><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%;max-width:680px}th,td{border:1px solid #ccc;padding:8px 10px}th{background:#111827;color:#fff;text-align:left}</style></head><body><h3>Tableau séance ${selectedClass} (${sessionDate})</h3><p><button id="reset-session">Réinitialiser</button> <button id="copy-session">Copier</button></p>${classCommentsHtml}<p>Ordre export: Classe, Équipe, Élève, B, T, A et commentaire.</p><table><thead><tr><th>Classe</th><th>Équipe</th><th>Élève</th><th>B</th><th>T</th><th>A</th><th>Commentaire</th></tr></thead><tbody>${tableRows}</tbody></table><script>const copyBtn=document.getElementById('copy-session');copyBtn.addEventListener('click',async()=>{const rows=[...document.querySelectorAll('tbody tr')].filter(r=>r.querySelectorAll('td').length>=7).map(r=>{const cells=r.querySelectorAll('td');return [cells[3].textContent.trim(),cells[4].textContent.trim(),cells[5].textContent.trim(),cells[6].textContent.trim()].join('\\t');}).join('\\n');try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(rows);}else{const ta=document.createElement('textarea');ta.value=rows;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}copyBtn.textContent='Copié ✓';if(window.opener){window.opener.postMessage({type:'session-export-copied',sessionClass:'${selectedClass}',sessionKey:'${sessionDate}'}, '*');}setTimeout(()=>{copyBtn.textContent='Copier';},1400);}catch(e){copyBtn.textContent='Échec copie';setTimeout(()=>{copyBtn.textContent='Copier';},1700);}});document.getElementById('reset-session').addEventListener('click',()=>{if(window.opener){window.opener.postMessage({type:'reset-session-scores'}, '*');}window.close();});</script></body></html>`);
        viewWindow.document.close();
    }

    

    function getTeamLabelForStudent(studentName) {
        const idx = currentTeams.findIndex((team) => team.some((student) => student.name === studentName));
        return idx >= 0 ? `Équipe ${idx + 1}` : 'Sans équipe';
    }

    function isStudentAbsentInSession(studentName) {
        const sessionMap = getSessionScoresMap();
        return Boolean(sessionMap && sessionMap[studentName] && sessionMap[studentName].absent);
    }

    function setSessionIndicatorLight(indicatorElement, value) {
        if (!indicatorElement) return;
        const boundedValue = clamp(Number(value) || 0, -3, 3);
        const hue = ((boundedValue + 3) / 6) * 120;
        indicatorElement.style.setProperty('--indicator-color', `hsl(${hue} 88% 48%)`);
        indicatorElement.style.setProperty('--indicator-glow', `hsl(${hue} 92% 55% / 0.6)`);
        indicatorElement.title = `${boundedValue}`;
    }

    function updateSessionLeds(studentNames) {
        const sessionMap = getSessionScoresMap();
        const first = studentNames.length ? (sessionMap[studentNames[0]] || { b: 3, t: 3, a: 3 }) : { b: 3, t: 3, a: 3 };
        const baseB = numberOrDefault(first.b, 3);
        const baseT = numberOrDefault(first.t, 3);
        const baseA = numberOrDefault(first.a, 3);
        const bDelta = pendingEvaluation ? pendingEvaluation.bDelta : 0;
        const tDelta = pendingEvaluation ? pendingEvaluation.tDelta : 0;
        const aDelta = pendingEvaluation ? pendingEvaluation.aDelta : 0;
        let tentativeB = clamp(baseB + bDelta, -3, 3);
        let tentativeT = clamp(baseT + tDelta, -3, 3);
        const tentativeA = clamp(baseA + aDelta, -3, 3);
        if (tentativeB < 0) {
            tentativeT = clamp(tentativeT - 1, -3, 3);
        }
        if (tentativeT < 0) {
            tentativeB = clamp(tentativeB - 1, -3, 3);
        }
        if (pendingEvaluation && pendingEvaluation.markAbsent) {
            [evalSessionLedB, evalSessionLedT, evalSessionLedA].forEach((indicatorElement) => {
                indicatorElement.style.setProperty('--indicator-color', '#6b7280');
                indicatorElement.style.setProperty('--indicator-glow', 'rgba(107, 114, 128, 0.45)');
                indicatorElement.title = 'Absent';
            });
            return;
        }
        setSessionIndicatorLight(evalSessionLedB, tentativeB);
        setSessionIndicatorLight(evalSessionLedT, tentativeT);
        setSessionIndicatorLight(evalSessionLedA, tentativeA);
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

    function deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    }

    function getCookie(name) {
        const prefix = `${name}=`;
        const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
        if (!cookie) {
            return null;
        }
        try {
            return decodeURIComponent(cookie.slice(prefix.length));
        } catch (error) {
            console.warn(`Cookie ${name} invalide, suppression de la valeur corrompue.`);
            deleteCookie(name);
            return null;
        }
    }


    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function setIndicatorLight(indicatorElement, value, options = {}) {
        if (!indicatorElement) {
            return;
        }
        const minValue = Number.isFinite(options.minValue) ? options.minValue : 0;
        const maxValue = Number.isFinite(options.maxValue) && options.maxValue > minValue ? options.maxValue : 100;
        const suffix = options.suffix || '%';
        const label = options.label || 'Indicateur';

        if (value === null) {
            indicatorElement.style.setProperty('--indicator-color', '#6b7280');
            indicatorElement.style.setProperty('--indicator-glow', 'rgba(107, 114, 128, 0.45)');
            indicatorElement.title = `${label}: donnée indisponible`;
            return;
        }

        const boundedValue = clamp(value, minValue, maxValue);
        const range = maxValue - minValue;
        const hue = ((boundedValue - minValue) / range) * 120;
        const color = `hsl(${hue} 88% 48%)`;
        const glow = `hsl(${hue} 92% 55% / 0.6)`;

        indicatorElement.style.setProperty('--indicator-color', color);
        indicatorElement.style.setProperty('--indicator-glow', glow);
        const formattedValue = suffix === '%' ? `${boundedValue.toFixed(1)} %` : `${boundedValue.toFixed(1)}${suffix ? ` ${suffix}` : ''}`;
        indicatorElement.title = `${label}: ${formattedValue}`;
    }

    function getClassConfig(selectedClass) {
        const normalizedClass = (selectedClass || '').toUpperCase().trim();

        if (TROISIEME_CLASSES.has(normalizedClass)) {
            return { level: '3E', csvUrl: SHEET_3E_CSV_URL, sheetLabel: 'Suivi Eleve 3E' };
        }
        if (QUATRIEME_CLASSES.has(normalizedClass)) {
            return { level: '4E', csvUrl: SHEET_4E_CSV_URL, sheetLabel: 'Suivi Eleve 4E' };
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
            return { studentsCount: 0, averageB: null, averageT: null, averageA: null, averageCpc: null, averageC3d: null, averageCmq: null, averageCPrez: null, averageT1: null, averageT2: null, averageT3: null, students: [] };
        }

        const header = rows[0].map((cell) => normalize(cell));
        const classIdx = resolveFirstExistingColumn(header, ['classe', 'class', 'classegroupe'], 0);
        const nameIdx = resolveFirstExistingColumn(header, ['nom', 'eleve', 'nomprenom', 'nom prenom'], 1);
        const indicatorT1BIdx = resolveCsvColumnIndex(header, 't1b', 2);
        const indicatorT1TIdx = resolveCsvColumnIndex(header, 't1t', 3);
        const indicatorT1AIdx = resolveCsvColumnIndex(header, 't1a', 4);
        const indicatorT2BIdx = resolveCsvColumnIndex(header, 't2b', 5);
        const indicatorT2TIdx = resolveCsvColumnIndex(header, 't2t', 6);
        const indicatorT2AIdx = resolveCsvColumnIndex(header, 't2a', 7);
        const indicatorT3BIdx = resolveCsvColumnIndex(header, 't3b', 8);
        const indicatorT3TIdx = resolveCsvColumnIndex(header, 't3t', 9);
        const indicatorT3AIdx = resolveCsvColumnIndex(header, 't3a', 10);
        const indicatorCpcIdx = resolveCsvColumnIndex(header, 'cpc', 11);
        const indicatorC3dIdx = resolveCsvColumnIndex(header, 'c3d', 12);
        const indicatorCmqIdx = resolveCsvColumnIndex(header, 'cmq', 13);
        const indicatorCPrezIdx = resolveCsvColumnIndex(header, 'cprez', 14);
        const indicatorT1Idx = resolveCsvColumnIndex(header, 't1', 15);
        const indicatorT2Idx = resolveCsvColumnIndex(header, 't2', 16);
        const indicatorT3Idx = resolveCsvColumnIndex(header, 't3', 17);
        const appreciationT1Idx = resolveCsvColumnIndex(header, 'at1', 18);
        const appreciationT2Idx = resolveCsvColumnIndex(header, 'at2', 19);
        const appreciationT3Idx = resolveCsvColumnIndex(header, 'at3', 20);
        const commentT1Idx = resolveCsvColumnIndex(header, 'ct1', 21);
        const commentT2Idx = resolveCsvColumnIndex(header, 'ct2', 22);
        const commentT3Idx = resolveCsvColumnIndex(header, 'ct3', 23);

        if (classIdx === -1 || nameIdx === -1 || indicatorT1BIdx === -1 || indicatorT1TIdx === -1 || indicatorT1AIdx === -1 || indicatorT2BIdx === -1 || indicatorT2TIdx === -1 || indicatorT2AIdx === -1 || indicatorT3BIdx === -1 || indicatorT3TIdx === -1 || indicatorT3AIdx === -1 || indicatorCpcIdx === -1 || indicatorC3dIdx === -1 || indicatorCmqIdx === -1 || indicatorCPrezIdx === -1 || indicatorT1Idx === -1 || indicatorT2Idx === -1 || indicatorT3Idx === -1 || appreciationT1Idx === -1 || appreciationT2Idx === -1 || appreciationT3Idx === -1 || commentT1Idx === -1 || commentT2Idx === -1 || commentT3Idx === -1) {
            throw new Error('Colonnes attendues introuvables (classe / nom / T1B/T1T/T1A / T2B/T2T/T2A / T3B/T3T/T3A / CPC / C3D / CMQ / CPREZ / T1 / T2 / T3 / AT1 / AT2 / AT3 / CT1 / CT2 / CT3).');
        }

        const normalizedSelectedClass = normalize(selectedClass);
        const classRows = rows
            .slice(1)
            .filter((row) => normalize(row[classIdx]) === normalizedSelectedClass && (row[nameIdx] || '').trim());

        const bValues = classRows.map((row) => computeMergedIndicator(row, [indicatorT1BIdx, indicatorT2BIdx, indicatorT3BIdx])).filter((value) => value !== null);
        const tValues = classRows.map((row) => computeMergedIndicator(row, [indicatorT1TIdx, indicatorT2TIdx, indicatorT3TIdx])).filter((value) => value !== null);
        const aValues = classRows.map((row) => computeMergedIndicator(row, [indicatorT1AIdx, indicatorT2AIdx, indicatorT3AIdx])).filter((value) => value !== null);
        const cpcValues = classRows.map((row) => parsePercentage(row[indicatorCpcIdx])).filter((value) => value !== null);
        const c3dValues = classRows.map((row) => parsePercentage(row[indicatorC3dIdx])).filter((value) => value !== null);
        const cmqValues = classRows.map((row) => parsePercentage(row[indicatorCmqIdx])).filter((value) => value !== null);
        const cprezValues = classRows.map((row) => parsePercentage(row[indicatorCPrezIdx])).filter((value) => value !== null);
        const t1Values = classRows.map((row) => parsePercentage(row[indicatorT1Idx])).filter((value) => value !== null);
        const t2Values = classRows.map((row) => parsePercentage(row[indicatorT2Idx])).filter((value) => value !== null);
        const t3Values = classRows.map((row) => parsePercentage(row[indicatorT3Idx])).filter((value) => value !== null);

        const students = classRows.map((row) => parseStudentData(row, {
            nameIdx,
            indicatorT1BIdx,
            indicatorT1TIdx,
            indicatorT1AIdx,
            indicatorT2BIdx,
            indicatorT2TIdx,
            indicatorT2AIdx,
            indicatorT3BIdx,
            indicatorT3TIdx,
            indicatorT3AIdx,
            indicatorCpcIdx,
            indicatorC3dIdx,
            indicatorCmqIdx,
            indicatorCPrezIdx,
            indicatorT1Idx,
            indicatorT2Idx,
            indicatorT3Idx,
            appreciationT1Idx,
            appreciationT2Idx,
            appreciationT3Idx,
            commentT1Idx,
            commentT2Idx,
            commentT3Idx,
        }));

        return {
            studentsCount: classRows.length,
            averageB: computeAverage(bValues),
            averageT: computeAverage(tValues),
            averageA: computeAverage(aValues),
            averageCpc: computeAverage(cpcValues),
            averageC3d: computeAverage(c3dValues),
            averageCmq: computeAverage(cmqValues),
            averageCPrez: computeAverage(cprezValues),
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
            Object.entries(classIndicatorElements).forEach(([key, element]) => setIndicatorLight(element, null, getIndicatorDisplayConfig(key)));
            if (statusElement) {
                statusElement.textContent = 'Sélectionnez une classe pour afficher ses informations.';
            }
            return;
        }

        if (!classConfig) {
            studentsCountElement.textContent = 'Effectif : -';
            Object.entries(classIndicatorElements).forEach(([key, element]) => setIndicatorLight(element, null, getIndicatorDisplayConfig(key)));
            if (statusElement) {
                statusElement.textContent = 'Cette classe ne fait pas partie des classes prises en charge (3E, 4E ou 5E).';
            }
            return;
        }

        studentsCountElement.textContent = `Effectif (${classConfig.level}) : Chargement...`;
        Object.entries(classIndicatorElements).forEach(([key, element]) => setIndicatorLight(element, null, getIndicatorDisplayConfig(key)));
        if (statusElement) {
            statusElement.textContent = `Lecture des données de l'onglet "${classConfig.sheetLabel}"...`;
        }

        try {
            const classData = await fetchClassData(className, classConfig);
            studentsCountElement.textContent = `Effectif (${classConfig.level}) : ${classData.studentsCount} élèves`;
            setIndicatorLight(indicatorT1BElement, computeAverage(classData.students.map((student) => student.t1b).filter((value) => value !== null)), getIndicatorDisplayConfig('t1b'));
            setIndicatorLight(indicatorT1TElement, computeAverage(classData.students.map((student) => student.t1t).filter((value) => value !== null)), getIndicatorDisplayConfig('t1t'));
            setIndicatorLight(indicatorT1AElement, computeAverage(classData.students.map((student) => student.t1a).filter((value) => value !== null)), getIndicatorDisplayConfig('t1a'));
            setIndicatorLight(indicatorT2BElement, computeAverage(classData.students.map((student) => student.t2b).filter((value) => value !== null)), getIndicatorDisplayConfig('t2b'));
            setIndicatorLight(indicatorT2TElement, computeAverage(classData.students.map((student) => student.t2t).filter((value) => value !== null)), getIndicatorDisplayConfig('t2t'));
            setIndicatorLight(indicatorT2AElement, computeAverage(classData.students.map((student) => student.t2a).filter((value) => value !== null)), getIndicatorDisplayConfig('t2a'));
            setIndicatorLight(indicatorT3BElement, computeAverage(classData.students.map((student) => student.t3b).filter((value) => value !== null)), getIndicatorDisplayConfig('t3b'));
            setIndicatorLight(indicatorT3TElement, computeAverage(classData.students.map((student) => student.t3t).filter((value) => value !== null)), getIndicatorDisplayConfig('t3t'));
            setIndicatorLight(indicatorT3AElement, computeAverage(classData.students.map((student) => student.t3a).filter((value) => value !== null)), getIndicatorDisplayConfig('t3a'));
            setIndicatorLight(indicatorT1Element, classData.averageT1, getIndicatorDisplayConfig('t1'));
            setIndicatorLight(indicatorT2Element, classData.averageT2, getIndicatorDisplayConfig('t2'));
            setIndicatorLight(indicatorT3Element, classData.averageT3, getIndicatorDisplayConfig('t3'));
            lastClassStudents = classData.students;
            ensureSessionScoresInitialized(lastClassStudents.map((student) => student.name));
            if (statusElement) {
                statusElement.textContent = 'Données chargées avec succès.';
            }
        } catch (error) {
            studentsCountElement.textContent = classConfig ? `Effectif (${classConfig.level}) : -` : 'Effectif : -';
            Object.entries(classIndicatorElements).forEach(([key, element]) => setIndicatorLight(element, null, getIndicatorDisplayConfig(key)));
            lastClassStudents = [];
            if (statusElement) {
                statusElement.textContent = error instanceof Error ? error.message : 'Erreur lors du chargement des données.';
            }
        }
    }

    function loadSavedTeamsForSelectedClass() {
        const className = getSelectedClass();
        if (!className) {
            teamsPopupStatusElement.textContent = 'Aucune classe sélectionnée.';
            return false;
        }
        const raw = getCookie(`${TEAMS_COOKIE_PREFIX}${className.toUpperCase()}`);
        if (!raw) {
            return false;
        }
        try {
            const savedTeams = JSON.parse(raw);
            if (!Array.isArray(savedTeams) || !savedTeams.every((team) => Array.isArray(team))) {
                throw new Error('invalid teams structure');
            }
            const byName = new Map(lastClassStudents.map((student) => [student.name, student]));
            currentTeams = savedTeams.map((team) => team.map((name) => byName.get(name)).filter(Boolean));
            renderTeams(currentTeams);
            updateTeamStatusMessage();
            teamsPopupStatusElement.textContent = 'Équipes rechargées depuis la sauvegarde.';
            return true;
        } catch (error) {
            teamsPopupStatusElement.textContent = 'Sauvegarde invalide.';
            deleteCookie(`${TEAMS_COOKIE_PREFIX}${className.toUpperCase()}`);
            return false;
        }
    }

    if (generateTeamsButton && teamsPopupElement && closeTeamsPopupButton) {
        generateTeamsButton.addEventListener('click', () => {
            if (loadSavedTeamsForSelectedClass()) {
                teamsPopupElement.hidden = false;
                return;
            }

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
        if (regenerateTeamsButton) {
            regenerateTeamsButton.addEventListener('click', () => {
                if (lastClassStudents.length < 24) {
                    teamsPopupStatusElement.textContent = 'Impossible de générer 6 équipes de 4 à 6 élèves avec cet effectif.';
                    return;
                }
                currentTeams = buildTeams(lastClassStudents.slice().sort(() => Math.random() - 0.5));
                updateTeamStatusMessage();
                renderTeams(currentTeams);
                teamsPopupStatusElement.textContent = 'Nouvelles équipes générées.';
            });
        }
        if (classEvalButton) {
            classEvalButton.addEventListener('click', () => {
                openEvaluationPopup('Classe', currentTeams.flat().map((student) => student.name));
            });
        }
    if (loadTeamsButton) {
            loadTeamsButton.addEventListener('click', () => {
                const className = getSelectedClass();
                if (!className) {
                    teamsPopupStatusElement.textContent = 'Aucune classe sélectionnée.';
                    return;
                }
                if (!loadSavedTeamsForSelectedClass()) {
                    teamsPopupStatusElement.textContent = 'Aucune sauvegarde trouvée pour cette classe.';
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
    // Fermeture volontaire retirée : validation obligatoire pour fermer la fenêtre.
    function toggleEvalDelta(button, key, deltaValue) {
        if (!button) return;
        button.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            const isSelected = button.classList.toggle('selected');
            pendingEvaluation[key] += isSelected ? deltaValue : -deltaValue;
            updateSessionLeds(pendingEvaluation.studentNames);
        });
    }

    toggleEvalDelta(evalBMinusButton, 'bDelta', -2);
    toggleEvalDelta(evalBMinus1Button, 'bDelta', -1);
    toggleEvalDelta(evalBPlusButton, 'bDelta', 1);
    toggleEvalDelta(evalTMinus1Button, 'tDelta', -1);
    toggleEvalDelta(evalTPlusButton, 'tDelta', 1);
    toggleEvalDelta(evalTPlus2Button, 'tDelta', 2);
    toggleEvalDelta(evalAMinusButton, 'aDelta', -1);
    toggleEvalDelta(evalAPlusButton, 'aDelta', 1);
    toggleEvalDelta(evalAPlus2Button, 'aDelta', 2);

    if (evalAbsentButton) {
        evalAbsentButton.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            pendingEvaluation.markAbsent = !pendingEvaluation.markAbsent;
            evalAbsentButton.classList.toggle('selected', pendingEvaluation.markAbsent);
            updateSessionLeds(pendingEvaluation.studentNames);
        });
    }

    function applySessionEvaluation(studentNames, evaluation, comment = '', isClassEvaluation = false) {
        const sessionMap = getSessionScoresMap();
        studentNames.forEach((studentName) => {
            if (!sessionMap[studentName] || typeof sessionMap[studentName] !== 'object') {
                sessionMap[studentName] = { b: 3, t: 3, a: 3, comments: [] };
            }
            if (evaluation.markAbsent) {
                sessionMap[studentName].absent = true;
                if (!Array.isArray(sessionMap[studentName].comments)) {
                    sessionMap[studentName].comments = [];
                }
                sessionMap[studentName].comments.push('Absent à la séance');
                return;
            }
            sessionMap[studentName].absent = false;
            if (Array.isArray(sessionMap[studentName].comments)) {
                sessionMap[studentName].comments = sessionMap[studentName].comments.filter((entry) => entry !== 'Absent à la séance');
            }
            const currentB = numberOrDefault(sessionMap[studentName].b, 3);
            const currentT = numberOrDefault(sessionMap[studentName].t, 3);
            const currentA = numberOrDefault(sessionMap[studentName].a, 3);

            let nextB = clamp(currentB + numberOrDefault(evaluation.bDelta, 0), -3, 3);
            let nextT = clamp(currentT + numberOrDefault(evaluation.tDelta, 0), -3, 3);
            const nextA = clamp(currentA + numberOrDefault(evaluation.aDelta, 0), -3, 3);

            if (nextB < 0) {
                nextT = clamp(nextT - 1, -3, 3);
            }
            if (nextT < 0) {
                nextB = clamp(nextB - 1, -3, 3);
            }

            sessionMap[studentName].b = nextB;
            sessionMap[studentName].t = nextT;
            sessionMap[studentName].a = nextA;
            if (!Array.isArray(sessionMap[studentName].comments)) {
                sessionMap[studentName].comments = [];
            }
            if (comment && !isClassEvaluation) {
                sessionMap[studentName].comments.push(comment);
            }
        });
        if (comment && isClassEvaluation) {
            if (!Array.isArray(sessionMap.__classComments)) {
                sessionMap.__classComments = [];
            }
            sessionMap.__classComments.push(comment);
        }
        saveSessionScoresMap(sessionMap);
    }

    function closeEvaluationPopup() {
        if (evalPopupElement) {
            evalPopupElement.hidden = true;
        }
        pendingEvaluation = null;
    }

    if (evalValidateButton) {
        evalValidateButton.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            const evaluation = pendingEvaluation;
            const comment = (evalCommentElement.value || '').trim();
            applySessionEvaluation(evaluation.studentNames, evaluation, comment, evaluation.isClassEvaluation);
            closeEvaluationPopup();
            renderTeams(currentTeams);
            updateClassIndicatorsAndCount(lastClassStudents, getSelectedClass());
        });
    }

    if (classFilterElement) {
        classFilterElement.addEventListener('change', refreshClassInfo);
    }
    if (classInfoExportButton) {
        classInfoExportButton.addEventListener('click', () => {
            const selectedClass = (getSelectedClass() || 'inconnue').toUpperCase().trim();
            const viewWindow = window.open('', '_blank');
            if (!viewWindow) return;

            const buildLed = (key) => {
                const config = getIndicatorDisplayConfig(key);
                return (rawValue) => {
                    if (rawValue === null || rawValue === undefined) {
                        return '<span class="mini-led-wrap"><span class="led na"></span></span>';
                    }
                    const minValue = Number.isFinite(config.minValue) ? config.minValue : 0;
                    const boundedValue = clamp(rawValue, minValue, config.maxValue);
                    const hue = ((boundedValue - minValue) / (config.maxValue - minValue)) * 120;
                    const color = `hsl(${hue} 88% 48%)`;
                    return `<span class="mini-led-wrap"><span class="led" style="--led-color:${color};--led-glow:hsl(${hue} 92% 55% / 0.6)"></span></span>`;
                };
            };

            const toHundredScale = (value) => {
                if (value === null || value === undefined) return null;
                return clamp(value * 5, 0, 100);
            };
            const averageOnHundred = (...values) => {
                const valid = values.filter((value) => value !== null && value !== undefined);
                if (!valid.length) return null;
                return computeAverage(valid.map((value) => toHundredScale(value)));
            };

            const buildLinePoints = (values) => values.map((value, index) => {
                const x = 26 + (index * 80);
                const numericValue = value === null || value === undefined ? 0 : clamp(value, 0, 100);
                const y = 120 - ((numericValue / 100) * 90);
                return `${x},${y}`;
            }).join(' ');

            const exportRows = lastClassStudents.map((student) => {
                const cells = ['t1b', 't1t', 't1a', 't2b', 't2t', 't2a', 't3b', 't3t', 't3a', 'cpc', 'c3d', 'cmq', 'cprez', 't1', 't2', 't3'].map((key) => {
                    const config = getIndicatorDisplayConfig(key);
                    const rawValue = student[key];
                    if (rawValue === null || rawValue === undefined) {
                        return '<td><span class="led na"></span></td>';
                    }
                    const minValue = Number.isFinite(config.minValue) ? config.minValue : 0;
                    const boundedValue = clamp(rawValue, minValue, config.maxValue);
                    const hue = ((boundedValue - minValue) / (config.maxValue - minValue)) * 120;
                    const color = `hsl(${hue} 88% 48%)`;
                    return `<td><span class="led" style="--led-color:${color};--led-glow:hsl(${hue} 92% 55% / 0.6)"></span></td>`;
                }).join('');

                const at1 = student.at1 || 'Appréciation T1 indisponible.';
                const at2 = student.at2 || 'Appréciation T2 indisponible.';
                const at3 = student.at3 || 'Appréciation T3 indisponible.';
                const ct1 = student.ct1 || 'Aucune remarque.';
                const ct2 = student.ct2 || 'Aucune remarque.';
                const ct3 = student.ct3 || 'Aucune remarque.';
                const t1Leds = [buildLed('t1b')(student.t1b), buildLed('t1t')(student.t1t), buildLed('t1a')(student.t1a), buildLed('t1')(student.t1)].join('');
                const t2Leds = [buildLed('t2b')(student.t2b), buildLed('t2t')(student.t2t), buildLed('t2a')(student.t2a), buildLed('t2')(student.t2)].join('');
                const t3Leds = [buildLed('t3b')(student.t3b), buildLed('t3t')(student.t3t), buildLed('t3a')(student.t3a), buildLed('t3')(student.t3)].join('');
                const bPoints = buildLinePoints([student.t1b, student.t2b, student.t3b]);
                const tPoints = buildLinePoints([student.t1t, student.t2t, student.t3t]);
                const aPoints = buildLinePoints([student.t1a, student.t2a, student.t3a]);
                const avgPoints = buildLinePoints([
                    toHundredScale(student.t1),
                    toHundredScale(student.t2),
                    toHundredScale(student.t3)
                ]);

                return `<article class="student-card"><h4>${student.name}</h4><div class="student-block"><div class="student-subblock"><table class="inner-table"><thead><tr><th>T1B</th><th>T1T</th><th>T1A</th><th>T2B</th><th>T2T</th><th>T2A</th><th>T3B</th><th>T3T</th><th>T3A</th><th>CPC</th><th>C3D</th><th>CMQ</th><th>CPREZ</th><th>T1</th><th>T2</th><th>T3</th></tr></thead><tbody><tr>${cells}</tr></tbody></table></div><div class="student-content-row"><div class="appreciations-column"><div class="student-subblock"><div class="subblock-title-row"><h5>Appréciation T1</h5><div class="term-leds">${t1Leds}</div></div><p>${at1}</p><p><em>remarques: ${ct1}</em></p></div><div class="student-subblock"><div class="subblock-title-row"><h5>Appréciation T2</h5><div class="term-leds">${t2Leds}</div></div><p>${at2}</p><p><em>remarques: ${ct2}</em></p></div><div class="student-subblock"><div class="subblock-title-row"><h5>Appréciation T3</h5><div class="term-leds">${t3Leds}</div></div><p>${at3}</p><p><em>remarques: ${ct3}</em></p></div></div><div class="student-subblock evolution-subblock"><h5>Évolution <span class="title-b">B</span> / <span class="title-t">T</span> / <span class="title-a">A</span> / <span class="title-avg">moyenne</span></h5><svg viewBox="0 0 200 130" class="evolution-chart" role="img" aria-label="Graphique évolution B T A"><line x1="26" y1="30" x2="26" y2="120" class="axis-line"></line><line x1="26" y1="120" x2="186" y2="120" class="axis-line"></line><line x1="26" y1="30" x2="186" y2="30" class="grid-line"></line><line x1="26" y1="75" x2="186" y2="75" class="grid-line"></line><polyline points="${bPoints}" class="line-b"></polyline><polyline points="${tPoints}" class="line-t"></polyline><polyline points="${aPoints}" class="line-a"></polyline><polyline points="${avgPoints}" class="line-avg"></polyline><text x="20" y="34" class="axis-label">100</text><text x="20" y="79" class="axis-label">50</text><text x="20" y="124" class="axis-label">0</text></svg></div></div></div></article>`;
            }).join('');

            viewWindow.document.write(`<html><head><title>Export voyants ${selectedClass}</title><style>:root{--bg:#f3f4f6;--panel:#ffffff;--text:#111827;--border:#d1d5db;--header:#111827;--headerText:#f9fafb;--btn:#2563eb}*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:24px;background:var(--bg);color:var(--text)}.topbar{display:flex;justify-content:flex-end;gap:8px;margin-bottom:10px}.close-btn{border:0;border-radius:8px;background:#374151;color:#fff;padding:8px 12px;cursor:pointer;font-weight:600}.panel{max-width:1200px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:0 8px 24px rgba(17,24,39,.08)}h3{margin:0 0 8px 0}p{margin:0;color:#374151;line-height:1.45;white-space:pre-wrap}.student-grid{display:grid;grid-template-columns:1fr;gap:12px}.student-card{border:1px solid var(--border);border-radius:12px;background:#f8fafc;padding:12px}.student-card h4{margin:0 0 10px 0}.student-block{display:grid;gap:10px}.student-content-row{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:10px;align-items:stretch}.appreciations-column{display:grid;gap:10px}.student-subblock{border:1px solid var(--border);border-radius:10px;background:#fff;padding:10px}.student-subblock h5{margin:0 0 8px 0}.subblock-title-row{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.term-leds{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.mini-led-wrap{display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:12px;color:#4b5563}table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--border);padding:8px 10px;text-align:center}th{background:var(--header);color:var(--headerText);text-align:center}.inner-table th,.inner-table td{white-space:nowrap}.led{display:inline-block;width:13px;height:13px;border-radius:999px;background:var(--led-color,#6b7280);box-shadow:0 0 10px var(--led-glow,rgba(107,114,128,.45));margin-right:0;vertical-align:-1px}.led.na{background:#6b7280;box-shadow:0 0 10px rgba(107,114,128,.45)}.evolution-subblock{display:flex;flex-direction:column}.evolution-chart{width:100%;height:auto}.axis-line{stroke:#9ca3af;stroke-width:1}.grid-line{stroke:#e5e7eb;stroke-width:1}.line-b,.line-t,.line-a,.line-avg{fill:none;stroke-width:2.5}.line-b{stroke:#2563eb}.line-t{stroke:#16a34a}.line-a{stroke:#f97316}.line-avg{stroke:#dc2626}.axis-label{font-size:10px;fill:#6b7280;text-anchor:end}.title-b{color:#2563eb}.title-t{color:#16a34a}.title-a{color:#f97316}.title-avg{color:#dc2626}</style></head><body><div class="topbar"><button type="button" class="close-btn" id="close-export-window" onclick="window.close();return false;">Fermer</button></div><div class="panel"><h3>Bilan de la classe ${selectedClass}</h3><div class="student-grid">${exportRows || '<p>Aucun élève chargé.</p>'}</div></div><script>(function(){const closeBtn=document.getElementById('close-export-window');if(closeBtn){closeBtn.addEventListener('click',()=>{window.close();if(!window.closed){window.open('','_self');window.close();}});}})();</script></body></html>`);
            viewWindow.document.close();
        });
    }

    window.addEventListener('session-selection-change', (event) => {
        hasSelectedSession = Boolean(event.detail && event.detail.hasSelection);
        selectedSessionKey = event.detail && event.detail.sessionKey ? event.detail.sessionKey : '';
        selectedSessionLabel = event.detail && event.detail.sessionLabel ? event.detail.sessionLabel : '';
        updateSessionDependentButtonsState();
        refreshClassInfo();
    });

    
    window.addEventListener('message', (event) => {
        if (!event.data || event.data.type !== 'reset-session-scores') {
            return;
        }
        const sessionMap = getSessionScoresMap();
        Object.keys(sessionMap).forEach((key) => {
            if (key === '__classComments') return;
            sessionMap[key] = { b: 3, t: 3, a: 3, comments: [] };
        });
        sessionMap.__classComments = [];
        saveSessionScoresMap(sessionMap);
    });

    window.addEventListener('storage', (event) => {
        if (event.key === 'userClasse') {
            refreshClassInfo();
        }
    });

    updateSessionDependentButtonsState();
    refreshClassInfo();
})();
