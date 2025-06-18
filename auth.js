(function(){
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCSH8hh-ykxl1L9joc4opVRARLGfcqi6uTW1bRXyyzsu99zo1OXuOYFwCBzxISzEjt2q3Abd9yU-NJ/pub?gid=1003065620&single=true&output=csv';
    const SCORE_HISTORY_URL = 'https://script.google.com/macros/s/AKfycbzHfWfQzgWHNx7iE2aeCcgC27Y-1lvr2SVnZQDoNOeLwgsebjQyGw8zWTavJ175GSmg/exec';
    let users = null;

    async function loadUsers(){
        const res = await fetch(SHEET_URL + '&t=' + Date.now());
        const text = await res.text();
        const lines = text.trim().split(/\n+/).slice(1);
        users = lines.map(l => {
            const [pseudo, pass, score] = l.split(',');
            return {pseudo: pseudo.trim(), pass: (pass||'').trim(), score: parseInt(score,10)||0};
        });
    }

    async function login(pseudo, pass){
        if(!users) await loadUsers();
        const user = users.find(u => u.pseudo===pseudo && u.pass===pass);
        if(user){
            localStorage.setItem('pseudo', user.pseudo);
            localStorage.setItem('userScore', user.score);
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
        return {pseudo, score};
    }

    function updateUserInfo(){
        const header = document.querySelector('header');
        if(!header) return;
        let div = document.getElementById('user-info');
        if(!div){
            div = document.createElement('div');
            div.id = 'user-info';
            header.appendChild(div);
        }
        const user = getUser();
        if(user){
            div.innerHTML =
                '<div class="user-box">' + user.pseudo + '</div>' +
                '<div class="user-box">Score: ' + user.score + '</div>';
        }else{
            div.innerHTML = '';
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
            if(up) localStorage.setItem('userScore', up.score);
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
        const btn = document.getElementById('login-btn');
        if(btn){
            if(getUser()) btn.style.display='none';
            btn.addEventListener('click', promptLogin);
        }
        let logoutBtn = document.getElementById('logout-btn');
        if(!logoutBtn){
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Se d\u00e9connecter';
            logoutBtn.style.display = 'none';
            logoutBtn.addEventListener('click', logout);
            const header = document.querySelector('header');
            if(header) header.appendChild(logoutBtn);
        }
        if(getUser()) {
            logoutBtn.style.display = '';
        }
    });

    window.auth = {login, logout, promptLogin, updateUserInfo, getUser, addPoints};
})();
