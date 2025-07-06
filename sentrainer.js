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
            theme: r[0] || 'Autre',
            niveau: r[1] || 'Indefini',
            question: r[2] || '',
            image: r[3] || '',
            choices: [r[4] || '', r[5] || '', r[6] || ''],
            answer: r[4] || '',
            correction: r[7] || ''
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
            correction: q.correction || '',
            image: q.image || ''
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
let pseudo = '';
const HIGHLIGHT_DELAY = 1000; // temps avant la question suivante
let pointsAwarded = false; // évite un ajout multiple de points

function showRandomQuestion() {
    const container = document.getElementById('quiz-container');
    if (count >= maxQuestions || !questions.length) {
        const percent = count ? Math.round((score / count) * 100) : 0;
        container.innerHTML = `<p>Quiz terminé ! Score : ${score} / ${count} (${percent}%)</p>`;
        sendScore();
        showStarAnimation(score);
        // Points are now awarded at the end of the quiz

        const results = history.reduce((acc, h) => {
            const t = h.theme || 'Autre';
            if (!acc[t]) acc[t] = {total: 0, correct: 0};
            acc[t].total++;
            if (h.isCorrect) acc[t].correct++;
            return acc;
        }, {});

        const resultsBox = document.createElement('div');
        resultsBox.className = 'filter-box';
        resultsBox.style.marginBottom = '30px';
        const resultsTab = document.createElement('span');
        resultsTab.className = 'filter-tab';
        resultsTab.textContent = 'Bilan par thème';
        resultsBox.appendChild(resultsTab);

        const resultsDiv = document.createElement('div');
        Object.entries(results).forEach(([theme, res]) => {
            const pct = Math.round((res.correct / res.total) * 100);
            const line = document.createElement('div');
            line.className = 'progress-container';
            const label = document.createElement('p');
            label.textContent = `${theme} : ${pct}% (${res.correct}/${res.total})`;
            line.appendChild(label);
            const bar = document.createElement('div');
            bar.className = 'progress-bar';
            const inner = document.createElement('div');
            inner.className = 'progress-bar-inner';
            inner.style.width = pct + '%';
            const ratio = pct / 100;
            const r = Math.round(255 * (1 - ratio));
            const g = Math.round(255 * ratio);
            inner.style.backgroundColor = `rgb(${r}, ${g}, 0)`;
            bar.appendChild(inner);
            line.appendChild(bar);
            resultsDiv.appendChild(line);
        });
        resultsBox.appendChild(resultsDiv);
        container.appendChild(resultsBox);
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
            if (h.image) {
                const imgBox = document.createElement('div');
                imgBox.className = 'image-box';
                const img = document.createElement('img');
                let src = h.image;
                if (!src.includes('/')) src = 'photos/' + src;
                img.src = src;
                img.alt = '';
                img.className = 'question-image';
                imgBox.appendChild(img);
                block.appendChild(imgBox);
            }
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

    if (current.image) {
        const imgBox = document.createElement('div');
        imgBox.className = 'image-box';
        const img = document.createElement('img');
        let src = current.image;
        if (!src.includes('/')) src = 'photos/' + src;
        img.src = src;
        img.alt = '';
        img.className = 'question-image';
        imgBox.appendChild(img);
        block.appendChild(imgBox);
    }

    const answers = shuffle(current.choices.filter(c => c));

    const answerBox = document.createElement('div');
    answerBox.className = 'answer-box';

    answers.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice;
        btn.className = 'quiz-btn';
        btn.addEventListener('click', () => {
            // Désactive immédiatement tous les boutons pour éviter
            // plusieurs clics qui compteraient plusieurs fois la même question
            Array.from(block.querySelectorAll('button')).forEach(b => b.disabled = true);
            const correct = choice === current.answer;
            if (correct) {
                score++;
            }
            history.push({
                question: current.question,
                selected: choice,
                correct: current.answer,
                correction: current.correction || '',
                image: current.image || '',
                theme: current.theme || 'Autre',
                isCorrect: correct
            });
            btn.style.backgroundColor = correct ? '#00a000' : '#ff0000';
            setTimeout(showRandomQuestion, HIGHLIGHT_DELAY);
        });
        answerBox.appendChild(btn);
    });

    // Align buttons to the left if any answer text is long
    if (answers.some(c => c.length > 40)) {
        answerBox.classList.add('align-left');
    }

    block.appendChild(answerBox);

    container.appendChild(block);
}

