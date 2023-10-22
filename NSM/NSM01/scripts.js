let currentSceneId = 8;
let playerScore = 0;

function loadSceneFromXML(xmlDoc, sceneId) {
	
    let scene = xmlDoc.querySelector(`scene[id="${sceneId}"]`);
    let titre = scene.querySelector('titre').textContent;
    let image = scene.querySelector('image').textContent;
    let choix = Array.from(scene.querySelectorAll('option')).map(option => ({
		label: option.textContent,
		nextScene: option.getAttribute('vers'),
    points: option.getAttribute('points')
	}));

    // Récupérer toutes les descriptions
    let descriptionsNodes = Array.from(scene.querySelectorAll('description'));
    let descriptions = descriptionsNodes.map(desc => ({
        text: desc.textContent,
        img: desc.getAttribute('img')
    }));

    // Mise à jour de la page
    document.querySelector('.scene-content h1').textContent = titre;
    document.querySelector('.scene-image img').src = image;
	document.querySelector('.scene-number').textContent = "Scène " + sceneId;

    // Nettoyer les descriptions précédentes
    let descriptionsContainer = document.querySelector('.descriptions');
    descriptionsContainer.innerHTML = '';

    // Ajouter chaque description comme un nouvel élément <p>
    descriptions.forEach(descriptionData => {
        let p = document.createElement('p');
        p.textContent = descriptionData.text;
        descriptionsContainer.appendChild(p);
        if (descriptionData.img) {
            let img = document.createElement('img');
            img.src = descriptionData.img;
            descriptionsContainer.appendChild(img);
        }
    });
	let buttonContainer = document.querySelector('.player-choices');
	buttonContainer.innerHTML = '';
	choix.forEach(choice => {
		let button = document.createElement('button');
		button.textContent = choice.label;
		button.onclick = () => {
			currentSceneId = choice.nextScene;
			loadSceneFromXML(xmlDoc, currentSceneId);
		};
		buttonContainer.appendChild(button);
	});
    let buttons = document.querySelectorAll('.player-choices button');
    buttons.forEach((button, index) => {
        button.textContent = choix[index].label;
        button.onclick = () => {
			let points = parseInt(choix[index].points || "0");
			playerScore += points;
			document.querySelector('.score-value').textContent = playerScore;
            currentSceneId = choix[index].nextScene;
            loadSceneFromXML(xmlDoc, currentSceneId);
        };
    });
}

// Au début
let xmlString = document.querySelector('#histoireXML').textContent;
let parser = new DOMParser();
let xmlDoc = parser.parseFromString(xmlString, "application/xml");
loadSceneFromXML(xmlDoc, currentSceneId);
