# ICN_GGSB
Site pour l'ICN

## Google Sheets

Certaines pages affichent des données issues d'une feuille Google Sheets
publique. Depuis `classroom-screen.html`, les tâches sont récupérées via l'URL
publiée de la feuille sans utiliser de clé API. L'URL inclut `tqx=out:json` pour
obtenir les données au format JSON.

La page `suivi_projet.html` charge elle aussi les données de cette feuille.
Comme le partage se fait au format CSV, `suivi_projet.js` télécharge ce
fichier, reconstruit le tableau et applique un filtrage par classe. Les données
se rafraîchissent automatiquement toutes les minutes.
