// Charge les questions depuis la feuille Google Sheets publiee.
// Si le telechargement echoue, les questions sont lues dans 'sentrainer_data.json'.
async function fetchQCM() {
    const url =
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRnMUhohCoWDFXkYob051ITZ1tFOlLsmNw5mJxPHrPB7g_RPwhKmyBULgMFQD2droRgam8MsJQ2ORsZ/pub?output=csv&ts=' +
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
                question: wrapLatex(r[3] || ''),
                image: r[4] || '',
                choices: [r[5], r[6], r[7]].filter(Boolean).map(wrapLatex),
                answer: wrapLatex(r[5] || ''),
                correction: wrapLatex(r[8] || ''),
                cours: wrapLatex(r[9] || ''),
                carte: r[10] || ''
            }))
            .filter(q => q.question);
    } catch (e) {
        const res = await fetch('sentrainer_data.json');
        return (await res.json()).map(q => ({
            numero: q.numero || '',
            niveau: q.niveau || 'Indefini',
            theme: q.theme || 'Autre',
            question: wrapLatex(q.question),
            choices: (q.choices || []).map(wrapLatex),
            answer: wrapLatex(q.answer),
            correction: wrapLatex(q.correction || ''),
            image: q.image || '',
            cours: wrapLatex(q.cours || ''),
            carte: q.carte || ''
        }));
    }
}

const HISTORY_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCSH8hh-ykxl1L9joc4opVRARLGfcqi6uTW1bRXyyzsu99zo1OXuOYFwCBzxISzEjt2q3Abd9yU-NJ/pub?gid=1508430174&single=true&output=csv';

