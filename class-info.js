(function () {
    const TROISIEME_CLASSES = new Set(['3E1', '3E2', '3E3', '3E4', '3E5']);

    // Remplacer l'URL par le lien CSV publié du fichier "3E - Techno", onglet "Suivi Eleve 3E".
    // Format attendu : https://docs.google.com/spreadsheets/d/e/<ID>/pub?gid=<GID_ONGLET>&single=true&output=csv
    const SHEET_3E_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgz3Y15bbDovMG-vtfT0rBMeR-BDMfSRZsj_m3vlzsbGybW6xe5qWEfzB7fFCQyHmf9qJ7lMsDIUY6/pub?gid=640829844&single=true&output=csv';

    const classNameElement = document.getElementById('selected-class-name');
    const studentsCountElement = document.getElementById('selected-class-students');
    const indicatorBElement = document.getElementById('selected-class-indicator-b');
    const indicatorTElement = document.getElementById('selected-class-indicator-t');
    const indicatorAElement = document.getElementById('selected-class-indicator-a');
    const statusElement = document.getElementById('class-info-status');
    const classFilterElement = document.getElementById('progression-class-filter');

    if (!classNameElement || !studentsCountElement || !indicatorBElement || !indicatorTElement || !indicatorAElement || !statusElement) {
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

    async function fetch3EClassData(selectedClass) {
        if (!SHEET_3E_CSV_URL) {
            throw new Error('URL CSV du fichier "3E - Techno" non configurée.');
        }

        const response = await fetch(`${SHEET_3E_CSV_URL}${SHEET_3E_CSV_URL.includes('?') ? '&' : '?'}ts=${Date.now()}`);
        if (!response.ok) {
            throw new Error('Impossible de charger les données élèves.');
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText).filter((row) => row.some((cell) => (cell || '').trim()));
        if (!rows.length) {
            return { studentsCount: 0, averageB: null, averageT: null, averageA: null };
        }

        const header = rows[0].map((cell) => normalize(cell));
        const classIdx = header.findIndex((col) => col === 'classe');
        const nameIdx = header.findIndex((col) => col === 'nom');
        const indicatorBIdx = header.findIndex((col) => col === 'b');
        const indicatorTIdx = header.findIndex((col) => col === 't');
        const indicatorAIdx = header.findIndex((col) => col === 'a');

        if (classIdx === -1 || nameIdx === -1 || indicatorBIdx === -1 || indicatorTIdx === -1 || indicatorAIdx === -1) {
            throw new Error('Colonnes attendues introuvables (classe / nom / B / T / A).');
        }

        const normalizedSelectedClass = normalize(selectedClass);
        const classRows = rows
            .slice(1)
            .filter((row) => normalize(row[classIdx]) === normalizedSelectedClass && (row[nameIdx] || '').trim());

        const bValues = classRows.map((row) => parsePercentage(row[indicatorBIdx])).filter((value) => value !== null);
        const tValues = classRows.map((row) => parsePercentage(row[indicatorTIdx])).filter((value) => value !== null);
        const aValues = classRows.map((row) => parsePercentage(row[indicatorAIdx])).filter((value) => value !== null);

        return {
            studentsCount: classRows.length,
            averageB: computeAverage(bValues),
            averageT: computeAverage(tValues),
            averageA: computeAverage(aValues),
        };
    }

    async function refreshClassInfo() {
        const className = getSelectedClass();

        classNameElement.textContent = `Classe sélectionnée : ${className || 'Aucune'}`;

        if (!className) {
            studentsCountElement.textContent = 'Effectif (3E) : -';
            setIndicatorLight(indicatorBElement, null);
            setIndicatorLight(indicatorTElement, null);
            setIndicatorLight(indicatorAElement, null);
            statusElement.textContent = 'Sélectionnez une classe pour afficher ses informations.';
            return;
        }

        if (!TROISIEME_CLASSES.has(className.toUpperCase())) {
            studentsCountElement.textContent = 'Effectif (3E) : -';
            setIndicatorLight(indicatorBElement, null);
            setIndicatorLight(indicatorTElement, null);
            setIndicatorLight(indicatorAElement, null);
            statusElement.textContent = 'Cette classe ne fait pas partie des classes de 3e.';
            return;
        }

        studentsCountElement.textContent = 'Effectif (3E) : Chargement...';
        setIndicatorLight(indicatorBElement, null);
        setIndicatorLight(indicatorTElement, null);
        setIndicatorLight(indicatorAElement, null);
        statusElement.textContent = 'Lecture des données de l\'onglet "Suivi Eleve 3E"...';

        try {
            const classData = await fetch3EClassData(className);
            studentsCountElement.textContent = `Effectif (3E) : ${classData.studentsCount} élèves`;
            setIndicatorLight(indicatorBElement, classData.averageB);
            setIndicatorLight(indicatorTElement, classData.averageT);
            setIndicatorLight(indicatorAElement, classData.averageA);
            statusElement.textContent = 'Données chargées avec succès.';
        } catch (error) {
            studentsCountElement.textContent = 'Effectif (3E) : -';
            setIndicatorLight(indicatorBElement, null);
            setIndicatorLight(indicatorTElement, null);
            setIndicatorLight(indicatorAElement, null);
            statusElement.textContent = error instanceof Error ? error.message : 'Erreur lors du chargement des données.';
        }
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
