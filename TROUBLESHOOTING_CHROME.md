# 🔧 TROUBLESHOOTING - CHROME NE MONTRE PAS LA CARTE

## 🔍 Diagnostic

Si la carte ne s'affiche pas sur Chrome:

### 1. Vérifier la console du navigateur (F12)

Ouvrez **F12 → Console** et cherchez:

```
❌ Erreur: "Cannot find module..."
❌ Erreur CORS
❌ 404 Not Found
✅ ✅ Application chargée
✅ 🗺️  Carte affichée
```

**Si vous voyez les ✅**, c'est bon!  
**Si vous voyez les ❌**, lisez la section correspondante ci-dessous.

---

## 📋 SOLUTIONS

### ❌ Erreur: "Cannot find module esri/Map..."

**Cause:** L'API ArcGIS ne s'est pas chargée correctement.

**Solution 1: Vider le cache**
```
Ctrl + Maj + R  (ou Cmd + Shift + R sur Mac)
```

**Solution 2: Désactiver les extensions**
- Ouvrez Chrome en mode sans extension
- `Win + R` → `chrome.exe --incognito`

**Solution 3: Attendre le chargement**
- L'API ArcGIS met 2-3 secondes à charger
- Attendez avant d'accéder à la page

---

### ❌ Erreur CORS / 404

**Cause:** Problème d'URL ou de chemin relatif.

**Solution 1: Vérifiez l'URL**
- Local: `http://localhost:8000` ✅
- GitHub Pages: `https://Ravomahandry.github.io/MAYOTTES_Inter` ✅

**Solution 2: Vérifiez les fichiers**
```bash
# Vérifiez que tous les fichiers existent
ls -la assets/
ls -la data/

# Doit afficher:
# app.js
# style.css
# sites.json
```

**Solution 3: Vérifiez les chemins**
- `./assets/app.js` ✅ (relatif)
- `./assets/style.css` ✅ (relatif)
- `./data/sites.json` ✅ (relatif)
- `/assets/app.js` ❌ (absolu, ne marche pas!)

---

### ❌ "Impossible de charger la ressource..."

**Cause:** Serveur local ne fonctionne pas correctement.

**Solution 1: Vérifiez que le serveur est actif**
```bash
cd D:\VS Code\Carte_interactive
python -m http.server 8000

# Doit afficher:
# Serving HTTP on 0.0.0.0 port 8000...
```

**Solution 2: Essayez un autre port**
```bash
python -m http.server 8001
# Puis allez à: http://localhost:8001
```

**Solution 3: Utilisez un autre serveur**
```bash
# Option 1: Node.js
npx http-server -p 8000

# Option 2: Python 3 (Windows)
py -m http.server 8000

# Option 3: Live Server (VS Code)
# Clic droit sur index.html → "Open with Live Server"
```

---

### ❌ La carte s'affiche mais pas les marqueurs

**Cause:** Les données JSON ne se chargent pas.

**Solution 1: Vérifiez le fichier JSON**
```bash
python validate.py
# Doit afficher: ✅ JSON valide: 17 sites trouvés
```

**Solution 2: Vérifiez la console (F12)**
- Cherchez des erreurs de réseau
- Vérifiez que `data/sites.json` se charge

**Solution 3: Attendez le chargement**
- Les données prennent 1-2 secondes à charger
- Attendez que le texte "17 sites géolocalisés" apparaisse

---

### ❌ Le zoom à la molette ne fonctionne pas

**Cause:** Navigateur différent de Chrome/Edge/Opera.

**Solutions:**
- Testez sur **Edge** ou **Opera**
- Testez sur une version récente de Chrome
- Essayez en mode incognito

---

## 📊 VÉRIFICATION PAS À PAS

### 1. Démarrer le serveur
```bash
cd D:\VS Code\Carte_interactive
python -m http.server 8000
# ✅ Serveur lancé sur port 8000
```

### 2. Ouvrir la page
```
http://localhost:8000
```

### 3. Vérifier la console (F12)
```javascript
// Tapez ceci dans la console:
console.log(window.__arcgisLoaded);
// ✅ Doit afficher: true

console.log(require);
// ✅ Doit afficher la fonction require
```

### 4. Vérifier la carte
```javascript
// Tapez ceci dans la console:
console.log(view);
// ✅ Doit afficher l'objet view (carte)
```

### 5. Vérifier les données
```javascript
// Tapez ceci dans la console:
console.log(allSites);
// ✅ Doit afficher un tableau de 17 objets
```

---

## 🌐 TEST SUR DIFFÉRENTS NAVIGATEURS

| Navigateur | Statut | Notes |
|-----------|--------|-------|
| Chrome | ✅ Corrigé | Zoom à la molette OK |
| Edge | ✅ OK | Fonctionne parfaitement |
| Opera | ✅ OK | Fonctionne parfaitement |
| Firefox | ✅ OK | Fonctionne (pas de zoom molette) |
| Safari | ✅ OK | Fonctionne (pas de zoom molette) |

---

## 💡 ASTUCES CHROME

### Si Chrome continue à avoir des problèmes:

1. **Désactiver les extensions**
   - Certaines extensions peuvent bloquer JavaScript
   - Testez en mode incognito

2. **Vérifier la version Chrome**
   - Menu ⋮ → À propos de Google Chrome
   - Doit être la version récente

3. **Vider le cache complètement**
   - Ctrl + Maj + Suppr
   - Cocher "Tous les éléments"
   - Cliquer "Effacer les données"

4. **Activer le JavaScript**
   - Paramètres → Confidentialité et sécurité → Paramètres de site
   - JavaScript → Autoriser
   - Actualisez la page

---

## 📞 DÉBOGAGE AVANCÉ

Si rien ne fonctionne, ouvrez la **console développeur** (F12) et exécutez:

```javascript
// Test 1: Vérifier que l'API est chargée
console.log("API chargée?", !!window.__arcgisLoaded);

// Test 2: Vérifier que le require fonctionne
console.log("Require disponible?", !!window.require);

// Test 3: Vérifier le div de la carte
console.log("viewDiv existe?", !!document.getElementById("viewDiv"));

// Test 4: Vérifier les données
fetch("./data/sites.json")
  .then(r => r.json())
  .then(d => console.log("Données chargées:", d.length, "sites"))
  .catch(e => console.error("Erreur données:", e));
```

---

## ✅ RÉSULTAT ATTENDU

Une fois que tout fonctionne:

```
✅ Application chargée
🗺️  Carte affichée
📍 17 sites trouvés
```

Avec:
- ✅ Carte satellite/hybride affichée
- ✅ 17 marqueurs colorés visibles
- ✅ Modal "🔍 Recherche" au clic
- ✅ Zoom à la molette fonctionne
- ✅ Popups au survol

---

## 📧 ENCORE UN PROBLÈME?

1. Notez exactement le message d'erreur
2. Ouvrez F12 → Console et screenshot
3. Testez sur un autre navigateur
4. Essayez sur un autre ordinateur

Généralement, c'est un problème de:
- Cache navigateur
- Extension bloquante
- Version Chrome ancienne
- Serveur non lancé

---

**Dernière mise à jour**: Juin 2026  
**Tested on**: Chrome 125+, Edge 125+, Opera 111+, Firefox 124+, Safari 17.4+
