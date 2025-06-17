// Charge les questions depuis la feuille Google Sheets publiee.
// Si le telechargement echoue, les questions sont lues dans 'sentrainer_data.json'.
async function fetchQCM() {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSg_rqA997mD2J3beXWHz2dJPfQ7tuqZY_S768tXgAAgwTg3znMPZEnrH0VAdzALTScIdiLLv1GUffP/pub?output=csv&ts=' + Date.now();
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        const rows = parseCSV(text);
        if (!rows.length) throw new Error('no data');
        rows.shift(); // enleve l'en-tete
        return rows.map(r => ({
            niveau: r[0] || 'Indefini',
            theme: r[1] || 'Autre',
            question: r[2] || '',
            choices: [r[3] || '', r[4] || '', r[5] || ''],
            answer: r[3] || '',
            correction: r[6] || ''
        })).filter(q => q.question);
    } catch (e) {
        const localRes = await fetch('sentrainer_data.json');
        const data = await localRes.json();
        return data.map(q => ({
            niveau: q.niveau || 'Indefini',
            theme: q.theme || 'Autre',
            question: q.question,
            choices: q.choices,
            answer: q.answer,
            correction: q.correction || ''
        }));
    }
}

function parseCSV(text) {
    const rows = [];
    let cur = '';
    let row = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else { cur += c; }
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ',') { row.push(cur); cur = ''; }
            else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
            else if (c !== '\r') cur += c;
        }
    }
    if (cur || row.length) row.push(cur);
    if (row.length) rows.push(row);
    return rows;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

let questions = [];
let allQuestions = [];
let current = null;
let score = 0;
let count = 0;
let maxQuestions = 5;
let history = [];
const HIGHLIGHT_DELAY = 1000; // temps avant la question suivante

function showRandomQuestion() {
    const container = document.getElementById('quiz-container');
    if (count >= maxQuestions || !questions.length) {
        const percent = count ? Math.round((score / count) * 100) : 0;
        container.innerHTML = `<p>Quiz terminé ! Score : ${score} / ${count} (${percent}%)</p>`;
        const historyDiv = document.createElement('div');
        history.forEach((h, i) => {
            const block = document.createElement('div');
            block.className = 'question-block ' + (h.isCorrect ? 'correct' : 'incorrect');
            const tab = document.createElement('span');
            tab.className = 'question-tab';
            tab.textContent = `Q${i + 1}`;
            block.appendChild(tab);
            const q = document.createElement('p');
            q.textContent = h.question;
            block.appendChild(q);
            const sel = document.createElement('p');
            sel.innerHTML = `<strong>Votre réponse :</strong> ${h.selected}`;
            block.appendChild(sel);
            if (!h.isCorrect) {
                const ans = document.createElement('p');
                ans.innerHTML = `<strong>Bonne réponse :</strong> ${h.correct}`;
                block.appendChild(ans);
            }
            if (h.correction) {
                const cor = document.createElement('p');
                cor.innerHTML = `<strong>Correction :</strong> ${h.correction}`;
                block.appendChild(cor);
            }
            historyDiv.appendChild(block);
        });
        container.appendChild(historyDiv);
        const restart = document.createElement('button');
        restart.textContent = 'Nouveau test';
        restart.className = 'quiz-btn';
        restart.addEventListener('click', showFilterSelection);
        container.appendChild(restart);
        return;
    }
    const index = Math.floor(Math.random() * questions.length);
    current = questions.splice(index, 1)[0];
    count++;
    container.innerHTML = '';
    const block = document.createElement('div');
    block.className = 'question-block';

    const tab = document.createElement('span');
    tab.className = 'question-tab';
    tab.textContent = `Q${count}`;
    block.appendChild(tab);

    const p = document.createElement('p');
    p.textContent = current.question;
    block.appendChild(p);

    const answers = shuffle([...current.choices]);
    answers.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice;
        btn.className = 'quiz-btn';
        btn.addEventListener('click', () => {
            const correct = choice === current.answer;
            if (correct) score++;
            history.push({
                question: current.question,
                selected: choice,
                correct: current.answer,
                correction: current.correction || '',
                isCorrect: correct
            });
            btn.style.backgroundColor = correct ? '#00a000' : '#ff0000';
            Array.from(block.querySelectorAll('button')).forEach(b => b.disabled = true);
            setTimeout(showRandomQuestion, HIGHLIGHT_DELAY);
        });
        block.appendChild(btn);
    });

    container.appendChild(block);
}

document.addEventListener('DOMContentLoaded', async () => {
    allQuestions = await fetchQCM();
    showFilterSelection();
});

function createFilterBox(title, values) {
    const box = document.createElement('div');
    box.className = 'filter-box';
    const tab = document.createElement('span');
    tab.className = 'filter-tab';
    tab.textContent = title;
    box.appendChild(tab);
    values.forEach(val => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = val;
        cb.checked = true;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + val + ' '));
        box.appendChild(label);
    });
    return box;
}

function createInfoBox(text) {
    const box = document.createElement('div');
    box.className = 'info-box';
    box.textContent = text;
    return box;
}

function showFilterSelection() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';

    const infoText = "Cet espace vous permet de vous entra\u00eener et de v\u00e9rifier vos acquis en technologie. Utilisez les filtres ci-dessous pour g\u00e9n\u00e9rer un quiz personnalis\u00e9 selon votre niveau et les comp\u00e9tences vis\u00e9es.";
    const infoBox = createInfoBox(infoText);

    container.appendChild(infoBox);

    const themes = [...new Set(allQuestions.map(q => q.theme || 'Autre'))];
    const niveaux = [...new Set(allQuestions.map(q => q.niveau || 'Indefini'))];

    const themeBox = createFilterBox('Niveau', themes);
    const levelBox = createFilterBox('Thème', niveaux);

    const questionBox = document.createElement('div');
    questionBox.className = 'filter-box';
    const questionTab = document.createElement('span');
    questionTab.className = 'filter-tab';
    questionTab.textContent = 'Questions';
    questionBox.appendChild(questionTab);
    const qLabel = document.createElement('label');
    qLabel.textContent = `Nombre de questions : ${maxQuestions}`;
    const qRange = document.createElement('input');
    qRange.type = 'range';
    qRange.min = '5';
    qRange.max = '20';
    qRange.value = maxQuestions;
    qRange.addEventListener('input', () => {
        maxQuestions = parseInt(qRange.value, 10);
        qLabel.textContent = `Nombre de questions : ${maxQuestions}`;
    });
    questionBox.appendChild(qLabel);
    questionBox.appendChild(qRange);

    const start = document.createElement('button');
    start.textContent = 'Commencer le test';
    start.className = 'quiz-btn';
    start.addEventListener('click', () => {
        const selectedThemes = Array.from(themeBox.querySelectorAll('input[type=checkbox]'))
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const selectedLevels = Array.from(levelBox.querySelectorAll('input[type=checkbox]'))
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        questions = shuffle(allQuestions.filter(q =>
            selectedThemes.includes(q.theme || 'Autre') &&
            selectedLevels.includes(q.niveau || 'Indefini')
        )).slice(0, maxQuestions);
        score = 0;
        count = 0;
        history = [];
        showRandomQuestion();
    });

    container.appendChild(themeBox);
    container.appendChild(levelBox);
    container.appendChild(questionBox);
    container.appendChild(start);
}
