(function () {
    const timeElement = document.getElementById('live-time');
    const dateElement = document.getElementById('live-date');
    const openPopupButton = document.getElementById('open-datetime-popup');
    const closePopupButton = document.getElementById('close-datetime-popup');
    const datetimePopup = document.getElementById('datetime-popup');

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
})();