document.addEventListener('DOMContentLoaded', async () => {
    allQuestions = await fetchQCM();
    pseudo = localStorage.getItem('pseudo') || '';
    if (pseudo) {
        showFilterSelection();
    } else {
        showLogin();
    }
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

    const levelBox = createFilterBox('Niveau', niveaux);
    const themeBox = createFilterBox('Thème', themes);

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

    const countBox = document.createElement('div');
    countBox.className = 'count-box';
    countBox.textContent = `${allQuestions.length} questions disponibles`;

    questionBox.appendChild(countBox);

    function updateAvailableCount() {
        const selectedThemes = Array.from(themeBox.querySelectorAll('input[type="checkbox"]'))
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const selectedLevels = Array.from(levelBox.querySelectorAll('input[type="checkbox"]'))
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const available = allQuestions.filter(q =>
            selectedThemes.includes(q.theme || 'Autre') &&
            selectedLevels.includes(q.niveau || 'Indefini')
        ).length;
        countBox.textContent = `${available} questions disponibles`;
    }

    levelBox.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateAvailableCount));
    themeBox.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateAvailableCount));
    updateAvailableCount();

    const start = document.createElement('button');
    start.textContent = 'Commencer le test';
    start.className = 'quiz-btn';
    start.addEventListener('click', () => {
        pointsAwarded = false;
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

    container.appendChild(levelBox);
    container.appendChild(themeBox);
    container.appendChild(questionBox);
    container.appendChild(start);
}

function showLogin() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'filter-box';
    const tab = document.createElement('span');
    tab.className = 'filter-tab';
    tab.textContent = 'Connexion';
    box.appendChild(tab);

    const label = document.createElement('label');
    label.textContent = 'Entrez votre pseudo : ';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'pseudo-input';
    label.appendChild(input);
    box.appendChild(label);

    const btn = document.createElement('button');
    btn.textContent = 'Valider';
    btn.className = 'quiz-btn';
    btn.addEventListener('click', () => {
        const val = input.value.trim();
        if (val) {
            pseudo = val;
            localStorage.setItem('pseudo', pseudo);
            showFilterSelection();
        }
    });
    box.appendChild(btn);

    container.appendChild(box);
}

function sendScore() {
    if (!pseudo) return;
    fetch('https://script.google.com/macros/s/AKfycbzHfWfQzgWHNx7iE2aeCcgC27Y-1lvr2SVnZQDoNOeLwgsebjQyGw8zWTavJ175GSmg/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: pseudo, score: score })
    }).catch(() => {});
}

function showStarAnimation(points) {
    const overlay = document.createElement('div');
    overlay.id = 'points-popup';

    const box = document.createElement('div');
    box.className = 'popup-box';

    const close = document.createElement('span');
    close.className = 'close';
    close.innerHTML = '&times;';
    close.addEventListener('click', () => overlay.remove());

    const message = document.createElement('p');
    message.className = 'points-text';
    message.textContent = `Vous avez gagné ${points} points !`;

    box.appendChild(close);
    box.appendChild(message);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const stars = [];
    for (let i = 0; i < points; i++) {
        const star = document.createElement('div');
        star.className = 'falling-star';
        star.textContent = '⭐';
        box.appendChild(star);
        const rect = box.getBoundingClientRect();
        const x = Math.random() * (rect.width - 20);
        const y = -20;
        star.style.left = x + 'px';
        star.style.top = y + 'px';
        stars.push({el: star, x, y, vx: (Math.random() - 0.5) * 4, vy: 0});
    }

    function animate() {
        const rect = box.getBoundingClientRect();
        stars.forEach(s => {
            s.vy += 0.4;
            s.x += s.vx;
            s.y += s.vy;
            const w = s.el.offsetWidth;
            const h = s.el.offsetHeight;
            if (s.x <= 0) { s.x = 0; s.vx *= -0.7; }
            if (s.x + w >= rect.width) { s.x = rect.width - w; s.vx *= -0.7; }
            if (s.y + h >= rect.height) { s.y = rect.height - h; s.vy *= -0.7; }
            if (s.y <= 0 && s.vy < 0) { s.y = 0; s.vy *= -0.7; }
            s.el.style.left = s.x + 'px';
            s.el.style.top = s.y + 'px';
        });
        requestAnimationFrame(animate);
    }
    if (stars.length) requestAnimationFrame(animate);

    if (!pointsAwarded && window.auth && typeof auth.addPoints === 'function') {
        auth.addPoints(points);
        pointsAwarded = true;
    }
}

function flyStar(fromElem) {
    const target = document.querySelector('#score-cell .score-star');
    if (!target) return;
    const star = document.createElement('span');
    star.className = 'flying-star';
    star.textContent = '⭐';
    document.body.appendChild(star);

    const start = fromElem.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const startX = start.left + start.width / 2;
    const startY = start.top + start.height / 2;
    const endX = end.left + end.width / 2;
    const endY = end.top + end.height / 2;

    star.style.left = startX + 'px';
    star.style.top = startY + 'px';
    star.style.transform = 'translate(-50%, -50%)';

    requestAnimationFrame(() => {
        const dx = endX - startX;
        const dy = endY - startY;
        star.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.5)`;
        star.style.opacity = '0';
    });

    star.addEventListener('transitionend', () => {
        star.remove();
        target.classList.add('hit');
        target.addEventListener('animationend', () => target.classList.remove('hit'), {once: true});
    });
}
