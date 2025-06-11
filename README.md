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
