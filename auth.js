(function(){
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCSH8hh-ykxl1L9joc4opVRARLGfcqi6uTW1bRXyyzsu99zo1OXuOYFwCBzxISzEjt2q3Abd9yU-NJ/pub?gid=1003065620&single=true&output=csv';
    const SCORE_HISTORY_URL = 'https://script.google.com/macros/s/AKfycbzHfWfQzgWHNx7iE2aeCcgC27Y-1lvr2SVnZQDoNOeLwgsebjQyGw8zWTavJ175GSmg/exec';
    let users = null;
    let originalNav = null;

    function pageForClass(classe){
        const c = (classe || '').toUpperCase();
        if(c === '6E') return 'revision6E.html';
        if(c === 'ICN') return 'index.html';
        if(c === 'SNT') return 'SNT.html';
        if(/^3E/.test(c) || /^4E/.test(c) || /^5E/.test(c)) return 'techno.html';
        return null;
    }

    function redirectToClassPage(user){
        if(!user) return;
        const target = pageForClass(user.classe);
        if(!target) return;
        const current = location.pathname.split('/').pop();
        if(current !== target){
            location.href = target;
        }
    }
    async function loadUsers(){
        try {
            const res = await fetch(SHEET_URL + '&t=' + Date.now());
            const text = await res.text();
            const lines = text.trim().split(/\n+/).slice(1);
            users = lines.map(l => {
                const [classe, pseudo, pass, score, badges] = l.split(',');
                return {
                    classe: (classe||'').trim(),
                    pseudo: pseudo.trim(),
                    pass: (pass||'').trim(),
                    score: parseInt(score,10)||0,
                    badges: (badges||'').trim()
                };
            });
        } catch(e) {
            console.error('Failed to load users', e);
            throw e;
        }
    }

    async function login(pseudo, pass){
        if(!users){
            try {
                await loadUsers();
            } catch(e) {
                alert('Impossible de v\u00e9rifier vos identifiants. Veuillez v\u00e9rifier votre connexion internet.');
                return false;
            }
        }
        const user = users.find(u => u.pseudo===pseudo && u.pass===pass);
        if(user){
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
        return false;
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
        location.href = 'index.html';
    }

    function getUser(){
        const pseudo = localStorage.getItem('pseudo');
        if(!pseudo) return null;
        const score = parseInt(localStorage.getItem('userScore')||'0',10);
        const badges = (localStorage.getItem('userBadges')||'');
        const classe = (localStorage.getItem('userClasse')||'');
        return {pseudo, score, badges, classe};
    }

    function updateNavForClass(user){
        const nav = document.querySelector('header nav ul');
        if(!nav) return;
        if(originalNav === null) originalNav = nav.innerHTML;
        if(user){
            const c = (user.classe || '').toUpperCase();
            if(c === '6E'){
                nav.innerHTML =
                    '<li><a href="revision6E.html">Gagner des étoiles</a></li>' +
                    '<li><a href="depenser.html">Dépenser ses étoiles</a></li>';
                return;
            }
            const page = pageForClass(user.classe);
            if(page){
                let label = '';
                switch(page){
                    case 'techno.html': label = 'Technologie'; break;
                    case 'SNT.html': label = 'SNT'; break;
                    default: label = 'ICN';
                }
                nav.innerHTML = `<li><a href="${page}">${label}</a></li>`;
                return;
            }
        }
        if(originalNav !== null) nav.innerHTML = originalNav;
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
        let pseudoCell = document.getElementById('pseudo-cell');
        if(!pseudoCell){
            pseudoCell = document.createElement('div');
            pseudoCell.id = 'pseudo-cell';
            pseudoCell.className = 'user-cell';
            container.appendChild(pseudoCell);
        }

        let scoreCell = document.getElementById('score-cell');
        if(!scoreCell){
            scoreCell = document.createElement('div');
            scoreCell.id = 'score-cell';
            scoreCell.className = 'user-cell';
            container.appendChild(scoreCell);
        }

        let loginCell = document.getElementById('login-cell');
        if(!loginCell){
            loginCell = document.createElement('div');
            loginCell.id = 'login-cell';
            loginCell.className = 'user-cell';
            container.appendChild(loginCell);
        }

        let badgesCell = document.getElementById('badges-cell');
        if(!badgesCell){
            badgesCell = document.createElement('div');
            badgesCell.id = 'badges-cell';
            badgesCell.className = 'user-cell';
            container.appendChild(badgesCell);
        }

        const user = getUser();
        if(user){
            pseudoCell.style.display = '';
            scoreCell.style.display = '';
            badgesCell.style.display = '';
            pseudoCell.textContent = user.pseudo;
            scoreCell.innerHTML = user.score + ' <span class="score-star">⭐</span>';
        }else{
            pseudoCell.style.display = 'none';
            scoreCell.style.display = 'none';
            badgesCell.style.display = 'none';
            pseudoCell.textContent = '';
            scoreCell.innerHTML = '';
        }
        updateNavForClass(user);
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
        const user = getUser();
        if(user) {
            await refreshUserScore(user.pseudo);
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
        if(getUser()) btn.style.display = 'none'; else btn.style.display = '';

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
        if(getUser()) logoutBtn.style.display = '';
        else logoutBtn.style.display = 'none';

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
        if(getUser()) badgeBtn.style.display = '';
        else badgeBtn.style.display = 'none';
        const currentUser = getUser();
        updateNavForClass(currentUser);
    });

    window.auth = {login, logout, promptLogin, updateUserInfo, getUser, addPoints};
})();
