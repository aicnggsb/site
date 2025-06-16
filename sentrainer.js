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
            answer: r[3] || ''
        })).filter(q => q.question);
    } catch (e) {
        const localRes = await fetch('sentrainer_data.json');
        const data = await localRes.json();
        return data.map(q => ({
            niveau: q.niveau || 'Indefini',
            theme: q.theme || 'Autre',
            question: q.question,
            choices: q.choices,
            answer: q.answer
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
const MAX_QUESTIONS = 5;
const HIGHLIGHT_DELAY = 1000; // temps avant la question suivante

function showRandomQuestion() {
    const container = document.getElementById('quiz-container');
    if (count >= MAX_QUESTIONS || !questions.length) {
        const percent = count ? Math.round((score / count) * 100) : 0;
        container.innerHTML = `<p>Quiz terminé ! Score : ${score} / ${count} (${percent}%)</p>`;
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

function showFilterSelection() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';

    const themes = [...new Set(allQuestions.map(q => q.theme || 'Autre'))];
    const niveaux = [...new Set(allQuestions.map(q => q.niveau || 'Indefini'))];

    const themeBox = document.createElement('div');
    themes.forEach(t => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = t;
        cb.checked = true;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + t + ' '));
        themeBox.appendChild(label);
    });

    const levelBox = document.createElement('div');
    niveaux.forEach(n => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = n;
        cb.checked = true;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + n + ' '));
        levelBox.appendChild(label);
    });

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
        ));
        score = 0;
        count = 0;
        showRandomQuestion();
    });

    container.appendChild(themeBox);
    container.appendChild(levelBox);
    container.appendChild(start);
}
