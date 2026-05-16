const MAX_ASSAULT_HISTORY = 20;
const STORAGE_KEYS = {
    bestiary: 'lnlg_bestiary_v1',
    history: 'lnlg_combat_history_v1',
    lastFight: 'lnlg_last_fight_v1'
};

const CAPABILITY_TYPES = [
    'text_note', 'enemy_damage_modifier', 'hero_damage_modifier', 'enemy_regeneration', 'hero_regeneration',
    'metamorphosis_change', 'luck_change', 'skill_change', 'conditional_immunity',
    'start_of_combat_effect', 'end_of_combat_effect'
];
const CAPABILITY_TRIGGERS = ['start_combat', 'before_assault', 'hero_hits', 'enemy_hits', 'after_assault', 'end_combat'];

let bestiary = [];
let combatHistory = [];
let singleEnemyCombat = null;
let editingCapabilities = [];

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

function loadState() {
    bestiary = JSON.parse(localStorage.getItem(STORAGE_KEYS.bestiary) || '[]');
    combatHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
}

function persistState() {
    localStorage.setItem(STORAGE_KEYS.bestiary, JSON.stringify(bestiary));
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(combatHistory.slice(-200)));
}

function saveLastFight(payload) {
    localStorage.setItem(STORAGE_KEYS.lastFight, JSON.stringify(payload));
}

function getLastFight() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.lastFight) || 'null');
}

function roll2d6() { return (1 + Math.floor(Math.random() * 6)) + (1 + Math.floor(Math.random() * 6)); }

function renderStatus() {
    const el = document.getElementById('combatStatus');
    if (!singleEnemyCombat) { el.innerHTML = '<p>Combat inactif.</p>'; return; }
    el.innerHTML = `
        <p>Héros END: <strong>${singleEnemyCombat.heroEndurance}</strong></p>
        <p>Ennemi END: <strong>${singleEnemyCombat.enemyEndurance}</strong></p>
        <p>FA héros: <strong>${singleEnemyCombat.heroAttackStrength ?? '-'}</strong></p>
        <p>FA ennemi: <strong>${singleEnemyCombat.enemyAttackStrength ?? '-'}</strong></p>
        <p>Statut: <strong>${singleEnemyCombat.lastResult || 'Aucun'}</strong></p>`;
}

function renderHistory() {
    const historyEl = document.getElementById('assaultHistory');
    historyEl.innerHTML = (singleEnemyCombat?.history || []).map((entry) => `<li>${entry}</li>`).join('');
}

function applyCapabilities(trigger) {
    if (!singleEnemyCombat) return;
    const caps = singleEnemyCombat.capacites.filter((c) => c.trigger === trigger);
    caps.forEach((cap) => {
        if (!cap.automatic) {
            singleEnemyCombat.history.push(`⚠ Rappel capacité manuelle: ${cap.description || cap.type}`);
            return;
        }
        switch (cap.type) {
            case 'enemy_regeneration':
                singleEnemyCombat.enemyEndurance += Number(cap.value || 0);
                singleEnemyCombat.history.push(`→ Régénération ennemi: +${cap.value} END`);
                break;
            case 'hero_regeneration':
                singleEnemyCombat.heroEndurance += Number(cap.value || 0);
                singleEnemyCombat.history.push(`→ Régénération héros: +${cap.value} END`);
                break;
            case 'enemy_damage_modifier':
            case 'hero_damage_modifier':
            case 'skill_change':
            case 'luck_change':
            case 'metamorphosis_change':
            case 'conditional_immunity':
            case 'start_of_combat_effect':
            case 'end_of_combat_effect':
            case 'text_note':
            default:
                singleEnemyCombat.history.push(`ℹ ${cap.type}: ${cap.description || 'effet appliqué selon règle spéciale'}`);
        }
    });
}

