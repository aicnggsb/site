(function () {
    const PP_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgz3Y15bbDovMG-vtfT0rBMeR-BDMfSRZsj_m3vlzsbGybW6xe5qWEfzB7fFCQyHmf9qJ7lMsDIUY6/pub?gid=1467143461&single=true&output=csv';
    const followupButton = document.getElementById('pp-followup-button');
    const classFilterElement = document.getElementById('progression-class-filter');
    const SUBJECT_GROUPS = [
        { label: 'Matières littéraires', color: '#7c3aed', subjects: [
            { label: 'FR', aliases: ['fr', 'francais', 'français'] },
            { label: 'HG', aliases: ['hg', 'histoire geo', 'histoire-geographie', 'histoire géographie'] },
            { label: 'EMC', aliases: ['emc', 'enseignement moral et civique'] },
            { label: 'ANG', aliases: ['ang', 'anglais'] },
            { label: 'ESP', aliases: ['esp', 'espagnol'] },
            { label: 'Latin', aliases: ['latin'] }
        ] },
        { label: 'Matières scientifiques', color: '#0284c7', subjects: [
            { label: 'Maths', aliases: ['maths', 'math', 'mathematiques', 'mathématiques'] },
            { label: 'Physique', aliases: ['physique', 'physique chimie', 'physique-chimie'] },
            { label: 'SVT', aliases: ['svt', 'sciences de la vie et de la terre'] },
            { label: 'Techno', aliases: ['techno', 'technologie'] }
        ] },
        { label: 'Autres matières', color: '#ea580c', subjects: [
            { label: 'Musique', aliases: ['musique', 'education musicale', 'éducation musicale'] },
            { label: 'EPS', aliases: ['eps', 'education physique et sportive', 'éducation physique et sportive'] },
            { label: 'Arts plast.', aliases: ['art plast', 'arts plast', 'arts plastiques', 'art plastique'] }
        ] }
    ];

    if (!followupButton) return;

    function parseCSV(text) {
        const rows = [];
        let current = '';
        let row = [];
        let inQuotes = false;

        for (let index = 0; index < text.length; index++) {
            const char = text[index];
            if (inQuotes) {
                if (char === '"' && text[index + 1] === '"') {
                    current += '"';
                    index++;
                } else if (char === '"') {
                    inQuotes = false;
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
                current = '';
                row = [];
            } else if (char !== '\r') {
                current += char;
            }
        }

        if (current || row.length) row.push(current);
        if (row.length) rows.push(row);
        return rows;
    }

    function normalize(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function parseGrade(value) {
        const cleaned = String(value || '').replace(/\s/g, '').replace(',', '.').replace('/20', '');
        if (!cleaned) return null;
        const grade = Number.parseFloat(cleaned);
        return Number.isFinite(grade) ? grade : null;
    }

    function formatGrade(value) {
        const grade = parseGrade(value);
        if (grade === null) return 'N/A';
        return `${Math.round(grade * 100) / 100}/20`;
    }

    function getSelectedClass() {
        return (classFilterElement?.value || localStorage.getItem('userClasse') || 'Classe PP').trim().toUpperCase();
    }

    function getGradeColor(value) {
        const grade = parseGrade(value);
        if (grade === null) return '#94a3b8';
        const hue = Math.max(0, Math.min(120, (grade / 20) * 120));
        return `hsl(${hue} 78% 42%)`;
    }

    function findSubjectColumn(term, aliases) {
        const normalizedAliases = aliases.map(normalize);
        return term.subjects.find((subject) => {
            const normalizedLabel = normalize(subject.label);
            return normalizedAliases.some((alias) => normalizedLabel === alias || normalizedLabel.includes(alias));
        });
    }

    function getRadarIndicators(term, row) {
        return SUBJECT_GROUPS.flatMap((group) => group.subjects.map((subject) => {
            const column = findSubjectColumn(term, subject.aliases);
            return {
                label: subject.label,
                color: group.color,
                value: column ? parseGrade(row[column.index]) : null
            };
        }));
    }

    function getRadarPoint(index, total, radius, centerX, centerY) {
        const angle = ((Math.PI * 2 * index) / total) - (Math.PI / 2);
        return {
            x: centerX + (Math.cos(angle) * radius),
            y: centerY + (Math.sin(angle) * radius),
            angle
        };
    }

    function buildRadarSvg(term, row, studentName) {
        const indicators = getRadarIndicators(term, row);
        const centerX = 300;
        const centerY = 250;
        const radius = 168;
        const rings = [5, 10, 15, 20].map((value) => {
            const points = indicators.map((_, index) => getRadarPoint(index, indicators.length, radius * (value / 20), centerX, centerY));
            return `<polygon points="${points.map((point) => `${point.x},${point.y}`).join(' ')}" class="radar-ring"></polygon><text x="${centerX + 5}" y="${centerY - (radius * (value / 20)) + 12}" class="radar-scale">${value}</text>`;
        }).join('');
        const axes = indicators.map((indicator, index) => {
            const end = getRadarPoint(index, indicators.length, radius, centerX, centerY);
            const labelPoint = getRadarPoint(index, indicators.length, radius + 34, centerX, centerY);
            const anchor = Math.abs(Math.cos(end.angle)) < 0.15 ? 'middle' : (Math.cos(end.angle) > 0 ? 'start' : 'end');
            return `<line x1="${centerX}" y1="${centerY}" x2="${end.x}" y2="${end.y}" class="radar-axis" style="--axis-color:${indicator.color}"></line><text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="${anchor}" class="radar-label" style="--axis-color:${indicator.color}">${escapeHtml(indicator.label)}</text>`;
        }).join('');
        const valuePoints = indicators.map((indicator, index) => getRadarPoint(index, indicators.length, radius * ((indicator.value ?? 0) / 20), centerX, centerY));
        const polygon = `<polygon points="${valuePoints.map((point) => `${point.x},${point.y}`).join(' ')}" class="radar-area"></polygon><polyline points="${valuePoints.concat(valuePoints[0]).map((point) => `${point.x},${point.y}`).join(' ')}" class="radar-line"></polyline>`;
        const dots = indicators.map((indicator, index) => {
            const point = valuePoints[index];
            const value = indicator.value === null ? 'N/A' : formatGrade(indicator.value);
            return `<circle cx="${point.x}" cy="${point.y}" r="4" class="radar-dot" style="--dot-color:${indicator.color}"><title>${escapeHtml(indicator.label)} : ${value}</title></circle>`;
        }).join('');
        const legend = SUBJECT_GROUPS.map((group) => `<span><i style="--legend-color:${group.color}"></i>${escapeHtml(group.label)}</span>`).join('');
        const missingCount = indicators.filter((indicator) => indicator.value === null).length;
        return `<div class="radar-wrap"><svg viewBox="0 0 600 500" class="average-radar" role="img" aria-label="Radar des moyennes de ${escapeHtml(studentName)}, trimestre ${term.number}">${rings}${axes}${polygon}${dots}</svg><div class="radar-legend">${legend}</div>${missingCount ? `<p class="radar-note">${missingCount} matière${missingCount > 1 ? 's' : ''} sans moyenne affichée${missingCount > 1 ? 's' : ''} au centre.</p>` : ''}</div>`;
    }

    function getReportData(csvText, selectedClass) {
        const parsedRows = parseCSV(csvText).filter((row) => row.some((cell) => String(cell || '').trim()));
        if (parsedRows.length < 2) throw new Error('Le CSV de suivi PP ne contient aucun élève.');

        const rawHeader = parsedRows.shift().map((cell) => String(cell || '').trim());
        const header = rawHeader.map(normalize);
        const nameIndex = header.indexOf('nom');
        const classIndex = header.indexOf('classe');
        if (nameIndex === -1) throw new Error('La colonne « Nom » est introuvable dans le CSV de suivi PP.');

        const terms = [1, 2, 3].map((number) => {
            const prefix = `t${number} `;
            const averageIndex = header.indexOf(`${prefix}moyenne`);
            const namedRankIndex = header.indexOf(`${prefix}rang`);
            const rankIndex = namedRankIndex !== -1
                ? namedRankIndex
                : (averageIndex !== -1 && header[averageIndex + 1] === 'rang' ? averageIndex + 1 : -1);
            const subjects = rawHeader.map((label, index) => ({ label, index, normalized: header[index] }))
                .filter((column) => column.normalized.startsWith(prefix)
                    && column.normalized !== `${prefix}moyenne`
                    && !column.normalized.includes('rang'))
                .map((column) => ({ label: column.label.replace(new RegExp(`^T${number}\\s+`, 'i'), ''), index: column.index }));
            return { number, averageIndex, rankIndex, subjects };
        }).filter((term) => term.averageIndex !== -1 || term.subjects.length);

        if (!terms.length) throw new Error('Aucune colonne trimestrielle T1, T2 ou T3 n’a été trouvée.');

        const normalizedClass = normalize(selectedClass);
        const allStudents = parsedRows.filter((row) => String(row[nameIndex] || '').trim());
        const classStudents = classIndex === -1
            ? allStudents
            : allStudents.filter((row) => normalize(row[classIndex]) === normalizedClass);
        const rows = classStudents.length ? classStudents : allStudents;
        return { rows, rawHeader, nameIndex, terms };
    }

    function buildReportHtml(report, selectedClass) {
        const latestTerm = report.terms[report.terms.length - 1];
        const latestAverages = report.rows.map((row) => parseGrade(row[latestTerm.averageIndex])).filter((value) => value !== null);
        const classAverage = latestAverages.length
            ? latestAverages.reduce((sum, value) => sum + value, 0) / latestAverages.length
            : null;

        const studentCards = report.rows.map((row) => {
            const termsHtml = report.terms.map((term) => {
                const average = term.averageIndex === -1 ? null : row[term.averageIndex];
                const rank = term.rankIndex === -1 ? '' : String(row[term.rankIndex] || '').trim();
                const radar = buildRadarSvg(term, row, row[report.nameIndex]);
                return `<section class="term-card"><div class="term-header"><h3>Trimestre ${term.number}</h3><div class="term-summary"><strong style="--grade-color:${getGradeColor(average)}">${formatGrade(average)}</strong>${rank ? `<span>Rang : ${escapeHtml(rank)}</span>` : ''}</div></div>${radar}</section>`;
            }).join('');
            return `<article class="student-card"><h2>${escapeHtml(row[report.nameIndex])}</h2><div class="terms-grid">${termsHtml}</div></article>`;
        }).join('');

        return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Suivi PP - ${escapeHtml(selectedClass)}</title><style>
            :root{--bg:#eef2f7;--panel:#fff;--text:#172033;--muted:#64748b;--border:#dbe3ee;--accent:#2563eb}*{box-sizing:border-box}body{margin:0;padding:24px;font-family:Arial,sans-serif;background:var(--bg);color:var(--text)}.topbar{max-width:1400px;margin:0 auto 18px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.topbar h1{margin:0 0 5px}.topbar p{margin:0;color:var(--muted)}button{border:0;border-radius:9px;background:#334155;color:#fff;padding:9px 14px;font-weight:700;cursor:pointer}.class-summary{max-width:1400px;margin:0 auto 18px;padding:14px 18px;border-radius:14px;background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:#fff;display:flex;gap:24px;flex-wrap:wrap}.class-summary strong{font-size:1.45rem}.students{max-width:1400px;margin:auto;display:grid;gap:18px}.student-card{break-inside:avoid;background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.07)}.student-card>h2{margin:0 0 14px;font-size:1.25rem}.terms-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}.term-card{border:1px solid var(--border);border-radius:12px;overflow:hidden}.term-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:#f8fafc}.term-header h3{margin:0;font-size:1rem}.term-summary{display:flex;align-items:center;gap:10px;color:var(--muted)}.term-summary strong{color:var(--grade-color);font-size:1.15rem}.radar-wrap{padding:10px 12px 14px}.average-radar{display:block;width:100%;height:auto;max-height:430px}.radar-ring{fill:none;stroke:#dbe3ee;stroke-width:1}.radar-axis{stroke:var(--axis-color);stroke-width:1;stroke-opacity:.35}.radar-area{fill:rgba(37,99,235,.18);stroke:none}.radar-line{fill:none;stroke:#2563eb;stroke-width:2.5;stroke-linejoin:round}.radar-dot{fill:var(--dot-color);stroke:#fff;stroke-width:2}.radar-label{fill:var(--axis-color);font-size:12px;font-weight:700}.radar-scale{fill:#94a3b8;font-size:10px}.radar-legend{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;color:var(--muted);font-size:.78rem;font-weight:700}.radar-legend span{display:inline-flex;align-items:center;gap:5px}.radar-legend i{width:9px;height:9px;border-radius:50%;background:var(--legend-color)}.radar-note{margin:8px 0 0;text-align:center;color:var(--muted);font-size:.75rem}.error{max-width:720px;margin:80px auto;background:#fff;border:1px solid #fecaca;border-radius:14px;padding:22px;color:#991b1b}@media print{body{padding:0;background:#fff}.topbar button{display:none}.student-card{box-shadow:none;page-break-inside:avoid}.class-summary{background:#fff;color:#172033;border:1px solid var(--border)}}@media(max-width:650px){body{padding:12px}.topbar{display:block}.topbar button{margin-top:12px}.terms-grid{grid-template-columns:1fr}.radar-label{font-size:11px}}
        </style></head><body><header class="topbar"><div><h1>Suivi PP · ${escapeHtml(selectedClass)}</h1><p>Bilan élève par élève à partir des trimestres disponibles dans le CSV.</p></div><button type="button" onclick="window.print()">Imprimer / PDF</button></header><section class="class-summary"><span><strong>${report.rows.length}</strong><br>élèves</span><span><strong>${latestTerm ? `T${latestTerm.number}` : '—'}</strong><br>dernier trimestre disponible</span><span><strong>${classAverage === null ? 'N/A' : formatGrade(classAverage)}</strong><br>moyenne de classe</span></section><main class="students">${studentCards}</main></body></html>`;
    }

    function renderError(viewWindow, message) {
        viewWindow.document.open();
        viewWindow.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Suivi PP</title></head><body style="font-family:Arial,sans-serif;background:#f1f5f9"><div class="error" style="max-width:720px;margin:80px auto;background:#fff;border:1px solid #fecaca;border-radius:14px;padding:22px;color:#991b1b"><h1>Suivi PP indisponible</h1><p>${escapeHtml(message)}</p></div></body></html>`);
        viewWindow.document.close();
    }

    followupButton.addEventListener('click', async () => {
        const viewWindow = window.open('', '_blank');
        if (!viewWindow) return;
        viewWindow.document.write('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Chargement du suivi PP…</title></head><body style="font-family:Arial,sans-serif;padding:30px"><p>Chargement du suivi PP…</p></body></html>');
        viewWindow.document.close();

        try {
            const response = await fetch(`${PP_CSV_URL}&ts=${Date.now()}`);
            if (!response.ok) throw new Error(`Le CSV a répondu avec l’erreur HTTP ${response.status}.`);
            const selectedClass = getSelectedClass();
            const report = getReportData(await response.text(), selectedClass);
            viewWindow.document.open();
            viewWindow.document.write(buildReportHtml(report, selectedClass));
            viewWindow.document.close();
        } catch (error) {
            renderError(viewWindow, error instanceof Error ? error.message : 'Une erreur inconnue est survenue.');
        }
    });
})();
