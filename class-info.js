(function () {
    const TROISIEME_CLASSES = new Set(['3E1', '3E2', '3E3', '3E4', '3E5']);

    // Remplacer l'URL par le lien CSV publié du fichier "3E - Techno", onglet "Suivi Eleve 3E".
    // Format attendu : https://docs.google.com/spreadsheets/d/e/<ID>/pub?gid=<GID_ONGLET>&single=true&output=csv
    const SHEET_3E_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgz3Y15bbDovMG-vtfT0rBMeR-BDMfSRZsj_m3vlzsbGybW6xe5qWEfzB7fFCQyHmf9qJ7lMsDIUY6/pub?gid=640829844&single=true&output=csv';

    const classNameElement = document.getElementById('selected-class-name');
    const studentsCountElement = document.getElementById('selected-class-students');
    const statusElement = document.getElementById('class-info-status');
    const classFilterElement = document.getElementById('progression-class-filter');

    if (!classNameElement || !studentsCountElement || !statusElement) {
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

    async function fetch3EStudentsCount(selectedClass) {
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
            return 0;
        }

        const header = rows[0].map((cell) => normalize(cell));
        const classIdx = header.findIndex((col) => col === 'classe');
        const nameIdx = header.findIndex((col) => col === 'nom');

        if (classIdx === -1 || nameIdx === -1) {
            throw new Error('Colonnes attendues introuvables (classe / nom).');
        }

        const normalizedSelectedClass = normalize(selectedClass);

        return rows
            .slice(1)
            .filter((row) => normalize(row[classIdx]) === normalizedSelectedClass && (row[nameIdx] || '').trim())
            .length;
    }

    async function refreshClassInfo() {
        const className = getSelectedClass();

        classNameElement.textContent = `Classe sélectionnée : ${className || 'Aucune'}`;

        if (!className) {
            studentsCountElement.textContent = 'Effectif (3E) : -';
            statusElement.textContent = 'Sélectionnez une classe pour afficher ses informations.';
            return;
        }

        if (!TROISIEME_CLASSES.has(className.toUpperCase())) {
            studentsCountElement.textContent = 'Effectif (3E) : -';
            statusElement.textContent = 'Cette classe ne fait pas partie des classes de 3e.';
            return;
        }

        studentsCountElement.textContent = 'Effectif (3E) : Chargement...';
        statusElement.textContent = 'Lecture des données de l\'onglet "Suivi Eleve 3E"...';

        try {
            const studentsCount = await fetch3EStudentsCount(className);
            studentsCountElement.textContent = `Effectif (3E) : ${studentsCount} élèves`;
            statusElement.textContent = 'Données chargées avec succès.';
        } catch (error) {
            studentsCountElement.textContent = 'Effectif (3E) : -';
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
