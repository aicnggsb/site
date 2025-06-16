async function fetchQCM() {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVQMq6u1Wl-Tzjl27ir1iMcj1hTdSIsoJrVQAtW31i1AhvBoPGLT3rZoc6wfuizX7f1KWuaBphf2IX/gviz/tq?gid=1246434759&pub=1&tqx=out:json';
    const res = await fetch(url);
    const text = await res.text();
    const match = text.match(/setResponse\((.*)\)/);
    if (!match) return [];
    const obj = JSON.parse(match[1]);
    return obj.table.rows.map(r => ({
        question: r.c[0]?.v || '',
        choices: [r.c[1]?.v || '', r.c[2]?.v || '', r.c[3]?.v || ''],
        answer: r.c[4]?.v
    }));
}

let questions = [];
let current = 0;
let score = 0;

function showQuestion() {
    const container = document.getElementById('quiz-container');
    if (current >= questions.length) {
        container.innerHTML = `<p>Score : ${score} / ${questions.length}</p>`;
        return;
    }
    const q = questions[current];
    const options = q.choices
        .map((choice, idx) => `<label><input type="radio" name="opt" value="${idx}"> ${choice}</label><br>`)
        .join('');
    container.innerHTML = `
        <p>${q.question}</p>
        ${options}
        <button id="next-btn">Valider</button>
    `;
    document.getElementById('next-btn').addEventListener('click', () => {
        const checked = document.querySelector('input[name="opt"]:checked');
        if (checked) {
            if (String(checked.value) === String(q.answer)) {
                score++;
            }
            current++;
            showQuestion();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    questions = await fetchQCM();
    showQuestion();
});
