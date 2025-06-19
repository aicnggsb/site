(function(){
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCSH8hh-ykxl1L9joc4opVRARLGfcqi6uTW1bRXyyzsu99zo1OXuOYFwCBzxISzEjt2q3Abd9yU-NJ/pub?gid=1003065620&single=true&output=csv';
    const SCORE_HISTORY_URL = 'https://script.google.com/macros/s/AKfycbzHfWfQzgWHNx7iE2aeCcgC27Y-1lvr2SVnZQDoNOeLwgsebjQyGw8zWTavJ175GSmg/exec';
    let users = null;

    async function loadUsers(){
        const res = await fetch(SHEET_URL + '&t=' + Date.now());
        const text = await res.text();
        const lines = text.trim().split(/\n+/).slice(1);
        users = lines.map(l => {
            const [pseudo, pass, score, badges] = l.split(',');
            return {
                pseudo: pseudo.trim(),
                pass: (pass||'').trim(),
                score: parseInt(score,10)||0,
                badges: (badges||'').trim()
            };
        });
    }

    async function login(pseudo, pass){
        if(!users) await loadUsers();
        const user = users.find(u => u.pseudo===pseudo && u.pass===pass);
        if(user){
            localStorage.setItem('pseudo', user.pseudo);
            localStorage.setItem('userScore', user.score);
            localStorage.setItem('userBadges', user.badges);
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
        return {pseudo, score, badges};
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
            scoreCell.textContent = 'Score: ' + user.score;
        }else{
            pseudoCell.style.display = 'none';
            scoreCell.style.display = 'none';
            badgesCell.style.display = 'none';
            pseudoCell.textContent = '';
            scoreCell.textContent = '';
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
            }
        } catch(e) {}
    }

    async function addPoints(points){
        const user = getUser();
        if(!user) return;
        const newScore = user.score + points;
        localStorage.setItem('userScore', newScore);
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
    });

    window.auth = {login, logout, promptLogin, updateUserInfo, getUser, addPoints};
})();
