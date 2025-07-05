# ICN_GGSB
Site pour l'ICN

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

Lorsqu'un utilisateur est connecté et termine un QCM, il gagne
automatiquement **5 points**. Ces points sont ajoutés à son score stocké dans
le navigateur et une nouvelle ligne est envoyée vers la feuille Google Sheets
d'historique afin de tracer l'évolution des scores.

Une courte animation fait désormais apparaître des étoiles à la fin du quiz
pour symboliser les points gagnés.
