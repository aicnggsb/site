(function(){
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShLmm_C8UBhFxu8Q1ovfbYUMX54J3C3QacQIdLNycggMi12JnnM393VtN0yH898uk9HpPQD6eY7zJy/pub?output=csv';
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
            const btn = document.getElementById('login-btn');
            if(btn) btn.style.display = 'none';
            return true;
        }
        return false;
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
            div.textContent = user.pseudo + ' - ' + user.score;
        }else{
            div.textContent = '';
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

    document.addEventListener('DOMContentLoaded', () => {
        updateUserInfo();
        const btn = document.getElementById('login-btn');
        if(btn){
            if(getUser()) btn.style.display='none';
            btn.addEventListener('click', promptLogin);
        }
    });

    window.auth = {login, promptLogin, updateUserInfo, getUser};
})();