function startSingleEnemyCombat(monsterOverride = null) {
    const enemyName = monsterOverride?.nom || document.getElementById('enemyName').value.trim() || 'Ennemi';
    const enemySkill = Number(monsterOverride?.habilete ?? document.getElementById('enemySkill').value);
    const enemyEndurance = Number(monsterOverride?.endurance ?? document.getElementById('enemyEndurance').value);
    const heroSkill = Number(document.getElementById('heroSkill').value);
    const heroEndurance = Number(document.getElementById('heroEndurance').value);

    if ([enemySkill, enemyEndurance, heroSkill, heroEndurance].some(Number.isNaN)) return;

    singleEnemyCombat = {
        monsterId: monsterOverride?.id || null,
        enemyName, heroSkill, heroEndurance, enemySkill, enemyEndurance,
        heroAttackStrength: null, enemyAttackStrength: null,
        lastResult: 'Combat démarré.', history: [], assaultCount: 0, inProgress: true,
        capacites: monsterOverride?.capacites || []
    };

    applyCapabilities('start_combat');
    renderStatus(); renderHistory();
}

function launchAssault() {
    if (!singleEnemyCombat?.inProgress) return;

    applyCapabilities('before_assault');
    const enemyRoll = roll2d6();
    const heroRoll = roll2d6();
    singleEnemyCombat.enemyAttackStrength = enemyRoll + singleEnemyCombat.enemySkill;
    singleEnemyCombat.heroAttackStrength = heroRoll + singleEnemyCombat.heroSkill;
    singleEnemyCombat.assaultCount += 1;

    let resultText = '';
    if (singleEnemyCombat.heroAttackStrength > singleEnemyCombat.enemyAttackStrength) {
        singleEnemyCombat.enemyEndurance -= 2;
        resultText = `${singleEnemyCombat.enemyName} blessé (-2 END)`;
        applyCapabilities('hero_hits');
    } else if (singleEnemyCombat.enemyAttackStrength > singleEnemyCombat.heroAttackStrength) {
        singleEnemyCombat.heroEndurance -= 2;
        resultText = 'Héros blessé (-2 END)';
        applyCapabilities('enemy_hits');
    } else {
        resultText = 'Égalité, aucun dégât';
    }

    applyCapabilities('after_assault');

    const line = `Assaut ${singleEnemyCombat.assaultCount} — Vous: ${singleEnemyCombat.heroAttackStrength}, ${singleEnemyCombat.enemyName}: ${singleEnemyCombat.enemyAttackStrength} → ${resultText}`;
    singleEnemyCombat.history.push(line);
    singleEnemyCombat.history = singleEnemyCombat.history.slice(-MAX_ASSAULT_HISTORY);

    if (singleEnemyCombat.enemyEndurance <= 0) {
        singleEnemyCombat.inProgress = false;
        singleEnemyCombat.lastResult = 'Ennemi vaincu';
        applyCapabilities('end_combat');
        trackResult(true);
    } else if (singleEnemyCombat.heroEndurance <= 0) {
        singleEnemyCombat.inProgress = false;
        singleEnemyCombat.lastResult = 'Votre personnage est mort';
        applyCapabilities('end_combat');
        trackResult(false);
    } else {
        singleEnemyCombat.lastResult = resultText;
    }

    renderStatus(); renderHistory();
}

function trackResult(victory) {
    if (!singleEnemyCombat?.monsterId) return;
    const m = bestiary.find((x) => x.id === singleEnemyCombat.monsterId);
    if (!m) return;
    m.stats = m.stats || { wins: 0, losses: 0 };
    if (victory) m.stats.wins += 1; else m.stats.losses += 1;
    m.updatedAt = nowIso();
    combatHistory.push({ at: nowIso(), monsterId: m.id, victory });
    persistState();
}

function endSingleEnemyCombat() { singleEnemyCombat = null; renderStatus(); renderHistory(); }

function monsterTemplate() {
    return { id: uid(), nom: '', habilete: 8, endurance: 8, description: '', notes: '', tags: [], image: '', createdAt: nowIso(), updatedAt: nowIso(), favorite: false, capacites: [], stats: { wins: 0, losses: 0 } };
}

function openMonsterDialog(monster = null) {
    const m = monster ? structuredClone(monster) : monsterTemplate();
    document.getElementById('dialogTitle').textContent = monster ? 'Modifier un monstre' : 'Ajouter un monstre';
    document.getElementById('monsterId').value = m.id;
    document.getElementById('monsterNom').value = m.nom;
    document.getElementById('monsterHabilete').value = m.habilete;
    document.getElementById('monsterEndurance').value = m.endurance;
    document.getElementById('monsterDescription').value = m.description;
    document.getElementById('monsterNotes').value = m.notes;
    document.getElementById('monsterTags').value = m.tags.join(', ');
    document.getElementById('monsterImage').value = m.image || '';
    editingCapabilities = m.capacites || [];
    renderCapabilityEditor();
    document.getElementById('monsterDialog').showModal();
}