async function fetchQuestionRates() {
    try {
        const res = await fetch(HISTORY_CSV_URL + '&t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const rows = parseCSV(await res.text());
        if (!rows.length) return {};
        const header = rows.shift().map(h => h.trim().toLowerCase());
        const qIdx = header.indexOf('question');
        const sIdx = header.indexOf('score');
        if (qIdx === -1 || sIdx === -1) return {};
        const stats = {};
        rows.forEach(r => {
            const num = (r[qIdx] || '').trim();
            const val = parseFloat(r[sIdx] || '0') || 0;
            if (!stats[num]) stats[num] = { count: 0, score: 0 };
            stats[num].count++;
            stats[num].score += val;
        });
        const rates = {};
        Object.entries(stats).forEach(([num, { count, score }]) => {
            rates[num] = count ? score / count : 0;
        });
        return rates;
    } catch (e) {
        return {};
    }
}

async function fetchUserQuestionStats(pseudo) {
    try {
        const res = await fetch(HISTORY_CSV_URL + '&t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const rows = parseCSV(await res.text());
        if (!rows.length) return { stats: {}, todaySuccess: 0 };
        const header = rows.shift().map(h => h.trim().toLowerCase());
        const pIdx = header.indexOf('pseudo');
        const qIdx = header.indexOf('question');
        const sIdx = header.indexOf('score');
        const tIdx = header.findIndex(h => ['timestamp', 'date', 'time'].includes(h));
        if (pIdx === -1 || qIdx === -1 || sIdx === -1 || tIdx === -1) return { stats: {}, todaySuccess: 0 };
        const stats = {};
        let todaySuccess = 0;
        const today = new Date().toISOString().slice(0, 10);
        rows.forEach(r => {
            const p = (r[pIdx] || '').trim().toLowerCase();
            if (p !== pseudo.toLowerCase()) return;
            const num = (r[qIdx] || '').trim();
            const val = parseFloat(r[sIdx] || '0') || 0;
            if (!stats[num]) stats[num] = { count: 0, score: 0 };
            stats[num].count++;
            stats[num].score += val;
            const d = parseDate(r[tIdx]);
            if (d && d.toISOString().slice(0, 10) === today && val === 1) todaySuccess++;
        });
        return { stats, todaySuccess };
    } catch (e) {
        return { stats: {}, todaySuccess: 0 };
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

function parseDate(str) {
    const d = new Date(str);
    if (!isNaN(d)) return d;
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
        const [, day, month, year, hh = '0', mm = '0', ss = '0'] = m;
        return new Date(+year, +month - 1, +day, +hh, +mm, +ss);
    }
    return null;
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

function ceHtml(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) {
        el.innerHTML = html;
        renderAxes(el);
    }
    return el;
}


function renderAxes(root) {
    const ns = 'http://www.w3.org/2000/svg';
    root.querySelectorAll('axe').forEach(axe => {
        const min = parseFloat(axe.getAttribute('min')) || 0;
        const max = parseFloat(axe.getAttribute('max')) || 10;
        const step = parseFloat(axe.getAttribute('graduation')) || 1;
        const color = axe.getAttribute('couleur') || '#000';
        const width = 300;
        const height = 40;
        const padding = 10;
        const svg = document.createElementNS(ns, 'svg');
        svg.classList.add('axe');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const axis = document.createElementNS(ns, 'line');
        axis.setAttribute('x1', padding);
        axis.setAttribute('y1', height / 2);
        axis.setAttribute('x2', width - padding);
        axis.setAttribute('y2', height / 2);
        axis.setAttribute('stroke', color);
        svg.appendChild(axis);
        const range = max - min || 1;
        for (let v = min; v <= max; v += step) {
            const x = padding + ((v - min) / range) * (width - 2 * padding);
            const tick = document.createElementNS(ns, 'line');
            tick.setAttribute('x1', x);
            tick.setAttribute('y1', height / 2 - 5);
            tick.setAttribute('x2', x);
            tick.setAttribute('y2', height / 2 + 5);
            tick.setAttribute('stroke', color);
            svg.appendChild(tick);
            const label = document.createElementNS(ns, 'text');
            label.setAttribute('x', x);
            label.setAttribute('y', height / 2 + 15);
            label.setAttribute('font-size', '10');
            label.setAttribute('text-anchor', 'middle');
            label.textContent = v;
            svg.appendChild(label);
        }
        axe.querySelectorAll('point').forEach(pt => {
            const xVal = parseFloat(pt.getAttribute('x'));
            if (isNaN(xVal)) return;
            const lbl = pt.textContent.trim();
            const x = padding + ((xVal - min) / range) * (width - 2 * padding);
            const circle = document.createElementNS(ns, 'circle');
            const pColor = pt.getAttribute('couleur') || 'red';
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', height / 2);
            circle.setAttribute('r', 3);
            circle.setAttribute('fill', pColor);
            svg.appendChild(circle);
            if (lbl) {
                const txt = document.createElementNS(ns, 'text');
                txt.setAttribute('x', x);
                txt.setAttribute('y', height / 2 - 8);
                txt.setAttribute('font-size', '10');
                txt.setAttribute('text-anchor', 'middle');
                txt.textContent = lbl;
                svg.appendChild(txt);
            }
        });
        axe.replaceWith(svg);
    });
}
function wrapLatex(str) {
    // Replace explicit <html>...</html> segments with raw HTML
    if (str.includes('<html>')) {
        str = str.replace(/<html>([\s\S]*?)<\/html>/g, (_, html) => html);
    }
    const tikzBlocks = [];
    if (str.includes('<tikz>')) {
        str = str.replace(/<tikz>([\s\S]*?)<\/tikz>/g, (_, tikz) => {
            const hasEnv = /\\begin{tikzpicture}/.test(tikz);
            const body = hasEnv ? tikz : `\\begin{tikzpicture}${tikz}\\end{tikzpicture}`;
            const token = `@@TIKZ${tikzBlocks.length}@@`;
            tikzBlocks.push(`\\[\\require{tikz}${body}\\]`);
            return token;
        });
    }
    // Replace explicit <latex>...</latex> segments with MathJax inline syntax
    if (str.includes('<latex>')) {
        str = str.replace(/<latex>([\s\S]*?)<\/latex>/g, (_, tex) => `\\(${tex}\\)`);
    }
    // Fallback: wrap any LaTeX style commands starting with a backslash
    str = str.replace(/\\[a-zA-Z]+(?:\{[^{}]*\})*/g, m => `\\(${m}\\)`);
    tikzBlocks.forEach((block, i) => {
        str = str.replace(`@@TIKZ${i}@@`, block);
    });
    return str;
}

function typesetMath() {
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise();
    }
}

function imgElem(src) {
    if (!src.includes('/')) src = 'photos/' + src;
    const img = ce('img', 'question-image');
    img.src = src;
    img.alt = '';
    return img;
}
function selectQuestions(candidates, count) {
    if (!candidates.length) return [];
    const pool = candidates.slice();
    const firstIdx = Math.floor(Math.random() * pool.length);
    const first = pool.splice(firstIdx, 1)[0];
    const result = [first];
    let prevRate = questionRates[first.numero] || 0;
    while (result.length < count) {
        const lower = pool.filter(q => (questionRates[q.numero] || 0) <= prevRate);
        if (!lower.length) break;
        lower.sort((a, b) => (questionRates[b.numero] || 0) - (questionRates[a.numero] || 0));
        const bestRate = questionRates[lower[0].numero] || 0;
        const same = lower.filter(q => (questionRates[q.numero] || 0) === bestRate);
        const next = same[Math.floor(Math.random() * same.length)];
        pool.splice(pool.indexOf(next), 1);
        result.push(next);
        prevRate = bestRate;
    }
    return result;
}

let questionRates = {};
let questions = [];
let allQuestions = [];
let current = null;
let score = 0;
let count = 0;
let maxQuestions = 5;
let history = [];
let pseudo = '';
let userQuestionStats = {};
const HIGHLIGHT_DELAY = 1000; // temps avant la question suivante
let pointsAwarded = false; // évite un ajout multiple de points
let allThemesSelectedAtStart = false; // indique si tous les thèmes étaient cochés
let challengeActive = false;
let challengeTheme = '';
let previousMaxQuestions = 5;
let doubleOrNothingActive = false;
let doubleStake = 1;
let isPaused = false;
let pendingAction = null;
let actionTimeout = null;
let challengeGuard = null;
let challengeGuardWarned = false;

async function updateUserStats() {
    if (!pseudo) return;
    const data = await fetchUserQuestionStats(pseudo);
    userQuestionStats = data.stats;
}

function activateChallengeGuard() {
    showWarningPopup("Challenge : l'utilisation d'internet est interdite");
    const warn = () => {
        if (challengeGuardWarned) return;
        challengeGuardWarned = true;
        showWarningPopup('Challenge en cours : navigation bloquée');
        setTimeout(() => (challengeGuardWarned = false), 500);
    };
    const handleBlur = () => {
        warn();
        window.focus();
    };
    const handleVisibility = () => {
        if (document.hidden) {
            warn();
        }
    };
    const handleMouseLeave = e => {
        if (e.relatedTarget === null) warn();
    };
    const handleClick = e => {
        const link = e.target.closest('a');
        if (link && link.href && !link.href.startsWith('#')) {
            e.preventDefault();
            warn();
        }
    };
    const handleKey = e => {
        if (e.ctrlKey && ['l', 't', 'n'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            warn();
        }
    };
    const handleBeforeUnload = e => {
        e.preventDefault();
        e.returnValue = '';
    };
    window.addEventListener('blur', handleBlur);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    challengeGuard = {
        handleBlur,
        handleMouseLeave,
        handleClick,
        handleKey,
        handleBeforeUnload,
        handleVisibility
    };
}

function deactivateChallengeGuard() {
    if (!challengeGuard) return;
    const {
        handleBlur,
        handleMouseLeave,
        handleClick,
        handleKey,
        handleBeforeUnload,
        handleVisibility
    } = challengeGuard;
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener('mouseleave', handleMouseLeave);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKey, true);
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    challengeGuard = null;
}

function scheduleAction(fn, delay) {
    pendingAction = fn;
    if (!isPaused) {
        actionTimeout = setTimeout(() => {
            actionTimeout = null;
            const act = pendingAction;
            pendingAction = null;
            act();
        }, delay);
    }
}

function pauseProgram() {
    isPaused = true;
    if (actionTimeout) {
        clearTimeout(actionTimeout);
        actionTimeout = null;
    }
}

function resumeProgram() {
    if (!isPaused) return;
    isPaused = false;
    if (pendingAction) {
        const act = pendingAction;
        pendingAction = null;
        act();
    }
}

function showResults(container) {
    deactivateChallengeGuard();
    const percent = count ? Math.round((score / count) * 100) : 0;
    const noError = percent === 100;
    let multiplier = 1;
    if (challengeActive && noError && count === 5) {
        multiplier = 3;
    } else if (noError && allThemesSelectedAtStart) {
        if (count >= 10) {
            multiplier = 3;
        } else if (count >= 5) {
            multiplier = 2;
        }
    }
    const bonus = multiplier > 1;
    const bonusText = bonus
        ? ` - Score parfait ! Points ${multiplier === 3 ? 'triplés' : 'doublés'} !`
        : (noError ? ' - Score parfait !' : '');
    container.innerHTML = `<p>Quiz terminé ! Score : ${score} / ${count} (${percent}%)${bonusText}</p>`;
    if (!(window.auth && typeof auth.getUser === 'function' && auth.getUser())) {
        sendScore();
    }
    showStarAnimation(score * multiplier, bonus);
    if (challengeActive) {
        challengeActive = false;
        maxQuestions = previousMaxQuestions;
    }

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
        line.appendChild(ceHtml('p', '', `${theme} : ${pct}% (${res.correct}/${res.total})`));
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
        const qTheme = h.theme || 'Autre';
        block.appendChild(ce('span', 'question-tab', `Q${i + 1} - ${qTheme}`));
        block.appendChild(ceHtml('p', '', h.question));
        if (h.image) {
            const imgBox = ce('div', 'image-box');
            imgBox.appendChild(imgElem(h.image));
            block.appendChild(imgBox);
        }
        block.appendChild(ceHtml('p', '', `Votre réponse : ${h.selected}`));
        if (!h.isCorrect) block.appendChild(ceHtml('p', '', `Bonne réponse : ${h.correct}`));
        if (h.correction) {
            block.appendChild(ceHtml('p', '', `Correction : ${h.correction}`));
        }
        historyDiv.appendChild(block);
    });
    container.appendChild(historyDiv);

    const restart = ce('button', 'quiz-btn', 'Nouveau test');
    restart.addEventListener('click', showFilterSelection);
    container.appendChild(restart);
    typesetMath();
}

