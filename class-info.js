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
    const toggleBtaGradientsButton = document.getElementById('toggle-bta-gradients-button');
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
    const STORAGE_PREFIX = 'classInfo_';
    const SESSION_SCORE_MIN = -3;
    const SESSION_SCORE_MAX = 3;
    const BTA_GRADIENTS_STORAGE_KEY = 'btaIndicatorGradientsEnabled';


    let lastClassStudents = [];
    let currentTeams = [];
    let pendingEvaluation = null;
    let hasSelectedSession = false;
    let selectedSessionKey = '';
    let selectedSessionLabel = '';
    let btaGradientsEnabled = localStorage.getItem(BTA_GRADIENTS_STORAGE_KEY) !== 'false';

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

    function sanitizeExportRemark(value) {
        const cleaned = String(value || '')
            .replace(/\b(?:CPC|PC|C3D|3D|CMQ|MQ|CPREZ|C)\s*(?:(?:[+＋\-−]\s*)+|plus|moins)\s*\d*/gi, '')
            .replace(/\s+([,;:.!?])/g, '$1')
            .replace(/([,;|/])(?:\s*\1)+/g, '$1')
            .replace(/(?:\s*[,;|/]\s*){2,}/g, '; ')
            .replace(/^\s*[,;|/.\-]+\s*/, '')
            .replace(/\s*[,;|/.\-]+\s*$/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        return cleaned || 'Aucune remarque.';
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
            c: parsePercentage(row[idxMap.indicatorCIdx]),
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
            c: 'C',
            t1: 'T1',
            t2: 'T2',
            t3: 'T3',
        };

        if (['t1', 't2', 't3'].includes(key)) {
            return { maxValue: 20, suffix: '/20', label: labels[key] || key.toUpperCase() };
        }
        if (['cpc', 'c3d', 'cmq', 'cprez', 'c'].includes(key)) {
            return { minValue: -3, maxValue: 3, suffix: '', label: labels[key] || key.toUpperCase() };
        }
        return {
            maxValue: 100,
            suffix: '%',
            label: labels[key] || key.toUpperCase(),
            useBtaGradient: /^(?:t[123])?[bta]$/.test(key),
        };
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
                    { label: 'B-', payload: { bDelta: -1 }, indicator: 'b' },
                    { label: 'B+', payload: { bDelta: 1 }, indicator: 'b' },
                    { label: 'T-', payload: { tDelta: -1 }, indicator: 't' },
                    { label: 'T+', payload: { tDelta: 1 }, indicator: 't' },
                    { label: 'C-', payload: { commentOnly: true }, comment: 'C-' },
                    { label: 'A-', payload: { aDelta: -1 }, indicator: 'a' },
                ];
                const sessionScore = getSessionScoresMap()[student.name] || {};
                quickActions.forEach((action) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'team-quick-action-button';
                    button.textContent = action.label;
                    button.title = `${action.label} sur ${student.name}`;
                    if (action.indicator) {
                        const score = normalizeSessionScore(numberOrDefault(sessionScore[action.indicator], 3));
                        button.dataset.sessionScore = String(clamp(score, SESSION_SCORE_MIN, SESSION_SCORE_MAX));
                    }
                    button.addEventListener('click', () => {
                        applySessionEvaluation([student.name], action.payload, action.comment || '');
                        renderTeams(currentTeams);
                    });
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
        const raw = getStoredValue(getSessionScoresCookieName());
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
        setStoredValue(getSessionScoresCookieName(), JSON.stringify(sessionMap));
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

    function normalizeSessionScore(value) {
        return Number(value) || 0;
    }

    function setSessionIndicatorLight(indicatorElement, value) {
        if (!indicatorElement) return;
        const numericValue = Number(value) || 0;
        const boundedValue = clamp(numericValue, SESSION_SCORE_MIN, SESSION_SCORE_MAX);
        const hue = ((boundedValue - SESSION_SCORE_MIN) / (SESSION_SCORE_MAX - SESSION_SCORE_MIN)) * 120;
        indicatorElement.style.setProperty('--indicator-color', `hsl(${hue} 88% 48%)`);
        indicatorElement.style.setProperty('--indicator-glow', `hsl(${hue} 92% 55% / 0.6)`);
        indicatorElement.title = `${numericValue}`;
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
        let tentativeB = normalizeSessionScore(baseB + bDelta);
        let tentativeT = normalizeSessionScore(baseT + tDelta);
        const tentativeA = normalizeSessionScore(baseA + aDelta);
        if (bDelta < 0 && baseB < 0) {
            tentativeT = normalizeSessionScore(tentativeT - 1);
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

    function getStoredValue(name) {
        try {
            const storedValue = localStorage.getItem(`${STORAGE_PREFIX}${name}`);
            if (storedValue !== null) {
                deleteCookie(name);
                return storedValue;
            }
        } catch (error) {
            console.warn(`Stockage local indisponible pour ${name}.`, error);
        }

        const legacyCookieValue = getCookie(name);
        if (legacyCookieValue !== null) {
            setStoredValue(name, legacyCookieValue);
        }
        return legacyCookieValue;
    }

    function setStoredValue(name, value) {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${name}`, value);
            deleteCookie(name);
            return true;
        } catch (error) {
            console.warn(`Impossible de sauvegarder ${name} dans le stockage local.`, error);
            return false;
        }
    }

    function deleteStoredValue(name) {
        try {
            localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
        } catch (error) {
            console.warn(`Impossible de supprimer ${name} du stockage local.`, error);
        }
        deleteCookie(name);
    }

    function migrateLargeCookiesToLocalStorage() {
        document.cookie.split('; ').forEach((entry) => {
            const separatorIndex = entry.indexOf('=');
            const name = separatorIndex === -1 ? entry : entry.slice(0, separatorIndex);
            if (name.startsWith(TEAMS_COOKIE_PREFIX) || name.startsWith(SESSION_SCORES_COOKIE_PREFIX)) {
                getStoredValue(name);
            }
        });
    }

    migrateLargeCookiesToLocalStorage();


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
        const continuousHue = ((boundedValue - minValue) / range) * 120;
        const hue = options.useBtaGradient && !btaGradientsEnabled
            ? (boundedValue >= minValue + range * 0.67 ? 120 : boundedValue >= minValue + range * 0.34 ? 45 : 0)
            : continuousHue;
        const color = `hsl(${hue} 88% 48%)`;
        const glow = `hsl(${hue} 92% 55% / 0.6)`;

        indicatorElement.style.setProperty('--indicator-color', color);
        indicatorElement.style.setProperty('--indicator-glow', glow);
        const formattedValue = suffix === '%' ? `${boundedValue.toFixed(1)} %` : `${boundedValue.toFixed(1)}${suffix ? ` ${suffix}` : ''}`;
        indicatorElement.title = `${label}: ${formattedValue}`;
    }

    function updateBtaGradientsButton() {
        if (!toggleBtaGradientsButton) return;
        const action = btaGradientsEnabled ? 'Désactiver' : 'Activer';
        const description = `${action} les dégradés de couleurs des indicateurs B, T et A`;
        toggleBtaGradientsButton.setAttribute('aria-pressed', String(btaGradientsEnabled));
        toggleBtaGradientsButton.setAttribute('aria-label', description);
        toggleBtaGradientsButton.title = description;
        toggleBtaGradientsButton.textContent = btaGradientsEnabled ? '🌈' : '🎨';
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
        const indicatorCIdx = resolveCsvColumnIndex(header, 'c', 15);
        const indicatorT1Idx = resolveCsvColumnIndex(header, 't1', 16);
        const indicatorT2Idx = resolveCsvColumnIndex(header, 't2', 17);
        const indicatorT3Idx = resolveCsvColumnIndex(header, 't3', 18);
        const appreciationT1Idx = resolveCsvColumnIndex(header, 'at1', 19);
        const appreciationT2Idx = resolveCsvColumnIndex(header, 'at2', 20);
        const appreciationT3Idx = resolveCsvColumnIndex(header, 'at3', 21);
        const commentT1Idx = resolveCsvColumnIndex(header, 'ct1', 22);
        const commentT2Idx = resolveCsvColumnIndex(header, 'ct2', 23);
        const commentT3Idx = resolveCsvColumnIndex(header, 'ct3', 24);

        if (classIdx === -1 || nameIdx === -1 || indicatorT1BIdx === -1 || indicatorT1TIdx === -1 || indicatorT1AIdx === -1 || indicatorT2BIdx === -1 || indicatorT2TIdx === -1 || indicatorT2AIdx === -1 || indicatorT3BIdx === -1 || indicatorT3TIdx === -1 || indicatorT3AIdx === -1 || indicatorCpcIdx === -1 || indicatorC3dIdx === -1 || indicatorCmqIdx === -1 || indicatorCPrezIdx === -1 || indicatorCIdx === -1 || indicatorT1Idx === -1 || indicatorT2Idx === -1 || indicatorT3Idx === -1 || appreciationT1Idx === -1 || appreciationT2Idx === -1 || appreciationT3Idx === -1 || commentT1Idx === -1 || commentT2Idx === -1 || commentT3Idx === -1) {
            throw new Error('Colonnes attendues introuvables (classe / nom / T1B/T1T/T1A / T2B/T2T/T2A / T3B/T3T/T3A / CPC / C3D / CMQ / CPREZ / C / T1 / T2 / T3 / AT1 / AT2 / AT3 / CT1 / CT2 / CT3).');
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
            indicatorCIdx,
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
        const raw = getStoredValue(`${TEAMS_COOKIE_PREFIX}${className.toUpperCase()}`);
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
            deleteStoredValue(`${TEAMS_COOKIE_PREFIX}${className.toUpperCase()}`);
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
                setStoredValue(`${TEAMS_COOKIE_PREFIX}${className.toUpperCase()}`, JSON.stringify(payload));
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
        if (toggleBtaGradientsButton) {
            updateBtaGradientsButton();
            toggleBtaGradientsButton.addEventListener('click', () => {
                btaGradientsEnabled = !btaGradientsEnabled;
                localStorage.setItem(BTA_GRADIENTS_STORAGE_KEY, String(btaGradientsEnabled));
                updateBtaGradientsButton();
                renderTeams(currentTeams);
                refreshClassInfo();
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
            if (evaluation.commentOnly) {
                if (!Array.isArray(sessionMap[studentName].comments)) {
                    sessionMap[studentName].comments = [];
                }
                if (comment) {
                    sessionMap[studentName].comments.push(comment);
                }
                return;
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

            let nextB = normalizeSessionScore(currentB + numberOrDefault(evaluation.bDelta, 0));
            let nextT = normalizeSessionScore(currentT + numberOrDefault(evaluation.tDelta, 0));
            const nextA = normalizeSessionScore(currentA + numberOrDefault(evaluation.aDelta, 0));

            if (numberOrDefault(evaluation.bDelta, 0) < 0 && currentB < 0) {
                nextT = normalizeSessionScore(nextT - 1);
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
                        return `<span class="mini-led-wrap"><span class="led-mode"><span class="led na"></span></span>${buildValuePill(key, rawValue)}</span>`;
                    }
                    const minValue = Number.isFinite(config.minValue) ? config.minValue : 0;
                    const boundedValue = clamp(rawValue, minValue, config.maxValue);
                    const hue = ((boundedValue - minValue) / (config.maxValue - minValue)) * 120;
                    const color = `hsl(${hue} 88% 48%)`;
                    return `<span class="mini-led-wrap"><span class="led-mode"><span class="led" style="--led-color:${color};--led-glow:hsl(${hue} 92% 55% / 0.6)"></span></span>${buildValuePill(key, rawValue)}</span>`;
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

            const formatExportValue = (key, rawValue) => {
                if (rawValue === null || rawValue === undefined) return 'N/A';
                const config = getIndicatorDisplayConfig(key);
                const numericValue = Number(rawValue);
                if (!Number.isFinite(numericValue)) return 'N/A';
                const displayValue = Number.isInteger(numericValue) ? numericValue : Math.round(numericValue * 10) / 10;
                return `${displayValue}${config.suffix || ''}`;
            };

            const buildValuePill = (key, rawValue) => {
                const config = getIndicatorDisplayConfig(key);
                return `<span class="value-mode value-pill">${config.label}: ${formatExportValue(key, rawValue)}</span>`;
            };

            const buildLinePoints = (values) => values.map((value, index) => {
                const x = 26 + (index * 80);
                const numericValue = value === null || value === undefined ? 0 : clamp(value, 0, 100);
                const y = 120 - ((numericValue / 100) * 90);
                return `${x},${y}`;
            }).join(' ');

            const clampCompetencyValue = (value) => {
                if (value === null || value === undefined) return null;
                const parsedValue = Number(value);
                return Number.isFinite(parsedValue) ? clamp(parsedValue, -3, 3) : null;
            };

            const competencyCount = 5;
            const buildRadarPoint = (value, index, radius = 48) => {
                const centerX = 100;
                const centerY = 76;
                const boundedValue = clampCompetencyValue(value);
                const ratio = boundedValue === null ? 0 : (boundedValue + 3) / 6;
                const angle = (-90 + (index * (360 / competencyCount))) * (Math.PI / 180);
                const pointRadius = ratio * radius;
                return {
                    x: centerX + (Math.cos(angle) * pointRadius),
                    y: centerY + (Math.sin(angle) * pointRadius),
                };
            };

            const buildRadarRingPoints = (ratio) => Array.from({ length: competencyCount }, (_, index) => {
                const angle = (-90 + (index * (360 / competencyCount))) * (Math.PI / 180);
                const pointRadius = ratio * 48;
                return `${100 + (Math.cos(angle) * pointRadius)},${76 + (Math.sin(angle) * pointRadius)}`;
            }).join(' ');

            const buildCompetencyRadar = (student) => {
                const competencies = [
                    { key: 'c3d', label: 'C3D', value: clampCompetencyValue(student.c3d) },
                    { key: 'cpc', label: 'CPC', value: clampCompetencyValue(student.cpc) },
                    { key: 'cmq', label: 'CMQ', value: clampCompetencyValue(student.cmq) },
                    { key: 'cprez', label: 'CPRez', value: clampCompetencyValue(student.cprez) },
                    { key: 'c', label: 'C', value: clampCompetencyValue(student.c) },
                ];
                const points = competencies.map((competency, index) => buildRadarPoint(competency.value, index));
                const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(' ');
                const valueLabels = competencies.map((competency, index) => {
                    const point = buildRadarPoint(3, index, 61);
                    return `<text x="${point.x}" y="${point.y}" class="radar-label">${competency.label}</text>`;
                }).join('');
                const axes = Array.from({ length: competencyCount }, (_, index) => {
                    const point = buildRadarPoint(3, index);
                    return `<line x1="100" y1="76" x2="${point.x}" y2="${point.y}" class="radar-axis"></line>`;
                }).join('');
                const ariaValues = competencies.map((competency) => `${competency.label} ${competency.value === null ? 'non renseigné' : competency.value}`).join(', ');
                return `<div class="radar-chart-wrap"><h5>Compétences</h5><svg viewBox="0 0 200 150" class="radar-chart" role="img" aria-label="Radar compétences: ${ariaValues}"><polygon points="${buildRadarRingPoints(1)}" class="radar-ring radar-ring-max"></polygon><polygon points="${buildRadarRingPoints(0.5)}" class="radar-ring"></polygon>${axes}<polygon points="${polygonPoints}" class="radar-area"></polygon><polyline points="${polygonPoints} ${points[0].x},${points[0].y}" class="radar-line"></polyline><circle cx="100" cy="76" r="2" class="radar-center"></circle><text x="104" y="80" class="radar-scale">-3</text><text x="104" y="56" class="radar-scale">0</text><text x="104" y="32" class="radar-scale">3</text>${valueLabels}</svg></div>`;
            };

            const classAverageFor = (key) => {
                const values = lastClassStudents
                    .map((student) => student[key])
                    .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
                    .map(Number);
                return values.length ? computeAverage(values) : null;
            };

            const classCompetencyRadar = buildCompetencyRadar({
                c3d: classAverageFor('c3d'),
                cpc: classAverageFor('cpc'),
                cmq: classAverageFor('cmq'),
                cprez: classAverageFor('cprez'),
                c: classAverageFor('c'),
            }).replace('<h5>Compétences</h5>', '<h5>Compétences moyennes de la classe</h5>');

            const classTermIndicators = [
                { label: 'T1', b: classAverageFor('t1b'), t: classAverageFor('t1t'), a: classAverageFor('t1a') },
                { label: 'T2', b: classAverageFor('t2b'), t: classAverageFor('t2t'), a: classAverageFor('t2a') },
                { label: 'T3', b: classAverageFor('t3b'), t: classAverageFor('t3t'), a: classAverageFor('t3a') },
            ];

            const formatSummaryValue = (value, suffix = '%') => {
                if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'N/A';
                return `${Math.round(Number(value) * 10) / 10}${suffix}`;
            };
            const getStudentAverage = (student, keys) => {
                const values = keys
                    .map((key) => student[key])
                    .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
                    .map(Number);
                return values.length ? computeAverage(values) : null;
            };
            const escapeSummaryHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
            const formatSummaryCount = (value) => value === null ? 'N/A' : value;
            const buildPeriodSummary = (label, prefix) => {
                const keys = prefix ? [`${prefix}b`, `${prefix}t`, `${prefix}a`] : ['b', 't', 'a'];
                const bKey = keys[0];
                const tKey = keys[1];
                const aKey = keys[2];
                const indicators = {
                    b: classAverageFor(bKey),
                    t: classAverageFor(tKey),
                    a: classAverageFor(aKey),
                    c: classAverageFor('c'),
                };
                const overall = computeAverage([indicators.b, indicators.t, indicators.a].filter((value) => value !== null));
                const gradeKeys = prefix ? [prefix] : ['t1', 't2', 't3'];
                const studentGradeAverages = lastClassStudents.map((student) => getStudentAverage(student, gradeKeys)).filter((value) => value !== null);
                const gradeAverage = computeAverage(studentGradeAverages);
                const toNumericValue = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
                const studentAssessments = lastClassStudents.map((student) => {
                    const studentGradeAverage = getStudentAverage(student, gradeKeys);
                    const difficultyReasons = [];
                    const inactivityReasons = [];
                    const bValue = toNumericValue(student[bKey]);
                    const tValue = toNumericValue(student[tKey]);
                    const aValue = toNumericValue(student[aKey]);
                    const cValue = toNumericValue(student.c);

                    if (aValue !== null && aValue < 50) difficultyReasons.push(`A faible (${formatSummaryValue(aValue)})`);
                    if (cValue !== null && cValue < 0) difficultyReasons.push(`C négatif (${formatSummaryValue(cValue, '')})`);
                    if (studentGradeAverage !== null && studentGradeAverage < 10) difficultyReasons.push(`moyenne faible (${formatSummaryValue(studentGradeAverage, '/20')})`);

                    if (bValue !== null && bValue < 40) inactivityReasons.push(`B inférieur à 40 % (${formatSummaryValue(bValue)})`);
                    if (tValue !== null && tValue < 40) inactivityReasons.push(`T inférieur à 40 % (${formatSummaryValue(tValue)})`);

                    return {
                        name: student.name || 'Élève sans nom',
                        difficultyReasons,
                        inactivityReasons,
                    };
                });
                return {
                    label,
                    ...indicators,
                    overall,
                    gradeAverage,
                    inactiveAndDisruptiveStudents: studentAssessments.filter((assessment) => assessment.inactivityReasons.length === 2),
                    strugglingStudents: studentAssessments.filter((assessment) => assessment.difficultyReasons.length),
                };
            };
            const classPeriodSummaries = [
                buildPeriodSummary('Trimestre 1', 't1'),
                buildPeriodSummary('Trimestre 2', 't2'),
                buildPeriodSummary('Trimestre 3', 't3'),
            ];
            const yearlySummary = buildPeriodSummary('Année', '');
            const buildClassAppreciation = (summary) => {
                const availableIndicators = [
                    { key: 'b', value: summary.b },
                    { key: 't', value: summary.t },
                    { key: 'a', value: summary.a },
                ].filter((indicator) => indicator.value !== null && indicator.value !== undefined && Number.isFinite(Number(indicator.value)));

                if (!availableIndicators.length) {
                    return 'Les éléments disponibles ne permettent pas encore de formuler une appréciation de classe.';
                }

                const variationIndex = [...summary.label].reduce((total, character) => total + character.charCodeAt(0), 0);
                const pickVariation = (sentences, offset = 0) => sentences[(variationIndex + offset) % sentences.length];
                const getIndicatorLevel = (value) => value >= 80 ? 'excellent' : value >= 65 ? 'satisfying' : value >= 50 ? 'fragile' : 'difficult';
                const getComprehensionLevel = (value) => value >= 1.5 ? 'excellent' : value >= 0.5 ? 'satisfying' : value >= -0.5 ? 'fragile' : 'difficult';
                const overall = computeAverage(availableIndicators.map((indicator) => Number(indicator.value)));
                const overallLevel = getIndicatorLevel(overall);
                const openingSentences = {
                    excellent: [
                        'La classe s’est montrée très investie et a réalisé un trimestre particulièrement convaincant.',
                        'Le groupe a travaillé avec constance et efficacité tout au long du trimestre.',
                        'La dynamique collective est très positive et porte pleinement le travail de la classe.',
                    ],
                    satisfying: [
                        'Le trimestre est satisfaisant, avec une classe globalement impliquée dans son travail.',
                        'La classe affiche une dynamique positive et un engagement régulier.',
                        'Le groupe avance de manière sérieuse et fournit un travail d’ensemble satisfaisant.',
                    ],
                    fragile: [
                        'Le bilan reste encourageant, mais l’implication de la classe manque encore de régularité.',
                        'La classe dispose de bases intéressantes qui demandent encore à être consolidées.',
                        'Le groupe progresse, même si son engagement demeure inégal selon les séances.',
                    ],
                    difficult: [
                        'Le trimestre a été difficile et la classe doit retrouver une dynamique de travail plus constructive.',
                        'Le groupe doit se mobiliser davantage pour installer des habitudes de travail efficaces.',
                        'L’investissement collectif reste trop fragile et nécessite une réaction de la classe.',
                    ],
                };
                const indicatorSentences = {
                    b: {
                        excellent: ['Le sérieux du groupe est remarquable.', 'Les élèves adoptent une attitude particulièrement sérieuse.', 'Le comportement de la classe favorise pleinement les apprentissages.'],
                        satisfying: ['Le sérieux des élèves est satisfaisant.', 'La classe adopte dans l’ensemble une attitude sérieuse.', 'Le comportement du groupe contribue à un climat de travail positif.'],
                        fragile: ['Le sérieux reste irrégulier et doit gagner en constance.', 'L’attitude de la classe est encore inégale selon les séances.', 'Le groupe doit veiller à adopter une posture plus constante.'],
                        difficult: ['Le manque de sérieux pénalise encore le travail collectif.', 'L’attitude du groupe doit évoluer pour permettre un climat plus propice aux apprentissages.', 'La classe doit rapidement retrouver un comportement plus sérieux.'],
                    },
                    t: {
                        excellent: ['La mise au travail est rapide et soutenue.', 'Les élèves entrent dans les activités avec efficacité.', 'Le groupe se met au travail avec beaucoup de constance.'],
                        satisfying: ['La mise au travail est généralement efficace.', 'Les élèves s’engagent volontiers dans les activités proposées.', 'L’entrée dans le travail est satisfaisante dans l’ensemble.'],
                        fragile: ['La mise au travail demeure parfois hésitante.', 'L’engagement dans les activités doit devenir plus régulier.', 'Le groupe gagnerait à entrer plus rapidement dans le travail.'],
                        difficult: ['La mise au travail est trop laborieuse.', 'Les élèves peinent encore à s’engager durablement dans les activités.', 'L’entrée dans le travail doit devenir une priorité pour le groupe.'],
                    },
                    a: {
                        excellent: ['La classe travaille avec une grande autonomie.', 'Les élèves savent avancer seuls avec assurance.', 'Le groupe fait preuve d’une autonomie très solide.'],
                        satisfying: ['L’autonomie de la classe est satisfaisante.', 'Les élèves savent généralement avancer seuls dans leur travail.', 'Le groupe fait preuve d’une autonomie appréciable.'],
                        fragile: ['L’autonomie reste à consolider.', 'Les élèves ont encore besoin d’être davantage guidés.', 'Le groupe gagnerait à prendre plus d’initiatives dans son travail.'],
                        difficult: ['Le manque d’autonomie freine nettement les apprentissages.', 'La classe dépend encore trop fortement de l’accompagnement du professeur.', 'Les élèves doivent apprendre à avancer plus souvent par eux-mêmes.'],
                    },
                };
                const sortedIndicators = availableIndicators.slice().sort((left, right) => Number(right.value) - Number(left.value));
                const strongest = sortedIndicators[0];
                const weakest = sortedIndicators[sortedIndicators.length - 1];
                const indicatorSummary = strongest.key === weakest.key
                    ? pickVariation(indicatorSentences[strongest.key][getIndicatorLevel(strongest.value)], 1)
                    : [
                        pickVariation(indicatorSentences[strongest.key][getIndicatorLevel(strongest.value)], 1),
                        pickVariation(indicatorSentences[weakest.key][getIndicatorLevel(weakest.value)], 2),
                    ].join(' ');
                const comprehensionValue = summary.c === null || summary.c === undefined || !Number.isFinite(Number(summary.c)) ? null : Number(summary.c);
                const comprehensionSentences = comprehensionValue === null
                    ? ['Le niveau de compréhension du groupe reste à préciser.']
                    : {
                        excellent: ['La compréhension des notions étudiées est très solide.', 'Les élèves maîtrisent avec assurance les notions abordées.', 'Le groupe montre une excellente compréhension des apprentissages.'],
                        satisfying: ['La compréhension des notions étudiées est satisfaisante.', 'Les élèves assimilent correctement les apprentissages abordés.', 'Le groupe montre une bonne compréhension d’ensemble.'],
                        fragile: ['La compréhension demeure inégale et mérite d’être consolidée.', 'Certaines notions doivent encore être reprises pour stabiliser les acquis.', 'Le groupe comprend l’essentiel, mais les acquis restent parfois fragiles.'],
                        difficult: ['La compréhension des notions étudiées reste préoccupante.', 'Les apprentissages essentiels doivent être repris et davantage accompagnés.', 'Le groupe rencontre encore des difficultés importantes de compréhension.'],
                    }[getComprehensionLevel(comprehensionValue)];
                const hasStrugglingStudents = summary.strugglingStudents.length > 0;
                const hasInactiveStudents = summary.inactiveAndDisruptiveStudents.length > 0;
                const attentionSentences = hasStrugglingStudents && hasInactiveStudents
                    ? ['Une partie du groupe a encore besoin d’un accompagnement attentif, tandis que certains élèves doivent davantage s’engager dans le travail.', 'Plusieurs élèves doivent être accompagnés avec vigilance et l’engagement dans le travail reste à renforcer pour une partie de la classe.']
                    : hasStrugglingStudents
                        ? ['Une partie de la classe a encore besoin d’un accompagnement attentif pour progresser.', 'Certains élèves doivent continuer à être soutenus afin de consolider leurs acquis.']
                        : hasInactiveStudents
                            ? ['Certains élèves doivent désormais s’engager plus activement dans le travail.', 'Une partie du groupe doit encore adopter une attitude plus constructive face au travail.']
                            : ['La dynamique actuelle permet à l’ensemble du groupe d’avancer sereinement.', 'Le groupe dispose de conditions favorables pour poursuivre ses progrès.'];

                return `${pickVariation(openingSentences[overallLevel])} ${indicatorSummary} ${pickVariation(comprehensionSentences, 3)} ${pickVariation(attentionSentences, 4)}`;
            };
            const classAppreciationsHtml = classPeriodSummaries.map((summary) => `<article class="class-appreciation-card"><h6>${summary.label}</h6><p>${escapeSummaryHtml(buildClassAppreciation(summary))}</p></article>`).join('');
            const buildEvolution = (label, fromSummary, toSummary) => {
                const indicatorLabels = { b: 'B', t: 'T', a: 'A' };
                const changes = ['b', 't', 'a'].map((key) => ({
                    label: indicatorLabels[key],
                    value: fromSummary[key] === null || toSummary[key] === null ? null : toSummary[key] - fromSummary[key],
                })).filter((change) => change.value !== null);
                if (!changes.length || fromSummary.overall === null || toSummary.overall === null) {
                    return { label, statement: 'Évolution non calculable : les indicateurs disponibles sont insuffisants.', className: 'neutral' };
                }

                const overallChange = toSummary.overall - fromSummary.overall;
                const threshold = 2;
                const direction = overallChange > threshold ? 'progresse' : overallChange < -threshold ? 'recule' : 'stagne';
                const className = direction === 'progresse' ? 'positive' : direction === 'recule' ? 'negative' : 'neutral';
                const rising = changes.filter((change) => change.value > threshold).map((change) => change.label);
                const falling = changes.filter((change) => change.value < -threshold).map((change) => change.label);
                const stable = changes.filter((change) => Math.abs(change.value) <= threshold).map((change) => change.label);
                const reasons = [];
                if (rising.length) reasons.push(`${rising.join(', ')} ${rising.length > 1 ? 'augmentent' : 'augmente'}`);
                if (falling.length) reasons.push(`${falling.join(', ')} ${falling.length > 1 ? 'reculent' : 'recule'}`);
                if (stable.length) reasons.push(`${stable.join(', ')} ${stable.length > 1 ? 'restent stables' : 'reste stable'}`);
                return { label, statement: `La classe ${direction}, car ${reasons.join(' ; ')}.`, className };
            };
            const classEvolutions = [
                buildEvolution('T1 → T2', classPeriodSummaries[0], classPeriodSummaries[1]),
                buildEvolution('T2 → T3', classPeriodSummaries[1], classPeriodSummaries[2]),
                buildEvolution('Sur l’année (T1 → T3)', classPeriodSummaries[0], classPeriodSummaries[2]),
            ];
            const evolutionCards = classEvolutions.map((evolution) => `<article class="summary-stat evolution ${evolution.className}"><span>${evolution.label}</span><p>${evolution.statement}</p></article>`).join('');
            const allPeriodSummaries = [yearlySummary, ...classPeriodSummaries];
            const termSummaryRows = allPeriodSummaries.map((term) => `<tr><th scope="row">${term.label}</th><td>${formatSummaryValue(term.b)}</td><td>${formatSummaryValue(term.t)}</td><td>${formatSummaryValue(term.a)}</td><td>${formatSummaryValue(term.c, '')}</td><td>${formatSummaryValue(term.gradeAverage, '/20')}</td><td>${formatSummaryValue(term.overall)}</td><td>${formatSummaryCount(term.inactiveAndDisruptiveStudents.length)}</td><td>${term.strugglingStudents.length}</td></tr>`).join('');
            const buildStudentFlagList = (students, reasonKey, emptyLabel) => students.length
                ? `<ul>${students.map((student) => `<li><strong>${escapeSummaryHtml(student.name)}</strong><span>${student[reasonKey].map(escapeSummaryHtml).join(' · ')}</span></li>`).join('')}</ul>`
                : `<p class="empty-summary-list">${emptyLabel}</p>`;
            const buildDetailedPeriodSummary = (summary, className = '') => `<article class="period-summary-card ${className}"><div class="period-summary-header"><h6>${summary.label}</h6><span>${summary.strugglingStudents.length} en difficulté · ${summary.inactiveAndDisruptiveStudents.length} sans travail / perturbation</span></div><div class="period-summary-columns"><section><h6>Élèves en difficulté</h6>${buildStudentFlagList(summary.strugglingStudents, 'difficultyReasons', 'Aucun élève repéré avec les critères disponibles.')}</section><section><h6>Ne travaillent pas et peuvent perturber</h6>${buildStudentFlagList(summary.inactiveAndDisruptiveStudents, 'inactivityReasons', 'Aucun élève repéré avec B et T inférieurs à 40 %.')}</section></div></article>`;
            const yearlyDetailHtml = buildDetailedPeriodSummary(yearlySummary, 'yearly-period-summary');
            const quarterlyDetailsHtml = classPeriodSummaries.map((summary) => buildDetailedPeriodSummary(summary)).join('');
            const classSummaryStyles = `<style>.class-appreciation-list,.period-summary-list{display:grid;gap:12px;margin-top:12px}.class-appreciation-list{grid-template-columns:repeat(3,minmax(0,1fr))}.class-appreciation-card{border:1px solid #93c5fd;border-left:5px solid #2563eb;border-radius:12px;background:#eff6ff;padding:12px}.class-appreciation-card h6{margin:0 0 8px;font-size:14px;color:#1e3a8a}.class-appreciation-card p{font-size:13px;color:#1e293b}.period-summary-card{border:1px solid var(--border);border-radius:12px;background:#fff;padding:12px}.period-summary-card.yearly-period-summary{border:2px solid #2563eb;background:#eff6ff}.period-summary-header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.period-summary-header h6,.period-summary-columns h6{margin:0;font-size:14px}.period-summary-header span{font-size:12px;color:#475569}.summary-stat.evolution p{margin:8px 0 0;font-size:13px;line-height:1.45;color:#334155}.period-summary-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.period-summary-columns section{border:1px solid var(--border);border-radius:9px;padding:10px;background:#f8fafc}.period-summary-columns ul{margin:8px 0 0;padding-left:20px;display:grid;gap:7px}.period-summary-columns li span{display:block;color:#475569;font-size:12px;margin-top:2px}.empty-summary-list{margin-top:8px;font-size:12px;color:#64748b}@media(max-width:760px){.class-appreciation-list,.period-summary-columns{grid-template-columns:1fr}.period-summary-header{align-items:flex-start;flex-direction:column}}</style>`;
            const classSummaryHtml = `${classSummaryStyles}<section class="class-summary" aria-labelledby="class-summary-title"><div class="class-summary-heading"><h4 id="class-summary-title">Bilan de la classe</h4><p>Un élève est repéré « en difficulté » si son indicateur A est inférieur à 50 %, si C est négatif, ou si sa moyenne scolaire est inférieure à 10/20. Un élève est repéré « sans travail / perturbation » lorsque ses indicateurs B et T sont tous les deux inférieurs à 40 %. L’avis d’évolution compare la moyenne des indicateurs B, T et A entre deux trimestres : une variation supérieure à 2 est une progression ou un recul ; sinon la classe stagne. La phrase précise quels indicateurs expliquent cet avis.</p></div><h5>Appréciations trimestrielles de la classe</h5><div class="class-appreciation-list">${classAppreciationsHtml}</div><div class="summary-stat-grid"><article class="summary-stat warning"><span>Ne travaillent pas et peuvent perturber</span><strong>${formatSummaryCount(yearlySummary.inactiveAndDisruptiveStudents.length)}</strong><small>élève${yearlySummary.inactiveAndDisruptiveStudents.length !== 1 ? 's' : ''} sur l’année</small></article><article class="summary-stat difficulty"><span>Élèves en difficulté</span><strong>${yearlySummary.strugglingStudents.length}</strong><small>élève${yearlySummary.strugglingStudents.length !== 1 ? 's' : ''} sur l’année</small></article><article class="summary-stat"><span>Niveau global annuel</span><strong>${formatSummaryValue(yearlySummary.overall)}</strong><small>moyenne B / T / A</small></article></div><h5>Évolution de la classe</h5><div class="summary-stat-grid evolution-grid">${evolutionCards}</div><h5>Synthèse annuelle et trimestrielle</h5><div class="summary-table-wrap"><table class="summary-table"><thead><tr><th>Période</th><th>B</th><th>T</th><th>A</th><th>C</th><th>Moyenne</th><th>Global B/T/A</th><th>Sans travail / perturbation</th><th>En difficulté</th></tr></thead><tbody>${termSummaryRows}</tbody></table></div><h5>Bilan annuel détaillé</h5><div class="period-summary-list">${yearlyDetailHtml}</div><h5>Bilans détaillés par trimestre</h5><div class="period-summary-list">${quarterlyDetailsHtml}</div></section>`;
            const classBarChart = (() => {
                const metrics = [
                    { key: 'b', label: 'B', className: 'bar-b' },
                    { key: 't', label: 'T', className: 'bar-t' },
                    { key: 'a', label: 'A', className: 'bar-a' },
                ];
                const bars = classTermIndicators.flatMap((term, termIndex) => metrics.map((metric, metricIndex) => {
                    const value = term[metric.key];
                    const boundedValue = value === null ? 0 : clamp(Number(value), 0, 100);
                    const height = (boundedValue / 100) * 180;
                    const x = 105 + (termIndex * 165) + (metricIndex * 38);
                    const y = 225 - height;
                    const label = value === null ? 'N/A' : `${Math.round(value * 10) / 10}%`;
                    return `<g><rect x="${x}" y="${y}" width="28" height="${height}" rx="5" class="${metric.className}"></rect><text x="${x + 14}" y="${Math.max(y - 7, 18)}" class="bar-value">${label}</text></g>`;
                })).join('');
                const termLabels = classTermIndicators.map((term, index) => `<text x="147" y="252" class="bar-term-label" transform="translate(${index * 165} 0)">${term.label}</text>`).join('');
                return `<svg viewBox="0 0 600 290" class="class-bar-chart" role="img" aria-label="Répartition moyenne des indicateurs B, T et A par trimestre"><line x1="70" y1="45" x2="70" y2="225" class="axis-line"></line><line x1="70" y1="225" x2="570" y2="225" class="axis-line"></line><line x1="70" y1="45" x2="570" y2="45" class="grid-line"></line><line x1="70" y1="135" x2="570" y2="135" class="grid-line"></line><text x="62" y="49" class="bar-axis-label">100%</text><text x="62" y="139" class="bar-axis-label">50%</text><text x="62" y="229" class="bar-axis-label">0%</text>${bars}${termLabels}<g class="bar-legend"><rect x="190" y="270" width="12" height="12" rx="2" class="bar-b"></rect><text x="208" y="280">B</text><rect x="265" y="270" width="12" height="12" rx="2" class="bar-t"></rect><text x="283" y="280">T</text><rect x="340" y="270" width="12" height="12" rx="2" class="bar-a"></rect><text x="358" y="280">A</text></g></svg>`;
            })();

            const buildDistributionChart = (title, series, bins) => {
                const chartSeries = series.map((item) => ({
                    ...item,
                    values: lastClassStudents
                        .map((student) => student[item.key])
                        .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
                        .map(Number),
                }));
                const counts = chartSeries.map((item) => bins.map((bin, binIndex) => item.values.filter((value) => (
                    bin.exact !== undefined
                        ? Math.round(value) === bin.exact
                        : value >= bin.min && (binIndex === bins.length - 1 ? value <= bin.max : value < bin.max)
                )).length));
                const maxCount = Math.max(1, ...counts.flat());
                const plotLeft = 55;
                const plotTop = 24;
                const plotBottom = 210;
                const plotWidth = 680;
                const plotHeight = plotBottom - plotTop;
                const groupWidth = plotWidth / bins.length;
                const barGap = 3;
                const barWidth = Math.max(5, Math.min(24, (groupWidth - 16) / Math.max(series.length, 1) - barGap));
                const bars = bins.flatMap((bin, binIndex) => chartSeries.map((item, seriesIndex) => {
                    const count = counts[seriesIndex][binIndex];
                    const height = (count / maxCount) * plotHeight;
                    const barsWidth = chartSeries.length * (barWidth + barGap) - barGap;
                    const x = plotLeft + (binIndex * groupWidth) + ((groupWidth - barsWidth) / 2) + (seriesIndex * (barWidth + barGap));
                    const y = plotBottom - height;
                    return `<g><rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="3" fill="${item.color}"><title>${item.label} · ${bin.label} : ${count} élève${count > 1 ? 's' : ''}</title></rect>${count ? `<text x="${x + (barWidth / 2)}" y="${Math.max(y - 5, 13)}" class="distribution-count">${count}</text>` : ''}</g>`;
                })).join('');
                const binLabels = bins.map((bin, index) => `<text x="${plotLeft + (index * groupWidth) + (groupWidth / 2)}" y="230" class="distribution-bin-label">${bin.label}</text>`).join('');
                const gridLines = [0, 0.5, 1].map((ratio) => {
                    const y = plotBottom - (ratio * plotHeight);
                    return `<line x1="${plotLeft}" y1="${y}" x2="${plotLeft + plotWidth}" y2="${y}" class="grid-line"></line><text x="${plotLeft - 8}" y="${y + 4}" class="bar-axis-label">${Math.round(maxCount * ratio)}</text>`;
                }).join('');
                const legend = chartSeries.map((item) => `<span class="distribution-legend-item"><i style="--series-color:${item.color}"></i>${item.label}</span>`).join('');
                const majority = chartSeries.map((item, seriesIndex) => {
                    if (!item.values.length) return `<span><strong>${item.label}</strong> : aucune donnée</span>`;
                    const peak = Math.max(...counts[seriesIndex]);
                    const peakLabels = bins.filter((bin, binIndex) => counts[seriesIndex][binIndex] === peak).map((bin) => bin.label).join(' / ');
                    return `<span><strong>${item.label}</strong> : majorité ${peakLabels} (${peak} élève${peak > 1 ? 's' : ''})</span>`;
                }).join('');
                return `<section class="overview-card distribution-card"><h4>${title}</h4><div class="distribution-legend">${legend}</div><svg viewBox="0 0 760 245" class="distribution-chart" role="img" aria-label="Histogramme de répartition ${title}">${gridLines}<line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotBottom}" class="axis-line"></line><line x1="${plotLeft}" y1="${plotBottom}" x2="${plotLeft + plotWidth}" y2="${plotBottom}" class="axis-line"></line>${bars}${binLabels}</svg><div class="majority-summary">${majority}</div></section>`;
            };

            const percentageBins = [
                { label: '0–20 %', min: 0, max: 20 },
                { label: '20–40 %', min: 20, max: 40 },
                { label: '40–60 %', min: 40, max: 60 },
                { label: '60–80 %', min: 60, max: 80 },
                { label: '80–100 %', min: 80, max: 100 },
            ];
            const termDistributionCharts = [
                { label: 'Trimestre 1', prefix: 't1' },
                { label: 'Trimestre 2', prefix: 't2' },
                { label: 'Trimestre 3', prefix: 't3' },
            ].map((term) => buildDistributionChart(term.label, [
                { key: `${term.prefix}b`, label: 'B', color: '#2563eb' },
                { key: `${term.prefix}t`, label: 'T', color: '#16a34a' },
                { key: `${term.prefix}a`, label: 'A', color: '#f97316' },
            ], percentageBins)).join('');
            const roundedGradeBins = Array.from({ length: 21 }, (_, grade) => ({ label: String(grade), exact: grade }));
            const gradeDistributionCharts = [
                { label: 'Moyennes du trimestre 1', key: 't1', color: '#2563eb' },
                { label: 'Moyennes du trimestre 2', key: 't2', color: '#16a34a' },
                { label: 'Moyennes du trimestre 3', key: 't3', color: '#f97316' },
            ].map((term) => buildDistributionChart(term.label, [
                { key: term.key, label: 'Nombre d’élèves', color: term.color },
            ], roundedGradeBins)).join('');
            const competencyDistributionChart = buildDistributionChart('Compétences globales (hors trimestre)', [
                { key: 'cpc', label: 'CPC', color: '#7c3aed' },
                { key: 'c3d', label: 'C3D', color: '#0891b2' },
                { key: 'cmq', label: 'CMQ', color: '#db2777' },
                { key: 'cprez', label: 'CPRez', color: '#ca8a04' },
                { key: 'c', label: 'C', color: '#475569' },
            ], [-3, -2, -1, 0, 1, 2, 3].map((value) => ({ label: String(value), exact: value })));

            const studentSortData = lastClassStudents.map((student) => ({
                name: student.name || 'Élève sans nom',
                b: student.b,
                t: student.t,
                a: student.a,
                t1b: student.t1b,
                t1t: student.t1t,
                t1a: student.t1a,
                t2b: student.t2b,
                t2t: student.t2t,
                t2a: student.t2a,
                t3b: student.t3b,
                t3t: student.t3t,
                t3a: student.t3a,
            }));
            const studentSortDataJson = JSON.stringify(studentSortData).replace(/</g, '\\u003c');

            const exportRows = lastClassStudents.map((student) => {
                const cells = ['t1b', 't1t', 't1a', 't2b', 't2t', 't2a', 't3b', 't3t', 't3a', 'cpc', 'c3d', 'cmq', 'cprez', 'c', 't1', 't2', 't3'].map((key) => {
                    const config = getIndicatorDisplayConfig(key);
                    const rawValue = student[key];
                    if (rawValue === null || rawValue === undefined) {
                        return `<td><span class="led-mode"><span class="led na"></span></span><span class="value-mode">${formatExportValue(key, rawValue)}</span></td>`;
                    }
                    const minValue = Number.isFinite(config.minValue) ? config.minValue : 0;
                    const boundedValue = clamp(rawValue, minValue, config.maxValue);
                    const hue = ((boundedValue - minValue) / (config.maxValue - minValue)) * 120;
                    const color = `hsl(${hue} 88% 48%)`;
                    return `<td><span class="led-mode"><span class="led" style="--led-color:${color};--led-glow:hsl(${hue} 92% 55% / 0.6)"></span></span><span class="value-mode">${formatExportValue(key, rawValue)}</span></td>`;
                }).join('');

                const at1 = student.at1 || 'Appréciation T1 indisponible.';
                const at2 = student.at2 || 'Appréciation T2 indisponible.';
                const at3 = student.at3 || 'Appréciation T3 indisponible.';
                const ct1 = sanitizeExportRemark(student.ct1);
                const ct2 = sanitizeExportRemark(student.ct2);
                const ct3 = sanitizeExportRemark(student.ct3);
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

                const competencyRadar = buildCompetencyRadar(student);

                return `<article class="student-card"><h4>${student.name}</h4><div class="student-block"><div class="student-subblock"><table class="inner-table"><thead><tr><th>T1B</th><th>T1T</th><th>T1A</th><th>T2B</th><th>T2T</th><th>T2A</th><th>T3B</th><th>T3T</th><th>T3A</th><th>CPC</th><th>C3D</th><th>CMQ</th><th>CPREZ</th><th>C</th><th>T1</th><th>T2</th><th>T3</th></tr></thead><tbody><tr>${cells}</tr></tbody></table></div><div class="student-content-row"><div class="appreciations-column"><div class="student-subblock"><div class="subblock-title-row"><h5>Appréciation T1</h5><div class="term-leds">${t1Leds}</div></div><p>${at1}</p><p><em>remarques: ${ct1}</em></p></div><div class="student-subblock"><div class="subblock-title-row"><h5>Appréciation T2</h5><div class="term-leds">${t2Leds}</div></div><p>${at2}</p><p><em>remarques: ${ct2}</em></p></div><div class="student-subblock"><div class="subblock-title-row"><h5>Appréciation T3</h5><div class="term-leds">${t3Leds}</div></div><p>${at3}</p><p><em>remarques: ${ct3}</em></p></div></div><div class="student-subblock evolution-subblock"><h5>Évolution <span class="title-b">B</span> / <span class="title-t">T</span> / <span class="title-a">A</span> / <span class="title-avg">moyenne</span></h5><svg viewBox="0 0 200 130" class="evolution-chart" role="img" aria-label="Graphique évolution B T A"><line x1="26" y1="30" x2="26" y2="120" class="axis-line"></line><line x1="26" y1="120" x2="186" y2="120" class="axis-line"></line><line x1="26" y1="30" x2="186" y2="30" class="grid-line"></line><line x1="26" y1="75" x2="186" y2="75" class="grid-line"></line><polyline points="${bPoints}" class="line-b"></polyline><polyline points="${tPoints}" class="line-t"></polyline><polyline points="${aPoints}" class="line-a"></polyline><polyline points="${avgPoints}" class="line-avg"></polyline><text x="20" y="34" class="axis-label">100</text><text x="20" y="79" class="axis-label">50</text><text x="20" y="124" class="axis-label">0</text></svg>${competencyRadar}</div></div></div></article>`;
            }).join('');

            viewWindow.document.write(`<html><head><title>Export voyants ${selectedClass}</title><style>:root{--bg:#f3f4f6;--panel:#ffffff;--text:#111827;--border:#d1d5db;--header:#111827;--headerText:#f9fafb;--btn:#2563eb}*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:24px;background:var(--bg);color:var(--text)}.topbar{display:flex;justify-content:flex-end;gap:8px;margin-bottom:10px}.close-btn,.export-action-btn{border:0;border-radius:8px;background:#374151;color:#fff;padding:8px 12px;cursor:pointer;font-weight:600}.export-action-btn{background:var(--btn)}.panel{max-width:1200px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:0 8px 24px rgba(17,24,39,.08)}h3{margin:0 0 8px 0}p{margin:0;color:#374151;line-height:1.45;white-space:pre-wrap}.student-grid{display:grid;grid-template-columns:1fr;gap:12px}.student-card{border:1px solid var(--border);border-radius:12px;background:#f8fafc;padding:12px}.student-card h4{margin:0 0 10px 0}.student-block{display:grid;gap:10px}.student-content-row{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:10px;align-items:stretch}.appreciations-column{display:grid;gap:10px}.student-subblock{border:1px solid var(--border);border-radius:10px;background:#fff;padding:10px}.student-subblock h5{margin:0 0 8px 0}.subblock-title-row{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.term-leds{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.mini-led-wrap{display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:12px;color:#4b5563}.value-mode{display:none;font-weight:700;color:#111827}.value-pill{border:1px solid var(--border);border-radius:999px;background:#f9fafb;padding:2px 7px;white-space:nowrap}body.values-mode .led-mode{display:none}body.values-mode .value-mode{display:inline-flex}table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--border);padding:8px 10px;text-align:center}th{background:var(--header);color:var(--headerText);text-align:center}.inner-table th,.inner-table td{white-space:nowrap}.led{display:inline-block;width:13px;height:13px;border-radius:999px;background:var(--led-color,#6b7280);box-shadow:0 0 10px var(--led-glow,rgba(107,114,128,.45));margin-right:0;vertical-align:-1px}.led.na{background:#6b7280;box-shadow:0 0 10px rgba(107,114,128,.45)}.evolution-subblock{display:flex;flex-direction:column}.evolution-chart,.radar-chart{width:100%;height:auto}.radar-chart-wrap{border-top:1px solid var(--border);margin-top:10px;padding-top:10px}.radar-chart-wrap h5{margin:0 0 6px 0}.axis-line{stroke:#9ca3af;stroke-width:1}.grid-line{stroke:#e5e7eb;stroke-width:1}.line-b,.line-t,.line-a,.line-avg{fill:none;stroke-width:2.5}.line-b{stroke:#2563eb}.line-t{stroke:#16a34a}.line-a{stroke:#f97316}.line-avg{stroke:#dc2626}.axis-label{font-size:10px;fill:#6b7280;text-anchor:end}.radar-ring{fill:none;stroke:#d1d5db;stroke-width:1}.radar-ring-max{stroke:#9ca3af}.radar-axis{stroke:#e5e7eb;stroke-width:1}.radar-area{fill:rgba(124,58,237,.18);stroke:none}.radar-line{fill:none;stroke:#7c3aed;stroke-width:2.4}.radar-center{fill:#6b7280}.radar-label{font-size:10px;fill:#374151;text-anchor:middle;font-weight:700}.radar-scale{font-size:9px;fill:#6b7280}.title-b{color:#2563eb}.title-t{color:#16a34a}.title-a{color:#f97316}.title-avg{color:#dc2626}.modal-backdrop{position:fixed;inset:0;background:rgba(17,24,39,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:10}.modal-backdrop[hidden]{display:none}.student-list-modal{width:min(720px,100%);max-height:86vh;overflow:auto}.modal-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.modal-header h3{margin:0}.sort-controls,.period-controls{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.period-controls{margin-bottom:4px}.sort-controls button,.period-controls button{border:1px solid var(--border);border-radius:999px;background:#fff;padding:7px 12px;cursor:pointer;font-weight:700}.sort-controls button.active,.period-controls button.active{background:var(--header);color:var(--headerText)}.list-context{margin:6px 0 0 0;color:#374151;font-weight:700}.student-list-table td:first-child,.student-list-table th:first-child{text-align:left}.class-overview-modal{width:min(1000px,100%);max-height:90vh;overflow:auto}.class-overview-grid{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(420px,1.4fr);gap:16px;margin-top:16px}.overview-card{border:1px solid var(--border);border-radius:12px;background:#f8fafc;padding:14px}.overview-card h4{margin:0 0 10px}.overview-card .radar-chart-wrap{border-top:0;margin-top:0;padding-top:0}.distribution-section{display:grid;gap:16px;margin-top:16px}.distribution-card{background:#fff}.distribution-chart{width:100%;height:auto;min-width:600px}.distribution-scroll{display:grid;gap:16px;overflow-x:auto}.distribution-count,.distribution-bin-label{fill:#374151;font-size:10px;font-weight:700;text-anchor:middle}.distribution-legend{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px;color:#374151;font-size:12px;font-weight:700}.distribution-legend-item{display:inline-flex;align-items:center;gap:5px}.distribution-legend-item i{width:11px;height:11px;border-radius:3px;background:var(--series-color)}.majority-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.majority-summary span{border:1px solid var(--border);border-radius:999px;background:#f8fafc;padding:5px 9px;color:#374151;font-size:12px}.bar-b{fill:#2563eb}.bar-t{fill:#16a34a}.bar-a{fill:#f97316}.bar-value,.bar-term-label,.bar-axis-label,.bar-legend text{fill:#374151;font-size:11px;font-weight:700;text-anchor:middle}.bar-axis-label{text-anchor:end}.bar-legend text{text-anchor:start}.class-overview-intro{margin-top:4px}.distribution-note{margin-top:8px;font-size:13px}.class-summary{margin-top:18px;border-top:2px solid var(--border);padding-top:18px}.class-summary-heading{margin-bottom:14px}.class-summary-heading h4,.class-summary h5{margin:0 0 7px}.class-summary h5{margin-top:18px}.summary-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.summary-stat{display:flex;flex-direction:column;gap:4px;border:1px solid var(--border);border-left:5px solid #2563eb;border-radius:10px;background:#f8fafc;padding:12px}.summary-stat.warning{border-left-color:#dc2626}.summary-stat.difficulty{border-left-color:#d97706}.summary-stat.positive{border-left-color:#16a34a}.summary-stat.negative{border-left-color:#dc2626}.summary-stat.neutral{border-left-color:#64748b}.summary-stat span{font-size:13px;font-weight:700;color:#374151}.summary-stat strong{font-size:24px}.summary-stat small{color:#6b7280}.summary-table-wrap{overflow-x:auto}.summary-table th:first-child,.summary-table td:first-child{text-align:left}.summary-table th{white-space:nowrap}.summary-table tbody th{background:#f8fafc;color:#111827}.class-summary-heading p{font-size:13px}@media(max-width:760px){.class-overview-grid,.summary-stat-grid{grid-template-columns:1fr}}</style></head><body><div class="topbar"><button type="button" class="export-action-btn" id="toggle-export-values">Valeurs affichées</button><button type="button" class="export-action-btn" id="open-class-overview">Classe</button><button type="button" class="export-action-btn" id="open-student-list">Liste des élèves</button><button type="button" class="close-btn" id="close-export-window" onclick="window.close();return false;">Fermer</button></div><div class="panel"><h3>Bilan de la classe ${selectedClass}</h3><div class="student-grid">${exportRows || '<p>Aucun élève chargé.</p>'}</div></div><div class="modal-backdrop" id="class-overview-modal" hidden><div class="panel class-overview-modal" role="dialog" aria-modal="true" aria-labelledby="class-overview-title"><div class="modal-header"><div><h3 id="class-overview-title">Vision globale - ${selectedClass}</h3><p class="class-overview-intro">Moyennes calculées à partir des indicateurs renseignés pour les ${lastClassStudents.length} élèves chargés.</p></div><button type="button" class="close-btn" id="close-class-overview">Fermer</button></div><div class="class-overview-grid"><section class="overview-card"><h4>Radar de la classe</h4>${classCompetencyRadar}</section><section class="overview-card"><h4>Moyennes B / T / A par trimestre</h4>${classBarChart}<p class="distribution-note">Les histogrammes ci-dessous montrent les effectifs par tranche et indiquent où se situe la majorité des élèves.</p></section></div><div class="distribution-section"><section><h4>Répartition des moyennes trimestrielles</h4><p class="distribution-note">Chaque moyenne est arrondie à l’entier le plus proche puis répartie sur l’échelle de 0 à 20. La hauteur indique le nombre d’élèves.</p><div class="distribution-scroll">${gradeDistributionCharts}</div></section><section><h4>Répartition des indicateurs B / T / A</h4><div class="distribution-scroll">${termDistributionCharts}</div></section><div class="distribution-scroll">${competencyDistributionChart}</div></div>${classSummaryHtml}</div></div><div class="modal-backdrop" id="student-list-modal" hidden><div class="panel student-list-modal" role="dialog" aria-modal="true" aria-labelledby="student-list-title"><div class="modal-header"><div><h3 id="student-list-title">Liste des élèves - ${selectedClass}</h3><p>Tri décroissant par B, T ou A selon la période choisie.</p><p id="student-list-context" class="list-context">Période : année • tri : B</p></div><button type="button" class="close-btn" id="close-student-list">Fermer</button></div><div class="period-controls" aria-label="Choisir la période"><button type="button" data-period="year" class="active">Année</button><button type="button" data-period="t1">T1</button><button type="button" data-period="t2">T2</button><button type="button" data-period="t3">T3</button></div><div class="sort-controls" aria-label="Trier les élèves"><button type="button" data-sort="b" class="active">B</button><button type="button" data-sort="t">T</button><button type="button" data-sort="a">A</button></div><table class="student-list-table"><thead><tr><th>Élève</th><th>B</th><th>T</th><th>A</th></tr></thead><tbody id="student-list-body"></tbody></table></div></div><script>(function(){const closeBtn=document.getElementById('close-export-window');if(closeBtn){closeBtn.addEventListener('click',()=>{window.close();if(!window.closed){window.open('','_self');window.close();}});}const toggleBtn=document.getElementById('toggle-export-values');if(toggleBtn){toggleBtn.addEventListener('click',()=>{const isValues=document.body.classList.toggle('values-mode');toggleBtn.textContent=isValues?'Voyants LED':'Valeurs affichées';});}const students=${studentSortDataJson};const periods={year:{label:'Année',keys:{b:'b',t:'t',a:'a'}},t1:{label:'T1',keys:{b:'t1b',t:'t1t',a:'t1a'}},t2:{label:'T2',keys:{b:'t2b',t:'t2t',a:'t2a'}},t3:{label:'T3',keys:{b:'t3b',t:'t3t',a:'t3a'}}};let activeSort='b';let activePeriod='year';const modal=document.getElementById('student-list-modal');const classModal=document.getElementById('class-overview-modal');const openClassBtn=document.getElementById('open-class-overview');const closeClassBtn=document.getElementById('close-class-overview');if(openClassBtn&&classModal){openClassBtn.addEventListener('click',()=>{classModal.hidden=false;});}if(closeClassBtn&&classModal){closeClassBtn.addEventListener('click',()=>{classModal.hidden=true;});classModal.addEventListener('click',(event)=>{if(event.target===classModal)classModal.hidden=true;});}const listBody=document.getElementById('student-list-body');const context=document.getElementById('student-list-context');const formatValue=(value)=>{const numericValue=Number(value);if(!Number.isFinite(numericValue))return 'N/A';const rounded=Math.round(numericValue*10)/10;return rounded+'%';};const escapeHtml=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));const getPeriodValue=(student,periodKey,metricKey)=>{const period=periods[periodKey]||periods.year;return student[period.keys[metricKey]];};const renderList=(sortKey=activeSort,periodKey=activePeriod)=>{if(!listBody)return;activeSort=sortKey;activePeriod=periods[periodKey]?periodKey:'year';const period=periods[activePeriod];const sorted=[...students].sort((lhs,rhs)=>{const left=Number.isFinite(Number(getPeriodValue(lhs,activePeriod,activeSort)))?Number(getPeriodValue(lhs,activePeriod,activeSort)):-Infinity;const right=Number.isFinite(Number(getPeriodValue(rhs,activePeriod,activeSort)))?Number(getPeriodValue(rhs,activePeriod,activeSort)):-Infinity;return right-left||String(lhs.name).localeCompare(String(rhs.name),'fr');});listBody.innerHTML=sorted.map((student)=>'<tr><td>'+escapeHtml(student.name)+'</td><td>'+formatValue(getPeriodValue(student,activePeriod,'b'))+'</td><td>'+formatValue(getPeriodValue(student,activePeriod,'t'))+'</td><td>'+formatValue(getPeriodValue(student,activePeriod,'a'))+'</td></tr>').join('')||'<tr><td colspan="4">Aucun élève chargé.</td></tr>';document.querySelectorAll('[data-sort]').forEach((button)=>button.classList.toggle('active',button.dataset.sort===activeSort));document.querySelectorAll('[data-period]').forEach((button)=>button.classList.toggle('active',button.dataset.period===activePeriod));if(context){context.textContent='Période : '+period.label+' • tri : '+activeSort.toUpperCase();}};const openListBtn=document.getElementById('open-student-list');if(openListBtn&&modal){openListBtn.addEventListener('click',()=>{renderList(activeSort,activePeriod);modal.hidden=false;});}const closeListBtn=document.getElementById('close-student-list');if(closeListBtn&&modal){closeListBtn.addEventListener('click',()=>{modal.hidden=true;});modal.addEventListener('click',(event)=>{if(event.target===modal)modal.hidden=true;});}document.querySelectorAll('[data-sort]').forEach((button)=>button.addEventListener('click',()=>renderList(button.dataset.sort,activePeriod)));document.querySelectorAll('[data-period]').forEach((button)=>button.addEventListener('click',()=>renderList(activeSort,button.dataset.period)));})();<\/script></body></html>`);
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
