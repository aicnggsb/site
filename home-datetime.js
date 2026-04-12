(function () {
    const timeElement = document.getElementById('live-time');
    const dateElement = document.getElementById('live-date');

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
})();