function showRandomQuestion() {
    const container = document.getElementById('quiz-container');
    if (!doubleOrNothingActive && (count >= maxQuestions || !questions.length)) {
        showResults(container);
        return;
    }
    if (doubleOrNothingActive && !questions.length) {
        questions = shuffle(allQuestions.slice());
    }
    current = questions.shift();
    count++;
    container.innerHTML = '';
    const block = ce('div', 'question-block');
    const themeLabel = current.theme || 'Autre';
    block.appendChild(ce('span', 'question-tab', `Q${count} - ${themeLabel}`));
    const rate = Math.round((questionRates[current.numero] || 0) * 100);
    block.appendChild(ce('div', 'success-rate', `Taux de réussite : ${rate}%`));

    const stats = userQuestionStats[current.numero] || { score: 0, count: 0 };
    block.appendChild(ce('div', 'success-rate', `Score : ${stats.score} / ${stats.count}`));

    const qLine = ce('div', 'question-line');
    qLine.appendChild(ceHtml('p', '', current.question));
    if (current.cours && !doubleOrNothingActive) {
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
        const btn = ceHtml('button', 'quiz-btn', choice);
        btn.addEventListener('click', async () => {
            // Désactive immédiatement tous les boutons pour éviter
            // plusieurs clics qui compteraient plusieurs fois la même question
            Array.from(block.querySelectorAll('button')).forEach(b => b.disabled = true);
            const correct = choice === current.answer;
            if (correct) {
                score++;
                await updateUserStats();
                if (Math.random() < 0.9) explodeOtherChoices(btn);
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
            if (!userQuestionStats[current.numero]) {
                userQuestionStats[current.numero] = { score: 0, count: 0 };
            }
            userQuestionStats[current.numero].count++;
            if (correct) userQuestionStats[current.numero].score++;
            sendCompetence(current.numero || '', correct ? 1 : 0);
            btn.style.backgroundColor = correct ? '#00a000' : '#ff0000';
            if (!correct && current.correction) {
                showTextPopup(`Correction : ${current.correction}`);
            }
            if (doubleOrNothingActive) {
                if (correct) {
                    scheduleAction(askDoubleOrNothing, HIGHLIGHT_DELAY);
                } else {
                    scheduleAction(() => {
                        deactivateChallengeGuard();
                        showStarAnimation(0);
                        doubleOrNothingActive = false;
                        doubleStake = 1;
                        showFilterSelection();
                    }, HIGHLIGHT_DELAY);
                }
            } else {
                scheduleAction(showRandomQuestion, HIGHLIGHT_DELAY);
            }
        });
        answerBox.appendChild(btn);
    });

    // Align buttons to the left if any answer text is long
    if (answers.some(c => c.length > 40)) {
        answerBox.classList.add('align-left');
    }

    block.appendChild(answerBox);

    container.appendChild(block);
    typesetMath();
}

