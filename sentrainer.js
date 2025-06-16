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
            question: r[2] || '',
            choices: [r[3] || '', r[4] || '', r[5] || ''],
            answer: r[3] || ''
        })).filter(q => q.question);
    } catch (e) {
        const localRes = await fetch('sentrainer_data.json');
        return await localRes.json();
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
let current = null;
let score = 0;
let count = 0;
const MAX_QUESTIONS = 5;

function showRandomQuestion() {
    const container = document.getElementById('quiz-container');
    if (count >= MAX_QUESTIONS || !questions.length) {
        const percent = count ? Math.round((score / count) * 100) : 0;
        container.innerHTML = `<p>Quiz terminé ! Score : ${score} / ${count} (${percent}%)</p>`;
        return;
    }
    const index = Math.floor(Math.random() * questions.length);
    current = questions.splice(index, 1)[0];
    count++;
    container.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = current.question;
    container.appendChild(p);
    const answers = shuffle([...current.choices]);
    answers.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice;
        btn.className = 'quiz-btn';
        btn.addEventListener('click', () => {
            const correct = choice === current.answer;
            if (correct) score++;
            btn.style.backgroundColor = correct ? '#1e90ff' : '#ff0000';
            Array.from(container.querySelectorAll('button')).forEach(b => b.disabled = true);
            setTimeout(showRandomQuestion, 500);
        });
        container.appendChild(btn);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    questions = await fetchQCM();
    showRandomQuestion();
});
