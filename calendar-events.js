(function () {
    const CALENDAR_CONFIG = {
        apiKey: '',
        calendarId: '',
        maxResults: 8,
        eventPrefix: '5E1'
    };

    const listElement = document.getElementById('calendar-events-list');
    const statusElement = document.getElementById('calendar-status');

    if (!listElement || !statusElement) {
        return;
    }

    function setStatus(message, isError) {
        statusElement.textContent = message;
        statusElement.classList.toggle('calendar-error', Boolean(isError));
    }

    function formatDate(isoDate, timeZone) {
        const date = new Date(isoDate);
        const options = {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timeZone || 'Europe/Paris'
        };

        return new Intl.DateTimeFormat('fr-FR', options).format(date);
    }

    function renderEvents(events, timeZone) {
        listElement.innerHTML = '';

        if (!events.length) {
            const item = document.createElement('li');
            item.textContent = 'Aucun événement à venir commençant par « 5E1 ».';
            listElement.appendChild(item);
            setStatus('Mise à jour effectuée.');
            return;
        }

        events.forEach((eventItem) => {
            const item = document.createElement('li');
            const startValue = eventItem.start.dateTime || eventItem.start.date;

            const title = document.createElement('strong');
            title.textContent = eventItem.summary;

            const start = document.createElement('div');
            start.textContent = `Début : ${formatDate(startValue, timeZone)}`;

            item.appendChild(title);
            item.appendChild(start);
            listElement.appendChild(item);
        });

        setStatus('Mise à jour effectuée.');
    }

    async function loadCalendarEvents() {
        if (!CALENDAR_CONFIG.apiKey || !CALENDAR_CONFIG.calendarId) {
            setStatus('Renseignez apiKey et calendarId dans calendar-events.js pour activer cette section.', true);
            return;
        }

        const params = new URLSearchParams({
            key: CALENDAR_CONFIG.apiKey,
            singleEvents: 'true',
            orderBy: 'startTime',
            timeMin: new Date().toISOString(),
            maxResults: String(CALENDAR_CONFIG.maxResults)
        });

        const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_CONFIG.calendarId)}/events?${params.toString()}`;

        try {
            setStatus('Chargement des événements Google Agenda...');
            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error(`Erreur API Google Calendar (${response.status}).`);
            }

            const payload = await response.json();
            const items = Array.isArray(payload.items) ? payload.items : [];
            const filtered = items.filter((eventItem) => {
                const summary = eventItem.summary || '';
                return summary.toUpperCase().startsWith(CALENDAR_CONFIG.eventPrefix.toUpperCase());
            });

            renderEvents(filtered, payload.timeZone);
        } catch (error) {
            setStatus(`Impossible de charger l'agenda : ${error.message}`, true);
        }
    }

    loadCalendarEvents();
})();