document.addEventListener('DOMContentLoaded', async () => {
    pseudo = localStorage.getItem('pseudo') || '';
    const [qcm, rates] = await Promise.all([
        fetchQCM(),
        fetchQuestionRates()
    ]);
    allQuestions = qcm;
    questionRates = rates;
    if (pseudo) {
        await updateUserStats();
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
    challengeActive = false;
    doubleOrNothingActive = false;
    doubleStake = 1;
    deactivateChallengeGuard();
    maxQuestions = 5;
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';

    const infoText =
        "Cet espace vous permet de vous entra\u00eener et de v\u00e9rifier vos acquis en technologie. R\u00e9pondez correctement aux questions pour gagner des \u00e9toiles que vous pourrez d\u00e9penser en Vbucks ou en Robux. Utilisez les filtres ci-dessous pour g\u00e9n\u00e9rer un quiz personnalis\u00e9 selon votre niveau et les comp\u00e9tences vis\u00e9es.";
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

    const bonusInfo = ce(
        'p',
        'bonus-info',
        '5 questions avec tous les th\u00e8mes coch\u00e9s et 100 % de r\u00e9ussite : points doubl\u00e9s. 10 questions avec tous les th\u00e8mes coch\u00e9s et 100 % de bonnes r\u00e9ponses : points tripl\u00e9s.'
    );
    questionBox.appendChild(bonusInfo);

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
        allThemesSelectedAtStart =
            themeBox.querySelectorAll('input[type="checkbox"]:checked').length ===
            themeBox.querySelectorAll('input[type="checkbox"]').length;
        const selectedThemes = Array.from(themeBox.querySelectorAll('input[type=checkbox]'))
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const selectedLevels = Array.from(levelBox.querySelectorAll('input[type=checkbox]'))
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const candidates = allQuestions.filter(q =>
            selectedThemes.includes(q.theme || 'Autre') &&
            selectedLevels.includes(q.niveau || 'Indefini')
        );
        questions = selectQuestions(candidates, maxQuestions);
        score = 0;
        count = 0;
        history = [];
        showRandomQuestion();
    });

    container.appendChild(levelBox);
    container.appendChild(themeBox);
    container.appendChild(questionBox);
    container.appendChild(start);

    offerChallenge(themes);
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
    btn.addEventListener('click', async () => {
        const val = input.value.trim();
        if (val) {
            pseudo = val;
            localStorage.setItem('pseudo', pseudo);
            await updateUserStats();
            showFilterSelection();
        }
    });
    box.appendChild(btn);

    container.appendChild(box);
}

