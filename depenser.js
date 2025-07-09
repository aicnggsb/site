document.addEventListener('DOMContentLoaded', () => {
    if (!window.auth || !auth.getUser()) {
        alert('Vous devez être connecté pour accéder à cette page.');
        window.location.href = 'index.html';
        return;
    }
    const user = auth.getUser();
    if ((user.classe || '').toUpperCase() !== '6E') {
        alert('Cette page est réservée aux 6E.');
        window.location.href = 'index.html';
        return;
    }
    function spend(cost, label) {
        const u = auth.getUser();
        if (!u || u.score < cost) {
            alert("Vous n'avez pas assez d'étoiles.");
            return;
        }
        if (!confirm(`Confirmer l'échange de ${cost} étoiles contre ${cost} ${label} ?`)) return;
        auth.addPoints(-cost);
        alert(`Vous avez reçu ${cost} ${label} !`);
    }
    document.getElementById('vbuck-btn').addEventListener('click', () => spend(1000, 'Vbucks'));
    document.getElementById('robux-btn').addEventListener('click', () => spend(800, 'Robux'));
});
