// Page permettant de dépenser les étoiles gagnées

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

    const rewards = [
        { cost: 1000, label: 'Vbucks', image: 'vbucks.png' },
        { cost: 800, label: 'Robux', image: 'robux.png' }
    ];

    const section = document.getElementById('spend-section');

    const ce = (tag, cls, txt) => {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (txt) el.textContent = txt;
        return el;
    };

    function imgElem(src) {
        if (!src.includes('/')) src = 'photos/' + src;
        const img = ce('img', 'reward-image');
        img.src = src;
        img.alt = '';
        return img;
    }

    const boxes = [];

    function render() {
        section.querySelectorAll('.reward-box').forEach(b => b.remove());
        rewards.forEach(r => {
            const box = ce('div', 'filter-box reward-box');
            box.appendChild(ce('span', 'filter-tab', `${r.cost} ⭐ → ${r.cost} ${r.label}`));

            const imgBox = ce('div', 'image-box');
            imgBox.appendChild(imgElem(r.image));
            box.appendChild(imgBox);

            const details = ce('div', 'reward-details');

            const progC = ce('div', 'progress-container');
            const bar = ce('div', 'progress-bar');
            const inner = ce('div', 'progress-bar-inner');
            bar.appendChild(inner);
            const info = ce('p');
            progC.appendChild(bar);
            progC.appendChild(info);
            details.appendChild(progC);

            const btn = ce('button', 'quiz-btn', 'Acheter');
            btn.addEventListener('click', () => spend(r));
            details.appendChild(btn);

            box.appendChild(details);

            boxes.push({ reward: r, inner, btn, info });
            section.appendChild(box);
        });
        update();
    }

    function update() {
        const u = auth.getUser();
        boxes.forEach(b => {
            const pct = Math.min(100, Math.floor(u.score / b.reward.cost * 100));
            b.inner.style.width = pct + '%';

            const ratio = pct / 100;
            const r = Math.round(255 * (1 - ratio));
            const g = Math.round(255 * ratio);
            b.inner.style.backgroundColor = `rgb(${r}, ${g}, 0)`;

            b.info.textContent = `${Math.min(u.score, b.reward.cost)}/${b.reward.cost} ⭐`;

            if (u.score >= b.reward.cost) {
                b.btn.textContent = 'Acheter';
                b.btn.disabled = false;
                b.btn.classList.remove('unavailable');
            } else {
                b.btn.textContent = 'non disponible';
                b.btn.disabled = true;
                b.btn.classList.add('unavailable');
            }
        });
    }

    function spend(r) {
        const u = auth.getUser();
        if (!u || u.score < r.cost) {
            alert("Vous n'avez pas assez d'étoiles.");
            return;
        }
        if (!confirm(`Confirmer l'échange de ${r.cost} étoiles contre ${r.cost} ${r.label} ?`)) return;
        auth.addPoints(-r.cost);
        alert(`Vous avez reçu ${r.cost} ${r.label} !`);
        update();
    }

    render();
});
