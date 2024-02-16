// -----------------------------------------------------------------------------
// Initialisation des variables 
// -----------------------------------------------------------------------------
// ID de la scène
let currentSceneId = "P";
// Score du joueur
let playerScore = 0;

// caracteristiques principales
let force=0
let chance=0
let dexterite=0
let intelligence=0
let charisme=0

// compétences
let electricite=0
let python=0
let pilotage=0
let inebranlable=0

// equipement
let cristal = 0


// -----------------------------------------------------------------------------
// Chargement d'une scène spécifique (la sceneId)
// -----------------------------------------------------------------------------
function loadSceneFromXML(xmlDoc, sceneId) {

	console.log("Version 2");
	//Trouve la scène correspondante dans le document XML.
    let scene = xmlDoc.querySelector(`scene[id="${sceneId}"]`);
	
	// Extrait le titre, l'image, et les options de choix de cette scène.
    let titre = scene.querySelector('titre').textContent;
    let image = scene.querySelector('image').textContent;
    let choix = Array.from(scene.querySelectorAll('option')).map(option => ({
		label: option.textContent,
		img: option.getAttribute('img'),
		nextScene: option.getAttribute('vers'),
		points: option.getAttribute('points'),
	    
		
		echecForce: parseInt(option.getAttribute('echecForce') || "0"),
		echecIntelligence: parseInt(option.getAttribute('echecIntelligence') || "0"),
	    	echecChance: parseInt(option.getAttribute('echecChance') || "0"),
	    	echecDexterite: parseInt(option.getAttribute('echecDexterite') || "0"),
	    
		force: parseInt(option.getAttribute('force') || "0"),
		chance: parseInt(option.getAttribute('chance') || "0"),
		dexterite: parseInt(option.getAttribute('dexterite') || "0"),
		intelligence: parseInt(option.getAttribute('intelligence') || "0"),	    
		charisme: parseInt(option.getAttribute('charisme') || "0"),
	    
		electricite: parseInt(option.getAttribute('electricite') || "0"),
		python: parseInt(option.getAttribute('python') || "0"),
		pilotage: parseInt(option.getAttribute('pilotage') || "0"),
		inebranlable: parseInt(option.getAttribute('inebranlable') || "0"),

	    
		cristal: parseInt(option.getAttribute('cristal') || "0")
	}));

    // Récupérer toutes les descriptions
    let descriptionsNodes = Array.from(scene.querySelectorAll('description'));
	// Pour chaque description dans la scène, récupère le texte et l'image associée.
    let descriptions = descriptionsNodes.map(desc => ({
        text: desc.textContent,
        img: desc.getAttribute('img'),
        isCode: desc.getAttribute('code') === 'true'
    }));


    // Met à jour le titre de la scène dans le contenu de la page
    document.querySelector('.scene-content h1').textContent = titre;
    
    // Met à jour l'image de la scène dans le contenu de la page
    document.querySelector('.scene-image img').src = image;
    
    // Affiche le numéro de la scène actuelle
    document.querySelector('.scene-number').textContent = "Scène " + sceneId;

    // Sélectionne le conteneur pour les descriptions et le vide
    let descriptionsContainer = document.querySelector('.descriptions');
    descriptionsContainer.innerHTML = '';

   // Pour chaque description trouvée dans la scène XML
    descriptions.forEach(descriptionData => {
	// --- Crée un nouvel élément paragraphe et y met le texte de la description
        if (descriptionData.isCode) {
		let p = document.createElement('pre');
		p.textContent = descriptionData.text;
		descriptionsContainer.appendChild(p);
	} else {
		let p = document.createElement('p');
		p.textContent = descriptionData.text;
		descriptionsContainer.appendChild(p);
	}
	 // --- Si une image est liée à la description, crée un élément image et le configure
        if (descriptionData.img) {
            let img = document.createElement('img');
            img.src = descriptionData.img;
            descriptionsContainer.appendChild(img);
        }
    });
	
	


	// Sélectionne le conteneur pour les boutons de choix et le vide
	let buttonContainer = document.querySelector('.player-choices');
	buttonContainer.innerHTML = '';
	
	// Pour chaque choix disponible dans la scène XML
	choix.forEach(choice => {
		// --- Crée un nouveau bouton pour le choix
		let button = document.createElement('button');
		button.textContent = choice.label;
		
		if (choice.img) {
			// Créer et configurer un élément <img>
			button = document.createElement('img');
			button.src = choice.img;
			button.alt = choice.label; // Ajouter un texte alternatif pour l'accessibilité
			button.classList.add('clickable-image'); // Ajouter une classe pour le style
		}
		
		// --- Définit la fonction à exécuter lorsque le bouton est cliqué
		button.onclick = () => {
			// Met à jour l'ID de la scène actuelle et charge la nouvelle scène
			currentSceneId = choice.nextScene;

			// change de scène si echec test caract
			if (choice.echecCharisme>0){
				if (getRandomInt(20)>charisme){
					currentSceneId=choice.echecCharisme.toString();
					choice.points="";
				}
			}
			if (choice.echecForce>0){
				if (getRandomInt(20)>force){
					currentSceneId=choice.echecForce.toString();
					choice.points="";
				}
			}
			if (choice.echecChance>0){
				if (getRandomInt(20)>chance){
					currentSceneId=choice.echecChance.toString();
					choice.points="";
				}
			}
			
			if (choice.echecIntelligence>0){
				if (getRandomInt(20)>intelligence){
					currentSceneId=choice.echecIntelligence.toString();
					choice.points="";
				}
			}
			if (choice.echecDexterite>0){
				if (getRandomInt(20)>dexterite){
					currentSceneId=choice.echecDexterite.toString();
					choice.points="";
				}
			}


			// change de scène si echec test compétences
			if (choice.echecElectricite>0){
				if (getRandomInt(20)>electricite){
					currentSceneId=choice.echecElectricite.toString();
					choice.points="";
				}
			}			
			if (choice.echecPython>0){
				if (getRandomInt(20)>python){
					currentSceneId=choice.echecPython.toString();
					choice.points="";
				}
			}
			if (choice.echecPilotage>0){
				if (getRandomInt(20)>pilotage){
					currentSceneId=choice.echecPilotage.toString();
					choice.points="";
				}
			}
			console.log("echecInebranlable ???");
			if (choice.echecInebranlable>0){
				alert("inebranlable !");

				if (getRandomInt(20)>inebranlable){
					
					alert("loupé !");
					currentSceneId=choice.echecInebranlable.toString();
					choice.points="";
				}
			}
			loadSceneFromXML(xmlDoc, currentSceneId);
						
			
			// Calcule les points obtenus pour le choix et met à jour le score du joueur
			let points = parseInt(choice.points || "0");
			playerScore += points;
			document.querySelector('.score-value').textContent = playerScore;

			// mise à jour des caractéristiques
			force += choice.force;
			chance += choice.chance;
			dexterite += choice.dexterite;
			intelligence += choice.intelligence;
			charisme += choice.charisme;
			
			
			// mise à jour des compétences
			electricite += choice.electricite;
			python += choice.python;
			pilotage += choice.pilotage;
			inebranlable += choice.inebranlable;

			// mise à jour de l'équipement
			cristal += choice.cristal;
			
			// mise à jour du bandeau du bas avec les icones
			let bandeau = document.querySelector('.player-stats'); 
			bandeau.innerHTML = ''; // Efface le contenu actuel du bandeau

			// les badges pour les caractérisitiques
			if (force > 9) {
				let imgForce = document.createElement('img');
				imgForce.src = 'image/force.png'; 
				bandeau.appendChild(imgForce);
			}
			if (chance > 9) {
				let imgChance = document.createElement('img');
				imgChance.src = 'image/chance.png'; 
				bandeau.appendChild(imgChance);
			}
			if (dexterite > 9) {
				let imgDex = document.createElement('img');
				imgDex.src = 'image/dex.png'; 
				bandeau.appendChild(imgDex);
			}
			
			if (intelligence > 9) {
				let imgDex = document.createElement('img');
				imgDex.src = 'image/intelligence.png'; 
				bandeau.appendChild(imgDex);
			}
			
			if (charisme > 9) {
				let imgDex = document.createElement('img');
				imgDex.src = 'image/charisme.png'; 
				bandeau.appendChild(imgDex);
			}
			
			// les badges pour les compétences		
			if (electricite > 9) {
				let imgDex = document.createElement('img');
				imgDex.src = 'image/electricite.png'; 
				bandeau.appendChild(imgDex);
			}		
			if (python > 9) {
				let imgDex = document.createElement('img');
				imgDex.src = 'image/python.png'; 
				bandeau.appendChild(imgDex);
			}		
			if (pilotage > 9) {
				let imgDex = document.createElement('img');
				imgDex.src = 'image/pilotage.png'; 
				bandeau.appendChild(imgDex);
			}	
			if (inebranlable > 9) {
				let imgDex = document.createElement('img');
				imgDex.src = 'image/inebranlable.png'; 
				bandeau.appendChild(imgDex);
			}
			
			// les badges pour l'équipement
			if (cristal > 0) {
				let imgDex = document.createElement('img');
				imgDex.src = 'image/cristal.png'; 
				bandeau.appendChild(imgDex);
			}		
		};
		
		// Ajoute le bouton au conteneur des choix
		buttonContainer.appendChild(button);
	});
	
	
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// -----------------------------------------------------------------------------
// Chargement initial de la scène :
// -----------------------------------------------------------------------------
// --- Obtient le contenu XML du document comme une chaîne de caractères.
let xmlString = document.querySelector('#histoireXML').textContent;
// --- Utilise DOMParser pour convertir cette chaîne en un document XML.
let parser = new DOMParser();
let xmlDoc = parser.parseFromString(xmlString, "application/xml");
// --- Appelle loadSceneFromXML avec le document XML et l'ID de la scène initiale pour charger la première scène.
loadSceneFromXML(xmlDoc, currentSceneId);
