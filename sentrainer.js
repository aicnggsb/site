// Charge les questions depuis la feuille Google Sheets publiee.
// Si le telechargement echoue, les questions sont lues dans 'sentrainer_data.json'.
async function fetchQCM() {
    const url =
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vSg_rqA997mD2J3beXWHz2dJPfQ7tuqZY_S768tXgAAgwTg3znMPZEnrH0VAdzALTScIdiLLv1GUffP/pub?output=csv&ts=' +
        Date.now();
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const rows = parseCSV(await res.text());
        rows.shift();
        return rows
            .map(r => ({
                numero: r[0] || '',
                theme: r[1] || 'Autre',
                niveau: r[2] || 'Indefini',
                question: r[3] || '',
                image: r[4] || '',
                choices: [r[5], r[6], r[7]].filter(Boolean),
                answer: r[5] || '',
                correction: r[8] || '',
                cours: r[9] || '',
                carte: r[10] || ''
            }))
            .filter(q => q.question);
    } catch (e) {
        const res = await fetch('sentrainer_data.json');
        return (await res.json()).map(q => ({
            numero: q.numero || '',
            niveau: q.niveau || 'Indefini',
            theme: q.theme || 'Autre',
            question: q.question,
            choices: q.choices,
            answer: q.answer,
            correction: q.correction || '',
            image: q.image || '',
            cours: q.cours || '',
            carte: q.carte || ''
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

function prepareAnswers(choices) {
    const answers = choices.filter(c => c);
    const hasTrue = answers.some(a => /^vrai$/i.test(a));
    const hasFalse = answers.some(a => /^faux$/i.test(a));
    if (answers.length === 2 && hasTrue && hasFalse) {
        const vrai = answers.find(a => /^vrai$/i.test(a));
        const faux = answers.find(a => /^faux$/i.test(a));
        return [vrai, faux];
    }
    if (answers.every(a => !isNaN(parseFloat(a)))) {
        return answers.slice().sort((a, b) => parseFloat(a) - parseFloat(b));
    }
    return shuffle(answers);
}

function ce(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
}

function imgElem(src) {
    if (!src.includes('/')) src = 'photos/' + src;
    const img = ce('img', 'question-image');
    img.src = src;
    img.alt = '';
    return img;
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

function showResults(container) {
    const percent = count ? Math.round((score / count) * 100) : 0;
    const bonus = percent === 100;
    const bonusText = bonus ? ' - Score parfait ! Points doublés !' : '';
    container.innerHTML = `<p>Quiz terminé ! Score : ${score} / ${count} (${percent}%)${bonusText}</p>`;
    if (!(window.auth && typeof auth.getUser === 'function' && auth.getUser())) {
        sendScore();
    }
    showStarAnimation(bonus ? score * 2 : score, bonus);

    const results = history.reduce((acc, h) => {
        const t = h.theme || 'Autre';
        if (!acc[t]) acc[t] = { total: 0, correct: 0 };
        acc[t].total++;
        if (h.isCorrect) acc[t].correct++;
        return acc;
    }, {});

    const box = ce('div', 'filter-box');
    box.style.marginBottom = '30px';
    box.appendChild(ce('span', 'filter-tab', 'Bilan par thème'));

    const inner = document.createElement('div');
    Object.entries(results).forEach(([theme, res]) => {
        const pct = Math.round((res.correct / res.total) * 100);
        const line = ce('div', 'progress-container');
        line.appendChild(ce('p', '', `${theme} : ${pct}% (${res.correct}/${res.total})`));
        const bar = ce('div', 'progress-bar');
        const prog = ce('div', 'progress-bar-inner');
        prog.style.width = pct + '%';
        const ratio = pct / 100;
        const r = Math.round(255 * (1 - ratio));
        const g = Math.round(255 * ratio);
        prog.style.backgroundColor = `rgb(${r}, ${g}, 0)`;
        bar.appendChild(prog);
        line.appendChild(bar);
        inner.appendChild(line);
    });
    box.appendChild(inner);
    container.appendChild(box);

    const historyDiv = ce('div');
    history.forEach((h, i) => {
        const block = ce('div', 'question-block ' + (h.isCorrect ? 'correct' : 'incorrect'));
        const themeText = h.theme ? ` - ${h.theme}` : '';
        block.appendChild(ce('span', 'question-tab', `Q${i + 1}${themeText}`));
        block.appendChild(ce('p', '', h.question));
        if (h.image) {
            const imgBox = ce('div', 'image-box');
            imgBox.appendChild(imgElem(h.image));
            block.appendChild(imgBox);
        }
        block.appendChild(ce('p', '', `Votre réponse : ${h.selected}`));
        if (!h.isCorrect) block.appendChild(ce('p', '', `Bonne réponse : ${h.correct}`));
        if (h.correction) {
            const p = ce('p');
            p.innerHTML = `Correction : ${h.correction}`;
            block.appendChild(p);
        }
        historyDiv.appendChild(block);
    });
    container.appendChild(historyDiv);

    const restart = ce('button', 'quiz-btn', 'Nouveau test');
    restart.addEventListener('click', showFilterSelection);
    container.appendChild(restart);
}

function showRandomQuestion() {
    const container = document.getElementById('quiz-container');
    if (count >= maxQuestions || !questions.length) {
        showResults(container);
        return;
    }
    const index = Math.floor(Math.random() * questions.length);
    current = questions.splice(index, 1)[0];
    count++;
    container.innerHTML = '';
    const block = ce('div', 'question-block');
    const themeText = current.theme ? ` - ${current.theme}` : '';
    block.appendChild(ce('span', 'question-tab', `Q${count}${themeText}`));

    const qLine = ce('div', 'question-line');
    qLine.appendChild(ce('p', '', current.question));
    if (current.cours) {
        const cIcon = ce('span', 'question-icon lightbulb-icon', '💡');
        cIcon.title = 'Voir le cours';
        cIcon.addEventListener('click', () => showTextPopup(current.cours));
        qLine.appendChild(cIcon);
    }
    block.appendChild(qLine);

    if (current.image) {
        const imgBox = ce('div', 'image-box');
        imgBox.appendChild(imgElem(current.image));
        block.appendChild(imgBox);
    }

    const answers = prepareAnswers(current.choices);

    const answerBox = ce('div', 'answer-box');

    answers.forEach(choice => {
        const btn = ce('button', 'quiz-btn', choice);
        btn.addEventListener('click', () => {
            // Désactive immédiatement tous les boutons pour éviter
            // plusieurs clics qui compteraient plusieurs fois la même question
            Array.from(block.querySelectorAll('button')).forEach(b => b.disabled = true);
            const correct = choice === current.answer;
            if (correct) {
                score++;
            }
            history.push({
                numero: current.numero || '',
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
    const box = ce('div', 'filter-box');
    box.appendChild(ce('span', 'filter-tab', title));
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

const createInfoBox = text => ce('div', 'info-box', text);

function showFilterSelection() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';

    const infoText = "Cet espace vous permet de vous entra\u00eener et de v\u00e9rifier vos acquis en technologie. Utilisez les filtres ci-dessous pour g\u00e9n\u00e9rer un quiz personnalis\u00e9 selon votre niveau et les comp\u00e9tences vis\u00e9es.";
    container.appendChild(createInfoBox(infoText));

    const themes = [...new Set(allQuestions.map(q => q.theme || 'Autre'))];
    const niveaux = [...new Set(allQuestions.map(q => q.niveau || 'Indefini'))];

    const levelBox = createFilterBox('Niveau', niveaux);
    const themeBox = createFilterBox('Thème', themes);

    const questionBox = ce('div', 'filter-box');
    const questionTab = ce('span', 'filter-tab', 'Questions');
    questionBox.appendChild(questionTab);
    const qLabel = ce('label', '', `Nombre de questions : ${maxQuestions}`);
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

    const countBox = ce('div', 'count-box', `${allQuestions.length} questions disponibles`);

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

    const start = ce('button', 'quiz-btn', 'Commencer le test');
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

    const box = ce('div', 'filter-box');
    box.appendChild(ce('span', 'filter-tab', 'Connexion'));

    const label = document.createElement('label');
    label.textContent = 'Entrez votre pseudo : ';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'pseudo-input';
    label.appendChild(input);
    box.appendChild(label);

    const btn = ce('button', 'quiz-btn', 'Valider');
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
    fetch('https://script.google.com/macros/s/AKfycbwrGEvUtBgPPGg1UoYWccMsAST3SujPnSBgpcyFhsGSQq4vxLRVyFjfFnoY1baHvgqobQ/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(["historique", { pseudo: pseudo, score: score }])
    }).catch(() => {});
}

function showStarAnimation(points, bonus = false) {
    const overlay = ce('div');
    overlay.id = 'points-popup';

    const box = ce('div', 'popup-box');

    const close = ce('span', 'close');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => overlay.remove(), {once: true});
    });

    const message = ce('p', 'points-text', `Vous avez gagné ${points} points !`);

    box.appendChild(close);
    box.appendChild(message);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const stars = [];
    for (let i = 0; i < points; i++) {
        const starClass = bonus ? 'falling-star bonus-star' : 'falling-star';
        const star = ce('div', starClass, '⭐');
        box.appendChild(star);
        const rect = box.getBoundingClientRect();
        const x = Math.random() * (rect.width - 20);
        const y = -20;
        star.style.left = x + 'px';
        star.style.top = y + 'px';
        // each star gets its own bounce factor for varied rebounds
        const bounce = 0.5 + Math.random() * 0.4; // between 0.5 and 0.9
        stars.push({el: star, x, y, vx: (Math.random() - 0.5) * 4, vy: 0, bounce});
    }

    function animate() {
        const rect = box.getBoundingClientRect();
        stars.forEach(s => {
            s.vy += 0.4;
            s.x += s.vx;
            s.y += s.vy;
            const w = s.el.offsetWidth;
            const h = s.el.offsetHeight;
            if (s.x <= 0) { s.x = 0; s.vx *= -s.bounce; }
            if (s.x + w >= rect.width) { s.x = rect.width - w; s.vx *= -s.bounce; }
            if (s.y + h >= rect.height) { s.y = rect.height - h; s.vy *= -s.bounce; }
            if (s.y <= 0 && s.vy < 0) { s.y = 0; s.vy *= -s.bounce; }
        });

        stars.forEach(s => {
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
    const star = ce('span', 'flying-star', '⭐');
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

function showTextPopup(text) {
    const overlay = ce('div');
    overlay.id = 'info-popup';
    const box = ce('div', 'popup-box');
    const icon = ce('span', 'lightbulb-icon', '💡');
    const close = ce('span', 'close');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => overlay.remove(), {once: true});
    });
    box.appendChild(close);
    box.appendChild(icon);
    const content = ce('div');
    content.innerHTML = text;
    box.appendChild(content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function showImagePopup(src) {
    const overlay = ce('div');
    overlay.id = 'info-popup';
    const box = ce('div', 'popup-box');
    const close = ce('span', 'close');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => overlay.remove(), {once: true});
    });
    const img = imgElem(src);
    box.appendChild(close);
    box.appendChild(img);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}