function sendScore() {
    if (!pseudo) return;
    fetch('https://script.google.com/macros/s/AKfycbxg1KZw9FZ7azPrv4SxFeJEmJJxe4Fl3KCkNU9s496EPR7VpP7aX-UE3a90HNesS1t2Iw/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(["historique", { pseudo: pseudo, score: score }])
    }).catch(() => {});
}

function sendCompetence(idQuestion, resultat) {
    if (pseudo) {
        fetch('https://script.google.com/macros/s/AKfycbxg1KZw9FZ7azPrv4SxFeJEmJJxe4Fl3KCkNU9s496EPR7VpP7aX-UE3a90HNesS1t2Iw/exec', {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(["competence", { pseudo: pseudo, idQuestion: idQuestion, resultat: resultat }])
        }).catch(() => {});
    }
}

function showStarAnimation(points, bonus = false) {
    pauseProgram();
    const overlay = ce('div');
    overlay.id = 'points-popup';

    const box = ce('div', 'popup-box');

    const close = ce('span', 'close');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            resumeProgram();
        }, {once: true});
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

function explodeOtherChoices(clicked) {
    const others = Array.from(clicked.parentElement.querySelectorAll('button')).filter(b => b !== clicked);
    others.forEach(btn => {
        btn.classList.add('explode');
        btn.addEventListener('animationend', () => btn.remove(), { once: true });
    });
}