function renderCapabilityEditor() {
    const root = document.getElementById('capabilitiesList');
    root.innerHTML = editingCapabilities.map((cap) => `
        <article class="cap-row">
            <select data-k="type" data-id="${cap.id}">${CAPABILITY_TYPES.map((t) => `<option value="${t}" ${t === cap.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
            <select data-k="trigger" data-id="${cap.id}">${CAPABILITY_TRIGGERS.map((t) => `<option value="${t}" ${t === cap.trigger ? 'selected' : ''}>${t}</option>`).join('')}</select>
            <input data-k="value" data-id="${cap.id}" type="number" value="${cap.value ?? 0}" placeholder="Valeur">
            <input data-k="description" data-id="${cap.id}" type="text" value="${cap.description || ''}" placeholder="Description">
            <label><input data-k="automatic" data-id="${cap.id}" type="checkbox" ${cap.automatic ? 'checked' : ''}> Auto</label>
            <button type="button" data-action="delete-cap" data-id="${cap.id}" class="danger">✕</button>
        </article>`).join('');
}

function addCapability() {
    editingCapabilities.push({ id: uid(), type: 'text_note', trigger: 'after_assault', value: 0, description: '', automatic: false });
    renderCapabilityEditor();
}

function saveMonster() {
    const id = document.getElementById('monsterId').value;
    const payload = {
        id,
        nom: document.getElementById('monsterNom').value.trim(),
        habilete: Number(document.getElementById('monsterHabilete').value),
        endurance: Number(document.getElementById('monsterEndurance').value),
        description: document.getElementById('monsterDescription').value.trim(),
        notes: document.getElementById('monsterNotes').value.trim(),
        tags: document.getElementById('monsterTags').value.split(',').map((x) => x.trim()).filter(Boolean),
        image: document.getElementById('monsterImage').value.trim(),
        createdAt: nowIso(), updatedAt: nowIso(), capacites: editingCapabilities,
        favorite: false, stats: { wins: 0, losses: 0 }
    };

    const index = bestiary.findIndex((m) => m.id === id);
    if (index >= 0) {
        payload.createdAt = bestiary[index].createdAt;
        payload.favorite = bestiary[index].favorite;
        payload.stats = bestiary[index].stats || payload.stats;
        bestiary[index] = payload;
    } else {
        bestiary.unshift(payload);
    }

    persistState();
    renderBestiary();
    document.getElementById('monsterDialog').close();
}

function renderBestiary() {
    const query = document.getElementById('searchMonsterInput').value.trim().toLowerCase();
    const tag = document.getElementById('tagFilterSelect').value;
    const sort = document.getElementById('sortSelect').value;

    const tags = [...new Set(bestiary.flatMap((m) => m.tags || []))].sort((a, b) => a.localeCompare(b, 'fr'));
    document.getElementById('tagFilterSelect').innerHTML = `<option value="">Tous les tags</option>${tags.map((t) => `<option value="${t}" ${t === tag ? 'selected' : ''}>${t}</option>`).join('')}`;

    let items = bestiary.filter((m) => (!query || `${m.nom} ${m.description} ${(m.tags || []).join(' ')}`.toLowerCase().includes(query)) && (!tag || (m.tags || []).includes(tag)));
    if (sort === 'alpha_asc') items.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    if (sort === 'alpha_desc') items.sort((a, b) => b.nom.localeCompare(a.nom, 'fr'));
    if (sort === 'recent') items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    document.getElementById('bestiaryList').innerHTML = items.map((m) => `
        <article class="monster-card ${m.favorite ? 'favorite' : ''}">
            <div>
                <h3>${m.nom}</h3>
                <p><strong>HAB:</strong> ${m.habilete} • <strong>END:</strong> ${m.endurance}</p>
                <p>${m.capacites?.length || 0} capacité(s) • V:${m.stats?.wins || 0} / D:${m.stats?.losses || 0}</p>
                <p class="tags">${(m.tags || []).map((t) => `#${t}`).join(' ')}</p>
            </div>
            <div class="card-actions">
                <button type="button" data-action="fight" data-id="${m.id}">Combattre</button>
                <button type="button" data-action="edit" data-id="${m.id}" class="secondary">Modifier</button>
                <button type="button" data-action="duplicate" data-id="${m.id}" class="secondary">Dupliquer</button>
                <button type="button" data-action="favorite" data-id="${m.id}" class="secondary">${m.favorite ? '★ Favori' : '☆ Favori'}</button>
                <button type="button" data-action="delete" data-id="${m.id}" class="danger">Supprimer</button>
            </div>
        </article>`).join('');
}

function handleBestiaryClick(event) {
    const btn = event.target.closest('button[data-action]'); if (!btn) return;
    const id = btn.dataset.id;
    const monster = bestiary.find((m) => m.id === id); if (!monster) return;

    if (btn.dataset.action === 'fight') {
        document.getElementById('enemyName').value = monster.nom;
        document.getElementById('enemySkill').value = monster.habilete;
        document.getElementById('enemyEndurance').value = monster.endurance;
        saveLastFight({ monsterId: monster.id });
        startSingleEnemyCombat(monster);
    }
    if (btn.dataset.action === 'edit') openMonsterDialog(monster);
    if (btn.dataset.action === 'duplicate') {
        const clone = structuredClone(monster); clone.id = uid(); clone.nom = `${monster.nom} (copie)`; clone.createdAt = nowIso(); clone.updatedAt = nowIso();
        bestiary.unshift(clone); persistState(); renderBestiary();
    }
    if (btn.dataset.action === 'favorite') { monster.favorite = !monster.favorite; monster.updatedAt = nowIso(); persistState(); renderBestiary(); }
    if (btn.dataset.action === 'delete' && confirm(`Supprimer ${monster.nom} ?`)) { bestiary = bestiary.filter((m) => m.id !== id); persistState(); renderBestiary(); }
}

function bootEvents() {
    document.getElementById('startCombatBtn').addEventListener('click', () => startSingleEnemyCombat());
    document.getElementById('assaultBtn').addEventListener('click', launchAssault);
    document.getElementById('endCombatBtn').addEventListener('click', endSingleEnemyCombat);
    document.getElementById('addBestiaryBtn').addEventListener('click', () => openMonsterDialog());
    document.getElementById('saveMonsterBtn').addEventListener('click', saveMonster);
    document.getElementById('cancelMonsterBtn').addEventListener('click', () => document.getElementById('monsterDialog').close());
    document.getElementById('addCapabilityBtn').addEventListener('click', addCapability);
    document.getElementById('bestiaryList').addEventListener('click', handleBestiaryClick);
    document.getElementById('searchMonsterInput').addEventListener('input', renderBestiary);
    document.getElementById('tagFilterSelect').addEventListener('change', renderBestiary);
    document.getElementById('sortSelect').addEventListener('change', renderBestiary);
    document.getElementById('restartLastFightBtn').addEventListener('click', () => {
        const last = getLastFight();
        if (!last?.monsterId) return;
        const monster = bestiary.find((m) => m.id === last.monsterId);
        if (monster) startSingleEnemyCombat(monster);
    });
    document.getElementById('exportBestiaryBtn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(bestiary, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bestiary.json'; a.click();
    });
    document.getElementById('importBestiaryInput').addEventListener('change', async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const parsed = JSON.parse(await file.text());
        if (Array.isArray(parsed)) { bestiary = parsed; persistState(); renderBestiary(); }
    });
    document.getElementById('capabilitiesList').addEventListener('input', (e) => {
        const t = e.target;
        const id = t.dataset.id; const key = t.dataset.k;
        const cap = editingCapabilities.find((c) => c.id === id); if (!cap) return;
        cap[key] = key === 'automatic' ? t.checked : (key === 'value' ? Number(t.value) : t.value);
    });
    document.getElementById('capabilitiesList').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="delete-cap"]'); if (!btn) return;
        editingCapabilities = editingCapabilities.filter((c) => c.id !== btn.dataset.id);
        renderCapabilityEditor();
    });
}

loadState();
bootEvents();
renderBestiary();
renderStatus();
renderHistory();
