(function(){
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCSH8hh-ykxl1L9joc4opVRARLGfcqi6uTW1bRXyyzsu99zo1OXuOYFwCBzxISzEjt2q3Abd9yU-NJ/pub?gid=1003065620&single=true&output=csv';
    const SCORE_HISTORY_URL = 'https://script.google.com/macros/s/AKfycbzHfWfQzgWHNx7iE2aeCcgC27Y-1lvr2SVnZQDoNOeLwgsebjQyGw8zWTavJ175GSmg/exec';
    let users = null;

    async function loadUsers(){
        const res = await fetch(`${SHEET_URL}&t=${Date.now()}`);
        const text = await res.text();
        users = text.trim().split(/\n+/).slice(1).map(line => {
            const [classe, pseudo, pass, score, badges] = line.split(',');
            return {
                classe: (classe || '').trim(),
                pseudo: pseudo.trim(),
                pass: (pass || '').trim(),
                score: parseInt(score, 10) || 0,
                badges: (badges || '').trim()
            };
        });
    }

    async function login(pseudo, pass){
        if(!users) {
            await loadUsers();
        }
        const user = users.find(u => u.pseudo === pseudo && u.pass === pass);
        if(!user) return false;

        localStorage.setItem('pseudo', user.pseudo);
        localStorage.setItem('userScore', user.score);
        localStorage.setItem('userBadges', user.badges);
        localStorage.setItem('userClasse', user.classe);
        updateUserInfo();
        const loginBtn = document.getElementById('login-btn');
        if(loginBtn) loginBtn.style.display = 'none';
        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) logoutBtn.style.display = '';
        return true;
    }

    function logout(){
        localStorage.removeItem('pseudo');
        localStorage.removeItem('userScore');
        localStorage.removeItem('userBadges');
        localStorage.removeItem('userClasse');
        updateUserInfo();
        const loginBtn = document.getElementById('login-btn');
        if(loginBtn) loginBtn.style.display = '';
        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) logoutBtn.style.display = 'none';
    }

    function getUser(){
        const pseudo = localStorage.getItem('pseudo');
        if(!pseudo) return null;
        const score = parseInt(localStorage.getItem('userScore')||'0',10);
        const badges = (localStorage.getItem('userBadges')||'');
        const classe = (localStorage.getItem('userClasse')||'');
        return {pseudo, score, badges, classe};
    }

    function getOrCreate(parent, id){
        let el = document.getElementById(id);
        if(!el){
            el = document.createElement('div');
            el.id = id;
            el.className = 'user-cell';
            parent.appendChild(el);
        }
        return el;
    }

    function updateUserInfo(){
        const header = document.querySelector('header');
        if(!header) return;

        let container = document.getElementById('user-info');
        if(!container){
            container = document.createElement('div');
            container.id = 'user-info';
            header.appendChild(container);
        }

        const pseudoCell = getOrCreate(container, 'pseudo-cell');
        const scoreCell = getOrCreate(container, 'score-cell');
        const loginCell = getOrCreate(container, 'login-cell');
        const badgesCell = getOrCreate(container, 'badges-cell');

        const user = getUser();
        if(user){
            pseudoCell.style.display = '';
            scoreCell.style.display = '';
            badgesCell.style.display = '';
            pseudoCell.textContent = user.pseudo;
            scoreCell.innerHTML = `${user.score} <span class="score-star">⭐</span>`;
        } else {
            pseudoCell.style.display = 'none';
            scoreCell.style.display = 'none';
            badgesCell.style.display = 'none';
            pseudoCell.textContent = '';
            scoreCell.innerHTML = '';
        }
    }

    function promptLogin(){
        const pseudo = prompt('Pseudo:');
        if(!pseudo) return;
        const pass = prompt('Mot de passe:');
        if(!pass) return;
        login(pseudo.trim(), pass.trim()).then(ok => {
            if(!ok) alert('Identifiants incorrects');
        });
    }

    async function refreshUserScore(pseudo){
        try {
            await loadUsers();
            const up = users.find(u => u.pseudo === pseudo);
            if(up){
                localStorage.setItem('userScore', up.score);
                localStorage.setItem('userBadges', up.badges);
                localStorage.setItem('userClasse', up.classe);
            }
        } catch(e) {}
    }

    async function addPoints(points){
        const user = getUser();
        if(!user) return;
        const newScore = user.score + points;
        localStorage.setItem('userScore', newScore);
        // Mise à jour immédiate de l'affichage du score
        updateUserInfo();
        try {
            await fetch(SCORE_HISTORY_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pseudo: user.pseudo, score: points })
            });
        } catch(e) {}
        await refreshUserScore(user.pseudo);
        updateUserInfo();
    }

    document.addEventListener('DOMContentLoaded', async () => {
        let currentUser = getUser();
        if(currentUser) {
            await refreshUserScore(currentUser.pseudo);
        }
        updateUserInfo();
        const loginCell = document.getElementById('login-cell');
        const badgeCell = document.getElementById('badges-cell');

        let btn = document.getElementById('login-btn');
        if(!btn){
            btn = document.createElement('button');
            btn.id = 'login-btn';
            btn.textContent = 'Se connecter';
        } else if(btn.parentNode !== loginCell){
            btn.parentNode.removeChild(btn);
        }
        btn.addEventListener('click', promptLogin);
        loginCell.appendChild(btn);
        currentUser = getUser();
        btn.style.display = currentUser ? 'none' : '';

        let logoutBtn = document.getElementById('logout-btn');
        if(!logoutBtn){
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Se d\u00e9connecter';
            logoutBtn.style.display = 'none';
            logoutBtn.addEventListener('click', logout);
        } else if(logoutBtn.parentNode !== loginCell){
            logoutBtn.parentNode.removeChild(logoutBtn);
        }
        loginCell.appendChild(logoutBtn);
        currentUser = getUser();
        logoutBtn.style.display = currentUser ? '' : 'none';

        let badgeBtn = document.getElementById('badges-btn');
        if(!badgeBtn){
            badgeBtn = document.createElement('button');
            badgeBtn.id = 'badges-btn';
            badgeBtn.textContent = 'Mes badges';
            badgeBtn.style.display = 'none';
            badgeBtn.addEventListener('click', () => {
                window.location.href = 'badges.html';
            });
        } else if(badgeBtn.parentNode !== badgeCell){
            badgeBtn.parentNode.removeChild(badgeBtn);
        }
        badgeCell.appendChild(badgeBtn);
        currentUser = getUser();
        badgeBtn.style.display = currentUser ? '' : 'none';
    });

    window.auth = {login, logout, promptLogin, updateUserInfo, getUser, addPoints};
})();
