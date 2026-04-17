(function () {
    const timeElement = document.getElementById('live-time');
    const dateElement = document.getElementById('live-date');
    const openPopupButton = document.getElementById('open-datetime-popup');
    const rollDiceButton = document.getElementById('roll-dice-button');
    const closePopupButton = document.getElementById('close-datetime-popup');
    const datetimePopup = document.getElementById('datetime-popup');
    const diceResultElement = document.getElementById('dice-result');

    if (!timeElement || !dateElement) {
        return;
    }

    function updateDateTime() {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('fr-FR');
        dateElement.textContent = now.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    updateDateTime();
    setInterval(updateDateTime, 1000);

    const closePopup = () => {
        if (!datetimePopup) return;
        datetimePopup.hidden = true;
    };

    openPopupButton?.addEventListener('click', () => {
        if (!datetimePopup) return;
        datetimePopup.hidden = false;
    });

    closePopupButton?.addEventListener('click', closePopup);

    datetimePopup?.addEventListener('click', (event) => {
        if (event.target === datetimePopup) {
            closePopup();
        }
    });

    const askPositiveInteger = (message, fallbackValue) => {
        const response = window.prompt(message, String(fallbackValue));
        if (response === null) return null;
        const value = Number.parseInt(response, 10);
        if (!Number.isFinite(value) || value <= 0) return null;
        return value;
    };

    rollDiceButton?.addEventListener('click', () => {
        const numberOfDice = askPositiveInteger('Combien de dés voulez-vous lancer ?', 1);
        if (numberOfDice === null) {
            if (diceResultElement) {
                diceResultElement.textContent = 'Lancer annulé (nombre de dés invalide).';
            }
            return;
        }

        const facesPerDie = askPositiveInteger('Combien de faces par dé ?', 6);
        if (facesPerDie === null) {
            if (diceResultElement) {
                diceResultElement.textContent = 'Lancer annulé (nombre de faces invalide).';
            }
            return;
        }

        const rolls = Array.from({ length: numberOfDice }, () => Math.floor(Math.random() * facesPerDie) + 1);
        const total = rolls.reduce((sum, currentValue) => sum + currentValue, 0);
        if (diceResultElement) {
            diceResultElement.textContent = `Résultat (${numberOfDice}d${facesPerDie}) : [${rolls.join(', ')}] → Total ${total}`;
        }
    });
})();
