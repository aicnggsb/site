# ICN_GGSB
Site pour l'ICN

Lorsqu'un utilisateur se connecte, le script redirige vers la page
correspondant à sa classe. Les codes de classe peuvent inclure un numéro
(par exemple `3e1`, `4e2` ou `5e3`) et sont tous regroupés sur
`techno.html` pour les niveaux 3e, 4e et 5e.

## Google Sheets

Certaines pages affichent des données issues d'une feuille Google Sheets
publique. Depuis `classroom-screen.html`, les tâches sont récupérées via l'URL
publiée de la feuille sans utiliser de clé API. L'URL inclut `tqx=out:json` pour
obtenir les données au format JSON.

La page `suivi_projet.html` charge elle aussi les données de cette feuille.
Comme le partage se fait au format CSV, `suivi_projet.js` télécharge ce
fichier, reconstruit le tableau et applique un filtrage par classe et par rôle.
Si le téléchargement échoue ou renvoie un contenu inattendu (par exemple si la
feuille n'est plus publique), le script utilise automatiquement le fichier local
`suivi_projet_data.json` comme secours. Les données sont chargées au
démarrage de la page uniquement. Le tableau comporte désormais une colonne
supplémentaire intitulée **Statut** qui indique pour chaque tâche si elle est
"Terminée", "En cours" ou "A venir". Les filtres par classe et par rôle sont
désormais présentés sous forme de cases à cocher, comme celui du statut.

La page `sentrainer.html` permet de lancer des QCM issus d'une feuille Google Sheets. Si la récupération échoue, le script se rabat sur `sentrainer_data.json`. Avant de démarrer, les thèmes et les niveaux sont présentés dans deux boîtes distinctes munies d'un onglet "Thème" ou "Niveau", chacune contenant des cases à cocher pour filtrer le quiz. Un curseur permet en outre de choisir le nombre de questions (de 5 à 20) avant de commencer.
Les questions peuvent désormais comporter une colonne **Image** indiquant le nom d'un fichier PNG à afficher entre l'énoncé et les propositions.
Le fichier CSV utilisé pour le QCM suit l'ordre suivant : **Thème**, **Niveau**, **Question**, **Image**, **Réponse correcte**, **Réponse fausse A**, **Réponse fausse B**, **Correction**.
Si la colonne **Réponse fausse B** est vide pour une question, seuls deux boutons de réponse seront affichés lors du quiz.
Une fois le test terminé, un bilan par thème affiche des barres de progression colorées :
plus le pourcentage de bonnes réponses est élevé, plus la barre tend vers le vert, alors qu'elle reste rouge si le score est faible.

`sentrainer.html` demande désormais un pseudo lors du lancement. Ce pseudo est
mémorisé dans le navigateur puis envoyé à un script Google Apps avec le score
final pour être enregistré dans une feuille Sheets. Le script attendu côté
Google est :

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), data.pseudo, data.score]);
  return ContentService.createTextOutput("OK");
}
```

L'envoi se fait en mode `no-cors` pour éviter les blocages liés aux politiques
de sécurité du navigateur.

Lorsqu'un utilisateur est connecté, chaque bonne réponse lui rapporte
**1 point** ajouté immédiatement à son score. Une ligne est aussi envoyée vers
la feuille Google Sheets d'historique afin de tracer l'évolution des scores.

Une courte animation fait désormais voler une étoile depuis la réponse
sélectionnée jusqu'à l'icône de score pour symboliser les points gagnés.
Si toutes les réponses sont correctes, les points remportés sont doublés et
l'animation affiche des étoiles brillantes en plus grand nombre. Les étoiles
qui tombent rebondissent également entre elles pour un rendu plus vivant.

## Dépenser ses étoiles

Les élèves de 6E disposent d'une page spéciale `depenser.html` pour convertir leurs étoiles en récompenses virtuelles. La liste des récompenses est désormais chargée automatiquement depuis une feuille Google Sheets publiée au format CSV afin de pouvoir être mise à jour facilement. Si le téléchargement échoue, les données locales du fichier `depenser_data.json` sont utilisées. Lors de la conversion, un montant négatif est envoyé dans la feuille d'historique afin de tracer les dépenses.
