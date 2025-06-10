# ICN_GGSB
Site pour l'ICN

## Google Sheets

Certaines pages affichent des données issues d'une feuille Google Sheets
publique. Depuis `classroom-screen.html`, les tâches sont récupérées via l'URL
publiée de la feuille sans utiliser de clé API. L'URL inclut `tqx=out:json` pour
obtenir les données au format JSON.

La page `suivi_projet.html` n'extrait plus les valeurs de la feuille mais
l'intègre directement via un `iframe`. Les modifications dans le document sont
donc visibles instantanément sans script côté client.
