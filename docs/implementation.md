# Notes d’implémentation

## Choix techniques

- Application statique (HTML / CSS / JS)
- Pas de framework
- Déploiement simple sur GitHub Pages
- Affichage cartographique via ArcGIS Maps SDK for JavaScript

## Gestion du survol

La popup s’ouvre au passage de la souris grâce à :

- `view.on("pointer-move")`
- `view.hitTest(event)`

Cela permet de détecter si le pointeur est sur un point.

## Données

Les coordonnées sont stockées au format DMS dans `data/sites.js`
puis transformées en décimal dans `assets/app.js`.

## Évolutions possibles

- coloration selon l’état global
- clustering des points
- filtres par date
- ajout d’images dans les popups
- export GeoJSON