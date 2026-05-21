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
    const indicatorBElement = document.getElementById('selected-class-indicator-b');
    const indicatorTElement = document.getElementById('selected-class-indicator-t');
    const indicatorAElement = document.getElementById('selected-class-indicator-a');
    const indicatorCpcElement = document.getElementById('selected-class-indicator-cpc');
    const indicatorC3dElement = document.getElementById('selected-class-indicator-c3d');
    const indicatorCmqElement = document.getElementById('selected-class-indicator-cmq');
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
    const classEvalButton = document.getElementById('class-eval-button');
    const exportBminusCsvButton = document.getElementById('export-bminus-csv-button');
    const evalPopupElement = document.getElementById('eval-popup');
    const evalPopupTitle = document.getElementById('eval-popup-title');
    const evalBMinusButton = document.getElementById('eval-bminus');
    const evalTPlusButton = document.getElementById('eval-tplus');
    const evalTMinusButton = document.getElementById('eval-tminus');
    const evalAPlusButton = document.getElementById('eval-aplus');
    const evalAMinusButton = document.getElementById('eval-aminus');
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

    if (!classNameElement || !studentsCountElement || !indicatorBElement || !indicatorTElement || !indicatorAElement || !indicatorCpcElement || !indicatorC3dElement || !indicatorCmqElement || !indicatorT1Element || !indicatorT2Element || !indicatorT3Element) {
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
            cpc: parsePercentage(row[idxMap.indicatorCpcIdx]),
            c3d: parsePercentage(row[idxMap.indicatorC3dIdx]),
            cmq: parsePercentage(row[idxMap.indicatorCmqIdx]),
            t1: parsePercentage(row[idxMap.indicatorT1Idx]),
            t2: parsePercentage(row[idxMap.indicatorT2Idx]),
            t3: parsePercentage(row[idxMap.indicatorT3Idx]),
        };
    }

    function getIndicatorDisplayConfig(key) {
        if (['t1', 't2', 't3'].includes(key)) {
            return { maxValue: 20, suffix: '/20' };
        }
        if (['cpc', 'c3d', 'cmq'].includes(key)) {
            return { minValue: -3, maxValue: 3, suffix: '' };
        }
        return { maxValue: 100, suffix: '%' };
    }

    function buildTeams(students) {
        const TEAM_COUNT = 6;
        const METRICS = ['b', 't', 'a', 'cpc', 'c3d', 'cmq', 't1', 't2', 't3'];
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

        ['b', 't', 'a', 'cpc', 'c3d', 'cmq', 't1', 't2', 't3'].forEach((key) => {
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
                b: computeAverage(team.map((student) => student.b).filter((value) => value !== null)),
                t: computeAverage(team.map((student) => student.t).filter((value) => value !== null)),
                a: computeAverage(team.map((student) => student.a).filter((value) => value !== null)),
                cpc: computeAverage(team.map((student) => student.cpc).filter((value) => value !== null)),
                c3d: computeAverage(team.map((student) => student.c3d).filter((value) => value !== null)),
                cmq: computeAverage(team.map((student) => student.cmq).filter((value) => value !== null)),
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
                name.className = 'team-student-name';
                name.textContent = student.name;
                const studentEvalButton = document.createElement('button');
                studentEvalButton.type = 'button';
                studentEvalButton.className = 'team-details-button';
                studentEvalButton.textContent = '📝';
                studentEvalButton.title = `Évaluer ${student.name}`;
                studentEvalButton.addEventListener('click', () => openEvaluationPopup(student.name, [student.name]));

                const studentIndicators = createIndicatorsRow({
                    b: student.b,
                    t: student.t,
                    a: student.a,
                    cpc: student.cpc,
                    c3d: student.c3d,
                    cmq: student.cmq,
                    t1: student.t1,
                    t2: student.t2,
                    t3: student.t3
                });
                studentIndicators.classList.add('team-student-indicators');

                const studentActions = document.createElement('div');
                studentActions.className = 'team-student-actions';
                studentActions.appendChild(studentEvalButton);

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
                sessionMap[studentName] = { b: 0, t: 0, a: 0, comments: [] };
                changed = true;
            } else {
                if (!Array.isArray(sessionMap[studentName].comments)) {
                    sessionMap[studentName].comments = [];
                    changed = true;
                }
                if (!Number.isFinite(Number(sessionMap[studentName].b))) {
                    sessionMap[studentName].b = 0;
                    changed = true;
                }
                if (!Number.isFinite(Number(sessionMap[studentName].t))) {
                    sessionMap[studentName].t = 0;
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
        pendingEvaluation = { studentNames, bDelta: 0, tDelta: 0, aDelta: 0, isClassEvaluation: label === 'Classe' };
        const evaluatedSessionLabel = getEvaluatedSessionLabel();
        evalPopupTitle.textContent = `Évaluer : ${label} (${evaluatedSessionLabel})`;
        evalCommentElement.value = '';
        [evalBMinusButton, evalTPlusButton, evalTMinusButton, evalAPlusButton, evalAMinusButton].forEach((button) => button.classList.remove('selected'));
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
            sessionMap[studentName] = { b: 0, t: 0, a: 0, comments: [] };
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
        const rows = lastClassStudents.map((student) => [student.name, sessionMap[student.name] || { b: 0, t: 0, a: 0, comments: [] }]);
        const sessionDate = selectedSessionLabel || getActiveSessionKey();
        const selectedClass = (getSelectedClass() || 'inconnue').toUpperCase().trim();
        const viewWindow = window.open('', '_blank');
        if (!viewWindow) {
            teamsPopupStatusElement.textContent = 'Impossible d’ouvrir la fenêtre du tableau (popup bloquée).';
            return;
        }
        const tableRows = rows.length ? rows.map(([name, scores]) => {
            const b = Number(scores.b) || 0;
            const t = Number(scores.t) || 0;
            const a = Number(scores.a) || 0;
            const bHue = ((clamp(b, -3, 3) + 3) / 6) * 120;
            const tHue = ((clamp(t, -3, 3) + 3) / 6) * 120;
            const aHue = ((clamp(a, -3, 3) + 3) / 6) * 120;
            const comments = Array.isArray(scores.comments) ? scores.comments.join(' | ') : '';
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
        const first = studentNames.length ? (sessionMap[studentNames[0]] || { b: 0, t: 0, a: 0 }) : { b: 0, t: 0, a: 0 };
        const baseB = Number(first.b) || 0;
        const baseT = Number(first.t) || 0;
        const baseA = Number(first.a) || 0;
        const bDelta = pendingEvaluation ? pendingEvaluation.bDelta : 0;
        const tDelta = pendingEvaluation ? pendingEvaluation.tDelta : 0;
        const aDelta = pendingEvaluation ? pendingEvaluation.aDelta : 0;
        const tentativeB = clamp(baseB + bDelta, -3, 3);
        const bonusTDeltaFromB = tentativeB < 0 ? -1 : 0;
        const tentativeT = clamp(baseT + tDelta + bonusTDeltaFromB, -3, 3);
        const tentativeA = clamp(baseA + aDelta, -3, 3);
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
        const minValue = Number.isFinite(options.minValue) ? options.minValue : 0;
        const maxValue = Number.isFinite(options.maxValue) && options.maxValue > minValue ? options.maxValue : 100;
        const suffix = options.suffix || '%';

        if (value === null) {
            indicatorElement.style.setProperty('--indicator-color', '#6b7280');
            indicatorElement.style.setProperty('--indicator-glow', 'rgba(107, 114, 128, 0.45)');
            indicatorElement.title = 'Donnée indisponible';
            return;
        }

        const boundedValue = clamp(value, minValue, maxValue);
        const range = maxValue - minValue;
        const hue = ((boundedValue - minValue) / range) * 120;
        const color = `hsl(${hue} 88% 48%)`;
        const glow = `hsl(${hue} 92% 55% / 0.6)`;

        indicatorElement.style.setProperty('--indicator-color', color);
        indicatorElement.style.setProperty('--indicator-glow', glow);
        indicatorElement.title = suffix === '%' ? `${boundedValue.toFixed(1)} %` : `${boundedValue.toFixed(1)}${suffix ? ` ${suffix}` : ''}`;
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
            return { studentsCount: 0, averageB: null, averageT: null, averageA: null, averageCpc: null, averageC3d: null, averageCmq: null, averageT1: null, averageT2: null, averageT3: null, students: [] };
        }

        const header = rows[0].map((cell) => normalize(cell));
        const classIdx = header.findIndex((col) => col === 'classe');
        const nameIdx = header.findIndex((col) => col === 'nom');
        const indicatorBIdx = header.findIndex((col) => col === 'b');
        const indicatorTIdx = header.findIndex((col) => col === 't');
        const indicatorAIdx = header.findIndex((col) => col === 'a');
        const indicatorCpcIdx = header.findIndex((col) => col === 'cpc');
        const indicatorC3dIdx = header.findIndex((col) => col === 'c3d');
        const indicatorCmqIdx = header.findIndex((col) => col === 'cmq');
        const indicatorT1Idx = header.findIndex((col) => col === 't1');
        const indicatorT2Idx = header.findIndex((col) => col === 't2');
        const indicatorT3Idx = header.findIndex((col) => col === 't3');

        if (classIdx === -1 || nameIdx === -1 || indicatorBIdx === -1 || indicatorTIdx === -1 || indicatorAIdx === -1 || indicatorCpcIdx === -1 || indicatorC3dIdx === -1 || indicatorCmqIdx === -1 || indicatorT1Idx === -1 || indicatorT2Idx === -1 || indicatorT3Idx === -1) {
            throw new Error('Colonnes attendues introuvables (classe / nom / B / T / A / CPC / C3D / CMQ / T1 / T2 / T3).');
        }

        const normalizedSelectedClass = normalize(selectedClass);
        const classRows = rows
            .slice(1)
            .filter((row) => normalize(row[classIdx]) === normalizedSelectedClass && (row[nameIdx] || '').trim());

        const bValues = classRows.map((row) => parsePercentage(row[indicatorBIdx])).filter((value) => value !== null);
        const tValues = classRows.map((row) => parsePercentage(row[indicatorTIdx])).filter((value) => value !== null);
        const aValues = classRows.map((row) => parsePercentage(row[indicatorAIdx])).filter((value) => value !== null);
        const cpcValues = classRows.map((row) => parsePercentage(row[indicatorCpcIdx])).filter((value) => value !== null);
        const c3dValues = classRows.map((row) => parsePercentage(row[indicatorC3dIdx])).filter((value) => value !== null);
        const cmqValues = classRows.map((row) => parsePercentage(row[indicatorCmqIdx])).filter((value) => value !== null);
        const t1Values = classRows.map((row) => parsePercentage(row[indicatorT1Idx])).filter((value) => value !== null);
        const t2Values = classRows.map((row) => parsePercentage(row[indicatorT2Idx])).filter((value) => value !== null);
        const t3Values = classRows.map((row) => parsePercentage(row[indicatorT3Idx])).filter((value) => value !== null);

        const students = classRows.map((row) => parseStudentData(row, {
            nameIdx,
            indicatorBIdx,
            indicatorTIdx,
            indicatorAIdx,
            indicatorCpcIdx,
            indicatorC3dIdx,
            indicatorCmqIdx,
            indicatorT1Idx,
            indicatorT2Idx,
            indicatorT3Idx,
        }));

        return {
            studentsCount: classRows.length,
            averageB: computeAverage(bValues),
            averageT: computeAverage(tValues),
            averageA: computeAverage(aValues),
            averageCpc: computeAverage(cpcValues),
            averageC3d: computeAverage(c3dValues),
            averageCmq: computeAverage(cmqValues),
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
            setIndicatorLight(indicatorCpcElement, null);
            setIndicatorLight(indicatorC3dElement, null);
            setIndicatorLight(indicatorCmqElement, null);
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
            setIndicatorLight(indicatorCpcElement, null);
            setIndicatorLight(indicatorC3dElement, null);
            setIndicatorLight(indicatorCmqElement, null);
            setIndicatorLight(indicatorT1Element, null);
            setIndicatorLight(indicatorT2Element, null);
            setIndicatorLight(indicatorT3Element, null);
            if (statusElement) {
                statusElement.textContent = 'Cette classe ne fait pas partie des classes prises en charge (3E, 4E ou 5E).';
            }
            return;
        }

        studentsCountElement.textContent = `Effectif (${classConfig.level}) : Chargement...`;
        setIndicatorLight(indicatorBElement, null);
        setIndicatorLight(indicatorTElement, null);
        setIndicatorLight(indicatorAElement, null);
        setIndicatorLight(indicatorCpcElement, null);
        setIndicatorLight(indicatorC3dElement, null);
        setIndicatorLight(indicatorCmqElement, null);
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
            setIndicatorLight(indicatorCpcElement, classData.averageCpc, getIndicatorDisplayConfig('cpc'));
            setIndicatorLight(indicatorC3dElement, classData.averageC3d, getIndicatorDisplayConfig('c3d'));
            setIndicatorLight(indicatorCmqElement, classData.averageCmq, getIndicatorDisplayConfig('cmq'));
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
            setIndicatorLight(indicatorBElement, null);
            setIndicatorLight(indicatorTElement, null);
            setIndicatorLight(indicatorAElement, null);
            setIndicatorLight(indicatorCpcElement, null);
            setIndicatorLight(indicatorC3dElement, null);
            setIndicatorLight(indicatorCmqElement, null);
            setIndicatorLight(indicatorT1Element, null);
            setIndicatorLight(indicatorT2Element, null);
            setIndicatorLight(indicatorT3Element, null);
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
            const byName = new Map(lastClassStudents.map((student) => [student.name, student]));
            currentTeams = savedTeams.map((team) => team.map((name) => byName.get(name)).filter(Boolean));
            renderTeams(currentTeams);
            updateTeamStatusMessage();
            teamsPopupStatusElement.textContent = 'Équipes rechargées depuis la sauvegarde.';
            return true;
        } catch (error) {
            teamsPopupStatusElement.textContent = 'Sauvegarde invalide.';
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
    if (evalBMinusButton) {
        evalBMinusButton.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            pendingEvaluation.bDelta -= 1;
            evalBMinusButton.classList.add('selected');
            updateSessionLeds(pendingEvaluation.studentNames);
        });
    }
    if (evalTPlusButton) {
        evalTPlusButton.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            pendingEvaluation.tDelta += 1;
            evalTPlusButton.classList.add('selected');
            updateSessionLeds(pendingEvaluation.studentNames);
        });
    }
    if (evalTMinusButton) {
        evalTMinusButton.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            pendingEvaluation.tDelta -= 1;
            evalTMinusButton.classList.add('selected');
            updateSessionLeds(pendingEvaluation.studentNames);
        });
    }
    if (evalAPlusButton) {
        evalAPlusButton.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            pendingEvaluation.aDelta += 1;
            evalAPlusButton.classList.add('selected');
            updateSessionLeds(pendingEvaluation.studentNames);
        });
    }
    if (evalAMinusButton) {
        evalAMinusButton.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            pendingEvaluation.aDelta -= 1;
            evalAMinusButton.classList.add('selected');
            updateSessionLeds(pendingEvaluation.studentNames);
        });
    }
    if (evalValidateButton) {
        evalValidateButton.addEventListener('click', () => {
            if (!pendingEvaluation) return;
            const comment = (evalCommentElement.value || '').trim();
            const sessionMap = getSessionScoresMap();
            pendingEvaluation.studentNames.forEach((studentName) => {
                if (!sessionMap[studentName] || typeof sessionMap[studentName] !== 'object') {
                    sessionMap[studentName] = { b: 0, t: 0, a: 0, comments: [] };
                }
                const currentB = Number(sessionMap[studentName].b) || 0;
                const currentT = Number(sessionMap[studentName].t) || 0;
                const currentA = Number(sessionMap[studentName].a) || 0;
                const tentativeB = currentB + pendingEvaluation.bDelta;
                const bonusTDeltaFromB = tentativeB < 0 ? -1 : 0;
                sessionMap[studentName].b = clamp(tentativeB, -3, 3);
                sessionMap[studentName].t = clamp(currentT + pendingEvaluation.tDelta + bonusTDeltaFromB, -3, 3);
                sessionMap[studentName].a = clamp(currentA + pendingEvaluation.aDelta, -3, 3);
                if (!Array.isArray(sessionMap[studentName].comments)) {
                    sessionMap[studentName].comments = [];
                }
                if (comment && !pendingEvaluation.isClassEvaluation) {
                    sessionMap[studentName].comments.push(comment);
                }
            });
            if (comment && pendingEvaluation.isClassEvaluation) {
                if (!Array.isArray(sessionMap.__classComments)) {
                    sessionMap.__classComments = [];
                }
                sessionMap.__classComments.push(comment);
            }
            saveSessionScoresMap(sessionMap);
            evalPopupElement.hidden = true;
            pendingEvaluation = null;
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
            const exportRows = lastClassStudents.map((student) => {
                const cells = ['b', 't', 'a', 'cpc', 'c3d', 'cmq', 't1', 't2', 't3'].map((key) => {
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
                const bValue = Number.isFinite(student.b) ? student.b : 0;
                const tValue = Number.isFinite(student.t) ? student.t : 0;
                const aValue = Number.isFinite(student.a) ? student.a : 0;
                const cpcValue = Number.isFinite(student.cpc) ? student.cpc : '';
                const c3dValue = Number.isFinite(student.c3d) ? student.c3d : '';
                const cmqValue = Number.isFinite(student.cmq) ? student.cmq : '';
                const t1Value = Number.isFinite(student.t1) ? student.t1 : '';
                const t2Value = Number.isFinite(student.t2) ? student.t2 : '';
                const t3Value = Number.isFinite(student.t3) ? student.t3 : '';
                const sessionMap = getSessionScoresMap();
                const studentSessionData = sessionMap && typeof sessionMap[student.name] === 'object' ? sessionMap[student.name] : null;
                const studentComments = studentSessionData && Array.isArray(studentSessionData.comments) ? studentSessionData.comments : [];
                const commentsPayload = encodeURIComponent(studentComments.join(' || '));
                return `<tr><td>${student.name}</td>${cells}<td><button type="button" class="note-btn" data-student="${student.name.replace(/"/g, '&quot;')}" data-b="${bValue}" data-t="${tValue}" data-a="${aValue}" data-cpc="${cpcValue}" data-c3d="${c3dValue}" data-cmq="${cmqValue}" data-t1="${t1Value}" data-t2="${t2Value}" data-t3="${t3Value}" data-comments="${commentsPayload}">Appréciation</button></td></tr>`;
            }).join('');
            viewWindow.document.write(`<html><head><title>Export voyants ${selectedClass}</title><style>:root{--bg:#f3f4f6;--panel:#ffffff;--text:#111827;--muted:#6b7280;--border:#d1d5db;--header:#111827;--headerText:#f9fafb;--btn:#2563eb}*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:24px;background:var(--bg);color:var(--text)}.topbar{display:flex;justify-content:flex-end;gap:8px;margin-bottom:10px}.close-btn,.note-btn,.class-note-btn{border:0;border-radius:8px;background:var(--btn);color:#fff;padding:8px 12px;cursor:pointer;font-weight:600}.close-btn{background:#374151}.note-btn,.class-note-btn{font-size:.86rem}.close-btn:hover,.note-btn:hover,.class-note-btn:hover{filter:brightness(1.05)}.panel{max-width:1080px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:0 8px 24px rgba(17,24,39,.08)}h3{margin:0 0 8px 0}p{margin:0 0 16px 0;color:var(--muted)}table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--border);padding:8px 10px}th{background:var(--header);color:var(--headerText);text-align:left}td{white-space:nowrap}.led{display:inline-block;width:13px;height:13px;border-radius:999px;background:var(--led-color,#6b7280);box-shadow:0 0 10px var(--led-glow,rgba(107,114,128,.45));margin-right:8px;vertical-align:-1px}.led.na{background:#6b7280;box-shadow:0 0 10px rgba(107,114,128,.45)}</style></head><body><div class="topbar"><button type="button" class="class-note-btn" id="class-note-button">Appréciation classe</button><button type="button" class="close-btn" id="close-export-window">Fermer</button></div><div class="panel"><h3>Bilan de la classe ${selectedClass}</h3><table><thead><tr><th>Élève</th><th>B</th><th>T</th><th>A</th><th>CPC</th><th>C3D</th><th>CMQ</th><th>T1</th><th>T2</th><th>T3</th><th>Appréciation</th></tr></thead><tbody>${exportRows || '<tr><td colspan="11">Aucun élève chargé.</td></tr>'}</tbody></table></div><script>(function(){const closeBtn=document.getElementById('close-export-window');const classBtn=document.getElementById('class-note-button');if(closeBtn){closeBtn.addEventListener('click',()=>window.close());}function levelPercent(v){if(v>=90)return 'excellent';if(v>=75)return 'très satisfaisant';if(v>=60)return 'correct';if(v>=40)return 'fragile';return 'insuffisant';}function levelTrimester(v){if(v>=16)return 'excellent';if(v>=14)return 'très bon';if(v>=12)return 'satisfaisant';if(v>=10)return 'juste suffisant';if(v>=8)return 'fragile';return 'très insuffisant';}function normalizeComments(raw){const decoded=decodeURIComponent(raw||'');return decoded.split(' || ').map((c)=>c.trim()).filter(Boolean);}function levelCompetency(v){if(!Number.isFinite(v))return 'non évalué';if(v<0)return 'en difficulté';if(v===0)return 'indéterminé / neutre';if(v===1)return 'niveau correct';return 'maîtrise';}function classifyComments(comments){const oralPlus=[];const oralMinus=[];const comprehensionPlus=[];const comprehensionMinus=[];const others=[];comments.forEach((comment)=>{const c=(comment||'').trim();if(!c)return;const upper=c.toUpperCase();const hasPPlus=upper.includes('P+');const hasPMinus=upper.includes('P-');const hasCPlus=upper.includes('C+');const hasCMinus=upper.includes('C-');if(hasPPlus)oralPlus.push(c);if(hasPMinus)oralMinus.push(c);if(hasCPlus)comprehensionPlus.push(c);if(hasCMinus)comprehensionMinus.push(c);if(!hasPPlus&&!hasPMinus&&!hasCPlus&&!hasCMinus)others.push(c);});return {oralPlus,oralMinus,comprehensionPlus,comprehensionMinus,others};}function copyPrompt(text){const prompt='Réécris cette appréciation en français soutenu, style professionnel, détaillé, bienveillant et précis, sans inventer d\\'information.\\n\\n'+text;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(prompt).then(()=>window.alert('Prompt IA copié dans le presse-papiers.')).catch(()=>window.prompt('Copie ce prompt IA :',prompt));return;}window.prompt('Copie ce prompt IA :',prompt);}function buildText(name,b,t,a,cpc,c3d,cmq,t1,t2,t3,comments){const grades=[t1,t2,t3].filter((v)=>Number.isFinite(v));const avgGrade=grades.length?grades.reduce((sum,v)=>sum+v,0)/grades.length:null;const progression=grades.length>=2?grades[grades.length-1]-grades[0]:null;const engagement=(b+t+a)/3;let global='Bilan global positif, à consolider sur la durée.';if(engagement>=85&&avgGrade!==null&&avgGrade>=14){global='Très bon trimestre global : attitude sérieuse, investissement fort et résultats solides.';}else if(engagement>=70&&avgGrade!==null&&avgGrade>=12){global='Ensemble satisfaisant avec une bonne implication et des acquis corrects.';}else if(engagement<50||avgGrade!==null&&avgGrade<10){global='Des efforts plus réguliers sont attendus pour installer des progrès durables.';}const trendText=progression===null?'Progression trimestrielle non exploitable faute de données complètes.':progression>=1.5?'Progression trimestrielle nette (hausse de '+progression.toFixed(1)+'/20 entre le premier et le dernier trimestre).':progression<=-1.5?'Baisse trimestrielle marquée ('+Math.abs(progression).toFixed(1)+'/20 de moins entre le premier et le dernier trimestre).':'Progression trimestrielle globalement stable.';const tags=classifyComments(comments);const oralLine=tags.oralPlus.length&&tags.oralMinus.length?'Aisance orale variable selon les séances (indices P+ et P- observés).':tags.oralPlus.length?'Aisance à l\'oral constatée lors des revues de projet (indices P+).':tags.oralMinus.length?'Des difficultés à l\'oral apparaissent en revue de projet (synthèse, expression... ; indices P-).':'Aucun indicateur P+/P- saisi à ce jour.';const comprehensionLine=tags.comprehensionPlus.length&&tags.comprehensionMinus.length?'Compréhension des éléments de séance hétérogène (indices C+ et C-).':tags.comprehensionPlus.length?'Bonne compréhension des éléments de la séance (indices C+).':tags.comprehensionMinus.length?'Des difficultés de compréhension des éléments de la séance sont relevées (indices C-).':'Aucun indicateur C+/C- saisi à ce jour.';const commentsText=comments.length?'Commentaires de séance observés : '+comments.join(' | ')+'.':'Aucun commentaire de séance saisi à ce jour.';const gradesText=grades.length?'Moyennes trimestrielles : T1 '+(Number.isFinite(t1)?t1.toFixed(1):'N/A')+'/20, T2 '+(Number.isFinite(t2)?t2.toFixed(1):'N/A')+'/20, T3 '+(Number.isFinite(t3)?t3.toFixed(1):'N/A')+'/20.':'Moyennes trimestrielles indisponibles.';const summaryLines=[name+' : '+global,'','Analyse comportementale détaillée :','- B (sérieux en classe) : '+b.toFixed(0)+'% ('+levelPercent(b)+').','- T (mise au travail) : '+t.toFixed(0)+'% ('+levelPercent(t)+').','- A (autonomie) : '+a.toFixed(0)+'% ('+levelPercent(a)+').','','Compétences techniques ciblées :','- CPC (analyse fonctionnelle / prototypage Arduino) : '+levelCompetency(cpc)+'.','- C3D (modélisation 3D) : '+levelCompetency(c3d)+'.','- CMQ (prototypage maquette) : '+levelCompetency(cmq)+'.','','Analyse des résultats scolaires :','- Niveau moyen trimestriel : '+(avgGrade===null?'N/A':avgGrade.toFixed(1)+'/20 ('+levelTrimester(avgGrade)+')')+'.','- '+gradesText,'- '+trendText,'','Analyse des commentaires codés :','- '+oralLine,'- '+comprehensionLine,'',commentsText];return summaryLines.join('\\n');}function buildClassText(){const notes=[];const comments=[];document.querySelectorAll('.note-btn').forEach((btn)=>{const b=Number(btn.dataset.b)||0;const t=Number(btn.dataset.t)||0;const a=Number(btn.dataset.a)||0;const cpc=btn.dataset.cpc===''?NaN:Number(btn.dataset.cpc);const c3d=btn.dataset.c3d===''?NaN:Number(btn.dataset.c3d);const cmq=btn.dataset.cmq===''?NaN:Number(btn.dataset.cmq);notes.push({b,t,a,cpc,c3d,cmq,t1:btn.dataset.t1===''?NaN:Number(btn.dataset.t1),t2:btn.dataset.t2===''?NaN:Number(btn.dataset.t2),t3:btn.dataset.t3===''?NaN:Number(btn.dataset.t3)});comments.push(...normalizeComments(btn.dataset.comments||''));});if(!notes.length){return 'Aucun élève chargé, appréciation de classe indisponible.';}const avg=(arr)=>arr.reduce((s,v)=>s+v,0)/arr.length;const avgB=avg(notes.map((n)=>n.b));const avgT=avg(notes.map((n)=>n.t));const avgA=avg(notes.map((n)=>n.a));const competencyValues=(key)=>notes.map((n)=>n[key]).filter((v)=>Number.isFinite(v));const competencyLabel=(v)=>!Number.isFinite(v)?'N/A':levelCompetency(Math.round(v));const gradeValues=notes.flatMap((n)=>[n.t1,n.t2,n.t3]).filter((v)=>Number.isFinite(v));const avgGrade=gradeValues.length?avg(gradeValues):null;const commonComments=[...new Set(comments)].slice(0,8);const observationsLine = commonComments.length ? 'Observations fréquentes : '+commonComments.join(' | ') : 'Aucune observation de séance recensée.';const avgCpcRaw=competencyValues('cpc');const avgC3dRaw=competencyValues('c3d');const avgCmqRaw=competencyValues('cmq');const avgCpc=avgCpcRaw.length?avg(avgCpcRaw):NaN;const avgC3d=avgC3dRaw.length?avg(avgC3dRaw):NaN;const avgCmq=avgCmqRaw.length?avg(avgCmqRaw):NaN;const lines=['Classe ${selectedClass} : bilan global.','','- Sérieux moyen : '+avgB.toFixed(0)+'% ('+levelPercent(avgB)+').','- Mise au travail moyenne : '+avgT.toFixed(0)+'% ('+levelPercent(avgT)+').','- Autonomie moyenne : '+avgA.toFixed(0)+'% ('+levelPercent(avgA)+').','- Niveau trimestriel moyen : '+(avgGrade===null?'N/A':avgGrade.toFixed(1)+'/20 ('+levelTrimester(avgGrade)+')')+'.','- CPC moyen : '+competencyLabel(avgCpc)+'.','- C3D moyen : '+competencyLabel(avgC3d)+'.','- CMQ moyen : '+competencyLabel(avgCmq)+'.','',observationsLine];return lines.filter(Boolean).join('\\n');}function showNoteWithCopy(text){const choice=window.confirm(text+'\\n\\nClique sur OK pour copier un prompt IA (version littéraire), ou Annuler pour fermer.');if(choice){copyPrompt(text);}}document.querySelectorAll('.note-btn').forEach((btn)=>{btn.addEventListener('click',()=>{const name=btn.dataset.student||'Élève';const b=Number(btn.dataset.b)||0;const t=Number(btn.dataset.t)||0;const a=Number(btn.dataset.a)||0;const cpc=btn.dataset.cpc===''?NaN:Number(btn.dataset.cpc);const c3d=btn.dataset.c3d===''?NaN:Number(btn.dataset.c3d);const cmq=btn.dataset.cmq===''?NaN:Number(btn.dataset.cmq);const t1=btn.dataset.t1===''?NaN:Number(btn.dataset.t1);const t2=btn.dataset.t2===''?NaN:Number(btn.dataset.t2);const t3=btn.dataset.t3===''?NaN:Number(btn.dataset.t3);const comments=normalizeComments(btn.dataset.comments||'');showNoteWithCopy(buildText(name,b,t,a,cpc,c3d,cmq,t1,t2,t3,comments));});});if(classBtn){classBtn.addEventListener('click',()=>{showNoteWithCopy(buildClassText());});}})();</script></body></html>`);
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
