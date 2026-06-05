# 🚀 Guide de Déploiement GitHub Pages

## 📋 Prérequis

- [ ] Repository GitHub créé: `https://github.com/Ravomahandry/MAYOTTES_Inter`
- [ ] Git installé localement
- [ ] Tous les fichiers du projet dans le dossier `d:\VS Code\Carte_interactive`

## 🔧 Étape 1: Initialisation Git (si nécessaire)

```bash
cd "D:\VS Code\Carte_interactive"

# Si pas encore de repository local
git init
git add .
git commit -m "Initial commit: Carte interactive Mayotte"
git branch -M main
git remote add origin https://github.com/Ravomahandry/MAYOTTES_Inter.git
git push -u origin main
```

## 📤 Étape 2: Pousser vers GitHub

```bash
# Si le repository existe déjà
cd "D:\VS Code\Carte_interactive"
git add .
git commit -m "Fix: Correction des erreurs et ajout de documentation"
git push origin main
```

## 🌐 Étape 3: Activer GitHub Pages

1. Allez sur: `https://github.com/Ravomahandry/MAYOTTES_Inter`
2. Cliquez sur **Settings**
3. Naviguez vers **Pages** (menu gauche)
4. Sous **Source**:
   - Sélectionnez **Deploy from a branch**
   - Branche: `main`
   - Dossier: `/ (root)`
5. Cliquez **Save**

## ✅ Étape 4: Vérification

Après quelques minutes:

```
✅ Site live: https://Ravomahandry.github.io/MAYOTTES_Inter
```

**Note**: Remplacez `Ravomahandry` par votre vrai nom d'utilisateur GitHub

## 🧪 Test Local avant GitHub

Avant de pousser, testez localement:

```bash
cd "D:\VS Code\Carte_interactive"
python -m http.server 8000
# Accédez à: http://localhost:8000
```

Vérifiez:
- [ ] La carte affiche bien les marqueurs
- [ ] La recherche fonctionne
- [ ] Les popups s'ouvrent au survol
- [ ] Pas de messages d'erreur en F12 (Console)

## 📊 Fichiers Poussés

```
✅ .gitignore              - Fichiers à ignorer
✅ .github/                - (si applicable)
✅ README.md               - Documentation
✅ package.json            - Métadonnées
✅ index.html              - Page principale
✅ assets/app.js           - Application
✅ assets/style.css        - Styles
✅ data/sites.json         - Données
✅ docs/                   - Documentation technique
✅ validate.py             - Script de validation
```

## 🔍 Troubleshooting

### La page GitHub Pages ne se charge pas

- Attendez 5-10 minutes (premiers déploiements)
- Vérifiez dans Settings → Pages que le site est publié
- Videz le cache navigateur

### Les ressources ne se chargent pas (404)

- Vérifiez que tous les fichiers sont en minuscules
- Utilisez des chemins relatifs: `./assets/app.js`
- Pas de chemins absolus: `/assets/app.js`

### La carte n'affiche pas les marqueurs

- Vérifiez que `data/sites.json` est présent
- Ouvrez la console (F12) pour voir les erreurs
- Vérifiez que le fichier JSON est valide: `python validate.py`

## 📝 Mise à Jour Future

Pour mettre à jour le site:

```bash
# 1. Modifiez vos fichiers
# 2. Testez localement
# 3. Commitez et poussez

cd "D:\VS Code\Carte_interactive"
git add .
git commit -m "Description de vos changements"
git push origin main

# GitHub Pages se met à jour automatiquement (2-5 min)
```

## 🎯 État Actuel

✅ **Tous les fichiers sont prêts**

| Composant | Status | Fichier |
|-----------|--------|---------|
| Frontend | ✅ OK | `index.html` |
| JavaScript | ✅ OK | `assets/app.js` (13.4 KB) |
| Styles | ✅ OK | `assets/style.css` (5.9 KB) |
| Données | ✅ OK | `data/sites.json` (17 sites) |
| Git | ✅ OK | `.gitignore` + `.git/` |
| Docs | ✅ OK | `README.md` + `docs/` |
| Validation | ✅ OK | `validate.py` ✓ |

---

**Dernière mise à jour**: Juin 2026  
**Version**: 1.0.0  
**Auteur**: Ravomahandry
