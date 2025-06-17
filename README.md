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
