function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    clockEl.textContent = now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    dateEl.textContent = now.toLocaleDateString('fr-FR');
}
setInterval(updateClock, 1000);
updateClock();

let timerSeconds = 0;
let timerInterval = null;
function updateTimer() {
    const hrs = String(Math.floor(timerSeconds/3600)).padStart(2,'0');
    const mins = String(Math.floor((timerSeconds%3600)/60)).padStart(2,'0');
    const secs = String(timerSeconds%60).padStart(2,'0');
    document.getElementById('timer-display').textContent = `${hrs}:${mins}:${secs}`;
}
function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimer();
        }, 1000);
    }
}
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
function resetTimer() {
    stopTimer();
    timerSeconds = 0;
    updateTimer();
}

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('stop-btn').addEventListener('click', stopTimer);
document.getElementById('reset-btn').addEventListener('click', resetTimer);
updateTimer();
