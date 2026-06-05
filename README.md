# 🗺️ Carte Interactive des Sites

Application web interactive pour visualiser et explorer les sites de prélèvements à Mayotte. Utilise l'API ArcGIS Maps for JavaScript avec une interface de recherche et de filtrage intuitive.

## ✨ Fonctionnalités

- 🗺️ **Carte interactive** avec fond satellite (ArcGIS Hybrid)
- 📍 **Marqueurs colorés** basés sur l'état global du site
- 🔍 **Recherche en temps réel** par ID, localisation ou état chimique
- 💬 **Popups détaillées** avec informations complètes du site
- 📱 **Responsive design** (mobile, tablette, desktop)
- 🎨 **Légende dynamique** pour comprendre les codes couleurs
- 🖱️ **Navigation au survol** pour un accès rapide aux informations

## 🎨 Codes Couleurs

| Couleur | État | Signification |
|---------|------|---------------|
| 🟢 Vert soutenu | Score 8-10 | Très bon / bon état |
| 🟢 Vert clair | Score 6-7 | Bon à moyen |
| 🟠 Orange | Score 4-5 | Impacté / moyen |
| 🔴 Rouge | Score 0-3 | Dégradé |
| 🟤 Bordeaux | Très dégradé | Dégradation sévère |
| ⚫ Gris | X/10 | Non renseigné |

## 📂 Structure du Projet

```
Carte_interactive/
├── index.html              # Page principale
├── assets/
│   ├── app.js             # Logique de l'application (ArcGIS SDK)
│   └── style.css          # Feuille de styles
├── data/
│   └── sites.json         # Données des sites (17 sites)
└── docs/
    └── implementation.md   # Documentation technique
```

## 🚀 Mise en Route Rapide

### Option 1: Serveur Local (Python)
```bash
# Python 3.x
python -m http.server 8000
# Accéder à: http://localhost:8000
```

### Option 2: Serveur Node.js
```bash
# Via http-server
npx http-server -p 8000
```

### Option 3: VS Code Live Server
- Installez l'extension "Live Server"
- Clic droit sur `index.html` → "Open with Live Server"

## 📊 Données

### Format JSON

Chaque site contient:
- **Identifiant**: site_id (001-017)
- **Localisation**: nom du site
- **Coordonnées**: latitude/longitude en DMS (convertis automatiquement)
- **État**: notation globale, chimique, du récif
- **Contexte**: densité de population, fréquentation, activités touristiques
- **Biodiversité**: algues identifiées, patrimoine naturel
- **Observations**: turbidité, température

Le fichier [data/sites.json](data/sites.json) contient 17 sites de prélèvements répartis sur l'île de Mayotte.

## 🔧 Technologies

- **ArcGIS Maps SDK for JavaScript** (v4.31) - Cartographie
- **Vanilla JavaScript** (ES6+) - Logique applicative
- **HTML5** - Structure
- **CSS3** - Mise en forme responsive

## 🌐 Déploiement GitHub Pages

1. **Activez GitHub Pages** dans les paramètres du repository
2. **Sélectionnez** la branche `main` et le dossier `/root`
3. **Accédez** à: `https://USERNAME.github.io/MAYOTTES_Inter`

> **Note**: Assurez-vous que tous les fichiers utilisent des chemins relatifs (`./`) pour la compatibilité avec les sous-dossiers.

## 🐛 Troubleshooting

### La carte n'affiche pas les marqueurs
- Vérifiez que le fichier `data/sites.json` existe
- Vérifiez la console pour les erreurs (F12 → Console)
- Assurez-vous que le serveur est bien en cours d'exécution

### Les coordonnées sont incorrectes
- Validez le format DMS: `12°46'8.00"S`
- Vérifiez que les hémisphères (S, E, N, W) sont corrects

### Les styles ne s'affichent pas
- Vérifiez que `assets/style.css` existe
- Actualisez le cache navigateur (Ctrl+Maj+R)

## 📝 Licence

Utilisable à titre personnel et professionnel.

## 👤 Auteur

Carte interactive développée pour visualiser les données de prélèvements à Mayotte.

---

**Dernière mise à jour**: Juin 2026  
**Version**: 1.0  
**Status**: ✅ Fonctionnel