function showTextPopup(text) {
    pauseProgram();
    const overlay = ce('div');
    overlay.id = 'info-popup';
    const box = ce('div', 'popup-box');
    const close = ce('span', 'close');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            resumeProgram();
        }, {once: true});
    });
    box.appendChild(close);
    const content = ce('div', 'popup-content');
    content.innerHTML = text;
    renderAxes(content);
    box.appendChild(content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    typesetMath();
}

function showImagePopup(src) {
    pauseProgram();
    const overlay = ce('div');
    overlay.id = 'info-popup';
    const box = ce('div', 'popup-box');
    const close = ce('span', 'close');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            resumeProgram();
        }, {once: true});
    });
    const img = imgElem(src);
    box.appendChild(close);
    box.appendChild(img);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function showWarningPopup(text) {
    pauseProgram();
    const overlay = ce('div');
    overlay.id = 'warning-popup';
    const box = ce('div', 'popup-box');
    const close = ce('span', 'close');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            resumeProgram();
        }, {once: true});
    });
    const icon = ce('span', 'warning-icon', '⚠️');
    const content = ce('div', 'popup-content');
    content.innerHTML = text;
    renderAxes(content);
    box.appendChild(close);
    box.appendChild(icon);
    box.appendChild(content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function markQuestionWrong() {
    if (!current) return;
    const block = document.querySelector('.question-block');
    if (block) {
        Array.from(block.querySelectorAll('button')).forEach(b => b.disabled = true);
    }
    history.push({
        numero: current.numero || '',
        question: current.question,
        selected: '(hors zone)',
        correct: current.answer,
        correction: current.correction || '',
        image: current.image || '',
        theme: current.theme || 'Autre',
        isCorrect: false
    });
    if (!userQuestionStats[current.numero]) {
        userQuestionStats[current.numero] = { score: 0, count: 0 };
    }
    userQuestionStats[current.numero].count++;
    sendCompetence(current.numero || '', 0);
    scheduleAction(showRandomQuestion, HIGHLIGHT_DELAY);
}

function offerChallenge(themes) {
    const chance = Math.random();
    if (chance < 0.05) {
        offerDoubleOrNothing();
    } else if (chance < 0.20 && themes.length) {
        pauseProgram();
        const theme = themes[Math.floor(Math.random() * themes.length)];
        const overlay = ce('div');
        overlay.id = 'challenge-popup';
        const box = ce('div', 'popup-box');
        const close = ce('span', 'close');
        close.innerHTML = '&times;';
        const icon = ce('span', 'challenge-icon', '🏆');
        const msg = ce('p', '', `Challenge : réussis cette série de 5 questions sur le thème ${theme} et triple les points !`);
        const accept = ce('button', 'quiz-btn', 'Accepter');
        const refuse = ce('button', 'quiz-btn', 'Refuser');

        function remove() {
            overlay.classList.add('fade-out');
            overlay.addEventListener('animationend', () => {
                overlay.remove();
                resumeProgram();
            }, { once: true });
        }

        accept.addEventListener('click', () => {
            remove();
            challengeActive = true;
            challengeTheme = theme;
            previousMaxQuestions = maxQuestions;
            maxQuestions = 5;
            pointsAwarded = false;
            questions = shuffle(allQuestions.filter(q => (q.theme || 'Autre') === theme)).slice(0, 5);
            score = 0;
            count = 0;
            history = [];
            activateChallengeGuard();
            showRandomQuestion();
        });

        refuse.addEventListener('click', remove);
        close.addEventListener('click', remove);

        box.appendChild(close);
        box.appendChild(icon);
        box.appendChild(msg);
        box.appendChild(accept);
        box.appendChild(refuse);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }
}

function offerDoubleOrNothing() {
    pauseProgram();
    const overlay = ce('div');
    overlay.id = 'challenge-popup';
    const box = ce('div', 'popup-box');
    const close = ce('span', 'close');
    close.innerHTML = '&times;';
    const icon = ce('span', 'challenge-icon', '🎲');
    const msg = ce('p', '', 'Challenge : Quitte ou double sur une série de questions !');
    const accept = ce('button', 'quiz-btn', 'Accepter');
    const refuse = ce('button', 'quiz-btn', 'Refuser');

    function remove() {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            resumeProgram();
        }, { once: true });
    }

    accept.addEventListener('click', () => {
        remove();
        doubleOrNothingActive = true;
        doubleStake = 1;
        pointsAwarded = false;
        questions = shuffle(allQuestions.slice());
        score = 0;
        count = 0;
        history = [];
        activateChallengeGuard();
        showRandomQuestion();
    });

    refuse.addEventListener('click', remove);
    close.addEventListener('click', remove);

    box.appendChild(close);
    box.appendChild(icon);
    box.appendChild(msg);
    box.appendChild(accept);
    box.appendChild(refuse);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function askDoubleOrNothing() {
    pauseProgram();
    const overlay = ce('div');
    overlay.id = 'challenge-popup';
    const box = ce('div', 'popup-box');
    const plural = doubleStake > 1 ? 's' : '';
    const msg = ce(
        'p',
        '',
        `Bravo ! Tu as ${doubleStake} étoile${plural}. Souhaites-tu t'arrêter et les garder ou tenter d'en gagner ${doubleStake * 2} ?`
    );
    const stop = ce('button', 'quiz-btn', `Arrêter (${doubleStake} ⭐)`);
    const cont = ce('button', 'quiz-btn', `Continuer (${doubleStake * 2} ⭐)`);

    function remove() {
        overlay.classList.add('fade-out');
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            resumeProgram();
        }, { once: true });
    }

    stop.addEventListener('click', () => {
        remove();
        deactivateChallengeGuard();
        showStarAnimation(doubleStake);
        doubleOrNothingActive = false;
        doubleStake = 1;
        showFilterSelection();
    });
    cont.addEventListener('click', () => {
        remove();
        doubleStake *= 2;
        scheduleAction(showRandomQuestion, HIGHLIGHT_DELAY);
    });

    box.appendChild(msg);
    box.appendChild(stop);
    box.appendChild(cont);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}
