let monsterCount = 1;

function addMonster() {
    monsterCount++;
    const monstersDiv = document.getElementById('monsters');
    const newMonster = document.createElement('fieldset');
    newMonster.className = 'monster';
    newMonster.innerHTML = `
        <legend>Monstre ${monsterCount}</legend>
        <label for="monsterAttack${monsterCount}">Attaque:</label>
        <input type="number" id="monsterAttack${monsterCount}" name="monsterAttack" value="12" required><br>
        <label for="monsterDefense${monsterCount}">Défense:</label>
        <input type="number" id="monsterDefense${monsterCount}" name="monsterDefense" value="8" required><br>
        <label for="monsterPR${monsterCount}">PR:</label>
        <input type="number" id="monsterPR${monsterCount}" name="monsterPR" value="5" required><br>
        <label for="monsterPV${monsterCount}">PV:</label>
        <input type="number" id="monsterPV${monsterCount}" name="monsterPV" value="20" required><br>
        <label for="monsterDamage${monsterCount}">Dégâts:</label>
        <input type="string" id="monsterDamage${monsterCount}" name="monsterDamage" value="1D+6" required><br>
        <label for="monsterCritDamage${monsterCount}">Si critique, dégâts:</label>
        <input type="string" id="monsterCritDamage${monsterCount}" name="monsterCritDamage" value="2D+6" required><br>
    `;
    monstersDiv.appendChild(newMonster);
}

// Fonction pour lancer un dé de 6
function rollDice(number) {
	let total = 0;
	for (let i = 0; i < number; i++) {
		total += Math.floor(Math.random() * 6) + 1;
	}
	return total;
}

// Fonction pour calculer les dégâts à partir de la formule xD + y
function calculateDamage(formula) {
	const match = formula.match(/(\d+)D\s*\+\s*(\d+)/);
	const numberOfDice = parseInt(match[1]);
	const additionalValue = parseInt(match[2]);
	return rollDice(numberOfDice) + additionalValue;
}
	
function simulateCombat() {


    // Récupérer les valeurs du formulaire
    const hero = {
        attack: parseInt(document.getElementById('heroAttack').value),
        defense: parseInt(document.getElementById('heroDefense').value),
        pr: parseInt(document.getElementById('heroPR').value),
        pv: parseInt(document.getElementById('heroPV').value),
        damageFormula: document.getElementById('heroDamage').value
    };

    let monsters = [];
    for (let i = 1; i <= monsterCount; i++) {
        monsters.push({
            attack: parseInt(document.getElementById(`monsterAttack${i}`).value),
            defense: parseInt(document.getElementById(`monsterDefense${i}`).value),
            pr: parseInt(document.getElementById(`monsterPR${i}`).value),
            pv: parseInt(document.getElementById(`monsterPV${i}`).value),
            damageFormula: document.getElementById(`monsterDamage${i}`).value,
			critDamageFormula: document.getElementById(`monsterCritDamage${i}`).value
        });
    }

    // Initialisation du journal de combat
    let combatLog = [];
    let logLimit = 200; // Limiter le journal à 100 entrées
	let unMonstreEncoreEnVie = true

    while (hero.pv > 0 && unMonstreEncoreEnVie) {
		
        // Tour du héros
		// --- choix d'un monstre à combattre: le premier encore en vie
		let iMonstre=0;
		for (let monster of monsters) {
            if (monster.pv <= 0) continue;
			iMonstre++;
			
			if (Math.random() * 20 <= hero.attack) {
				if (Math.random() * 20 > monster.defense) {
					const damageDealt = Math.max(calculateDamage(hero.damageFormula) - monster.pr, 0);
					monster.pv -= damageDealt;
					combatLog.push(`Le héros attaque et inflige ${damageDealt} dégâts. PV du monstre ${iMonstre}: ${monster.pv}`);
				} else {
					combatLog.push(`Le héros attaque mais le monstre ${iMonstre} se defend.`);
				}
			} else {
				combatLog.push(`Le héros attaque le monstre ${iMonstre} mais rate.`);
			}
			break;
		}

        // Tour des monstres
		unMonstreEncoreEnVie = false
		iMonstre=0;
		for (let monster of monsters) {
            if (monster.pv <= 0) continue;
			iMonstre++;
			unMonstreEncoreEnVie = true
			let jetAttaque = Math.random() * 20
			// coup critique
			if ( jetAttaque < 5) {
				if (Math.random() * 20 > hero.defense) {
					const damageDealt = Math.max(calculateDamage(monster.critDamageFormula) - hero.pr, 0);
					hero.pv -= damageDealt;
					combatLog.push(`Le monstre ${iMonstre} attaque (critique) et inflige ${damageDealt} dégâts. PV du héros: ${hero.pv}`);
				} else {
					combatLog.push(`Le monstre ${iMonstre} attaque (critique)  mais le héros se défend.`);
				}
			} else {
				// coup normal
				if ( jetAttaque <= monster.attack) {
					if (Math.random() * 20 > hero.defense) {
						const damageDealt = Math.max(calculateDamage(monster.damageFormula) - hero.pr, 0);
						hero.pv -= damageDealt;
						combatLog.push(`Le monstre ${iMonstre} attaque et inflige ${damageDealt} dégâts. PV du héros: ${hero.pv}`);
					} else {
						combatLog.push(`Le monstre ${iMonstre} attaque mais le héros se défend.`);
					}
				} else {
					combatLog.push(`Le monstre ${iMonstre} attaque mais rate.`);
				}
			}
			
			// Limiter la longueur du journal
			if (combatLog.length > logLimit) {
				combatLog = combatLog.slice(combatLog.length - logLimit);
			}
		}
    }

    // Affichage du résultat final
    if (hero.pv > 0) {
        combatLog.push(`<strong>Le héros a vaincu le monstre ! il lui reste ${hero.pv} PV....</strong>`);
    } else {
        combatLog.push(`<strong>Le monstre a vaincu le héros...</strong>`);
    }

    // Afficher le journal de combat
    document.getElementById('combatLog').innerHTML = combatLog.join('<br>');
}
