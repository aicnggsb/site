// Fetches CSV from Google Sheets and generates a crossword puzzle
async function loadCrossword() {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZSziJuYqkGDE4pZW_RQwZ5AMdx33ezxgOO8Um5RoOPpQEvxH2q9aocgT4Aja-VgPuWP9OLWY60gnI/pub?output=csv';
    let entries = [];
    try {
        const res = await fetch(url + '&t=' + Date.now());
        if (!res.ok) throw new Error('http ' + res.status);
        const text = await res.text();
        entries = parseCSV(text);
    } catch (e) {
        console.error('CSV fetch failed', e);
    }
    if (!entries.length) {
        // fallback simple example data
        entries = [
            {word: 'ROBOT', clue: 'Machine automatique'},
            {word: 'CABLE', clue: 'Permet de relier'},
            {word: 'ECRAN', clue: 'Pour afficher'},
        ];
    }
    if (entries.length > 5) {
        for (let i = entries.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        entries = entries.slice(0, 5);
    }

    const data = generateCrossword(entries);
    drawGrid(data.grid, data.placed);
    drawClues(data.placed);
    checkCompletion(data.placed);
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const rows = lines.map(l => l.split(','));
    if (!rows.length) return [];
    const header = rows[0];
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const wordIdx = header.findIndex(h => norm(h).includes('mot'));
    const clueIdx = header.findIndex(h => norm(h).includes('def'));
    const res = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const word = (row[wordIdx] || '').trim().toUpperCase();
        const clue = (row[clueIdx] || '').trim();
        if (word) res.push({word, clue});
    }
    return res;
}

function generateCrossword(entries) {
    const size = 15;
    const grid = Array.from({length: size}, () => Array.from({length: size}, () => null));
    const placed = [];

    function canPlace(word, row, col, dir) {
        if (dir === 'H') {
            if (col < 0 || col + word.length > size) return false;
            if (grid[row][col - 1] || grid[row][col + word.length]) return false;
        } else {
            if (row < 0 || row + word.length > size) return false;
            if ((grid[row - 1] && grid[row - 1][col]) ||
                (grid[row + word.length] && grid[row + word.length][col])) return false;
        }
        for (let i = 0; i < word.length; i++) {
            const r = row + (dir === 'V' ? i : 0);
            const c = col + (dir === 'H' ? i : 0);
            const cell = grid[r][c];
            if (cell) {
                if (cell.letter !== word[i]) return false;
                if (cell.dir === dir) return false;
            } else {
                if (dir === 'H') {
                    if ((grid[r - 1] && grid[r - 1][c]) || (grid[r + 1] && grid[r + 1][c])) return false;
                } else {
                    if ((grid[r] && grid[r][c - 1]) || (grid[r] && grid[r][c + 1])) return false;
                }
            }
        }
        return true;
    }

    function place(wordObj, row, col, dir) {
        for (let i = 0; i < wordObj.word.length; i++) {
            const r = row + (dir === 'V' ? i : 0);
            const c = col + (dir === 'H' ? i : 0);
            grid[r][c] = {letter: wordObj.word[i], dir};
        }
        wordObj.row = row; wordObj.col = col; wordObj.dir = dir;
        placed.push(wordObj);
    }

    if (entries.length) {
        const first = entries[0];
        place(first, Math.floor(size/2), Math.floor((size - first.word.length)/2), 'H');
        for (let idx = 1; idx < entries.length; idx++) {
            const w = entries[idx];
            let placedFlag = false;
            for (let i = 0; i < w.word.length && !placedFlag; i++) {
                const ch = w.word[i];
                for (const p of placed) {
                    const letters = p.word;
                    for (let j = 0; j < letters.length && !placedFlag; j++) {
                        if (letters[j] === ch) {
                            const row = p.row + (p.dir === 'H' ? 0 : j) - (p.dir === 'H' ? i : 0);
                            const col = p.col + (p.dir === 'V' ? 0 : j) - (p.dir === 'V' ? i : 0);
                            const dir = p.dir === 'H' ? 'V' : 'H';
                            if (canPlace(w.word, row, col, dir)) {
                                place(w, row, col, dir);
                                placedFlag = true;
                            }
                        }
                    }
                }
            }
            if (!placedFlag) {
                for (let r = 0; r < size && !placedFlag; r++) {
                    for (let c = 0; c < size && !placedFlag; c++) {
                        if (canPlace(w.word, r, c, 'H')) { place(w, r, c, 'H'); placedFlag = true; }
                        else if (canPlace(w.word, r, c, 'V')) { place(w, r, c, 'V'); placedFlag = true; }
                    }
                }
            }
        }
    }
    return {grid, placed};
}

function drawGrid(grid, placed) {
    const board = document.getElementById('crossword');
    board.innerHTML = '';
    for (let r = 0; r < grid.length; r++) {
        const rowEl = document.createElement('tr');
        for (let c = 0; c < grid[r].length; c++) {
            const cell = grid[r][c];
            const td = document.createElement('td');
            if (cell) {
                td.className = 'cell';
                const input = document.createElement('input');
                input.maxLength = 1;
                input.dataset.row = r;
                input.dataset.col = c;
                input.dataset.dir = cell.dir;
                input.dataset.letter = cell.letter;
                input.addEventListener('input', () => {
                    input.value = input.value.toUpperCase();

                    const tdEl = input.parentElement;
                    if (!input.value) {
                        tdEl.classList.remove('correct', 'incorrect');
                    } else if (input.value === input.dataset.letter) {
                        tdEl.classList.add('correct');
                        tdEl.classList.remove('incorrect');
                    } else {
                        tdEl.classList.add('incorrect');
                        tdEl.classList.remove('correct');
                    }

                    if (input.value) {
                        const dir = input.dataset.dir;
                        const nextRow = parseInt(input.dataset.row) + (dir === 'V' ? 1 : 0);
                        const nextCol = parseInt(input.dataset.col) + (dir === 'H' ? 1 : 0);
                        const nextInput = document.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`);
                        if (nextInput) {
                            nextInput.focus();
                        }
                    }

                    checkCompletion(placed);
                });
                td.appendChild(input);
            } else {
                td.className = 'empty';
            }
            rowEl.appendChild(td);
        }
        board.appendChild(rowEl);
    }

    placed.forEach((p, index) => {
        const r = p.row;
        const c = p.col;
        const td = board.children[r].children[c];
        const num = document.createElement('span');
        num.className = 'number';
        num.textContent = index + 1;
        td.classList.add('start');
        td.appendChild(num);
    });
}

function drawClues(placed) {
    const list = document.getElementById('clues');
    list.innerHTML = '';
    placed.forEach((p, i) => {
        const li = document.createElement('li');
        li.textContent = (i + 1) + '. ' + p.clue;
        list.appendChild(li);
    });
}

function checkCompletion(placed) {
    for (const p of placed) {
        for (let i = 0; i < p.word.length; i++) {
            const r = p.row + (p.dir === 'V' ? i : 0);
            const c = p.col + (p.dir === 'H' ? i : 0);
            const input = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
            if (!input || input.value.toUpperCase() !== p.word[i]) {
                return;
            }
        }
    }
    const msg = document.getElementById('message');
    msg.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
    loadCrossword();
    const closeBtn = document.getElementById('close-message');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('message').classList.remove('show');
        });
    }
});
