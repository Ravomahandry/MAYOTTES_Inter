#!/usr/bin/env python3
"""
Script de validation du projet Carte Interactive Mayotte
Vérifie que tous les fichiers nécessaires existent et sont valides
"""

import os
import json
import sys
from pathlib import Path

def check_files():
    """Vérifier que tous les fichiers requises existent"""
    base_path = Path(__file__).parent
    
    required_files = {
        'index.html': 'Page HTML principale',
        'README.md': 'Documentation du projet',
        'package.json': 'Métadonnées du projet',
        '.gitignore': 'Fichiers Git ignorés',
        'assets/app.js': 'Application JavaScript',
        'assets/style.css': 'Feuille de styles',
        'data/sites.json': 'Données des sites',
        'docs/implementation.md': 'Documentation technique',
    }
    
    print("=" * 60)
    print("🔍 VALIDATION DES FICHIERS")
    print("=" * 60)
    
    all_ok = True
    for file_path, description in required_files.items():
        full_path = base_path / file_path
        exists = full_path.exists()
        status = "✅" if exists else "❌"
        print(f"{status} {file_path:<30} - {description}")
        if not exists:
            all_ok = False
    
    return all_ok

def check_json():
    """Valider le JSON des sites"""
    print("\n" + "=" * 60)
    print("📊 VALIDATION JSON")
    print("=" * 60)
    
    base_path = Path(__file__).parent
    json_file = base_path / 'data' / 'sites.json'
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"✅ JSON valide: {len(data)} sites trouvés")
        
        # Vérifier la structure des sites
        for i, site in enumerate(data[:3]):  # Afficher les 3 premiers
            required_keys = ['site_id', 'localisation', 'latitude_dms', 'longitude_dms']
            missing = [k for k in required_keys if k not in site]
            
            if missing:
                print(f"  ⚠️  Site {i}: clés manquantes: {missing}")
            else:
                print(f"  ✅ Site {site.get('site_id')}: {site.get('localisation')}")
        
        return True
    except json.JSONDecodeError as e:
        print(f"❌ Erreur JSON: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ Fichier JSON non trouvé")
        return False

def check_html():
    """Vérifier que HTML charge correctement les ressources"""
    print("\n" + "=" * 60)
    print("🌐 VALIDATION HTML")
    print("=" * 60)
    
    base_path = Path(__file__).parent
    html_file = base_path / 'index.html'
    
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        checks = {
            'ArcGIS API': 'js.arcgis.com' in content,
            'style.css': './assets/style.css' in content,
            'app.js': './assets/app.js' in content,
            'JSON script (SUPPRIMÉ)': './data/sites.json' not in content.split('<!-- App -->')[0],
        }
        
        for check_name, passed in checks.items():
            status = "✅" if passed else "⚠️ "
            print(f"{status} {check_name}")
        
        return all(checks.values())
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def check_sizes():
    """Afficher les tailles des fichiers"""
    print("\n" + "=" * 60)
    print("📏 TAILLES DES FICHIERS")
    print("=" * 60)
    
    base_path = Path(__file__).parent
    files = [
        'index.html',
        'assets/app.js',
        'assets/style.css',
        'data/sites.json',
        'README.md'
    ]
    
    for file_path in files:
        full_path = base_path / file_path
        if full_path.exists():
            size_kb = full_path.stat().st_size / 1024
            print(f"  {file_path:<30} {size_kb:>8.1f} KB")

def main():
    """Exécuter tous les tests"""
    print("\n🚀 VALIDATION - Carte Interactive Mayotte\n")
    
    results = {
        'files': check_files(),
        'json': check_json(),
        'html': check_html(),
    }
    
    check_sizes()
    
    print("\n" + "=" * 60)
    print("📋 RÉSUMÉ")
    print("=" * 60)
    
    all_pass = all(results.values())
    
    if all_pass:
        print("✅ TOUS LES TESTS RÉUSSIS")
        print("\n🎉 Le projet est prêt pour:")
        print("  • Déploiement local (python -m http.server 8000)")
        print("  • Publication sur GitHub Pages")
        return 0
    else:
        print("⚠️  ERREURS DÉTECTÉES")
        return 1

if __name__ == '__main__':
    sys.exit(main())
