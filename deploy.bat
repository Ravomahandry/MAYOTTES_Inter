@echo off
REM Script de déploiement rapide pour GitHub
REM Utilisation: deploy.bat "Message de commit"

setlocal enabledelayedexpansion

echo.
echo ================================================
echo  🚀 DEPLOIEMENT GITHUB - CARTE INTERACTIVE 🚀
echo ================================================
echo.

REM Vérifier Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git n'est pas installé
    exit /b 1
)

REM Message de commit
set "MESSAGE=%1"
if "!MESSAGE!"=="" (
    set "MESSAGE=Update: Modification du projet"
)

echo 📝 Message: !MESSAGE!
echo.

REM Ajouter les fichiers
echo 📦 Ajout des fichiers...
git add .
if errorlevel 1 (
    echo ❌ Erreur lors de l'ajout des fichiers
    exit /b 1
)
echo ✅ Fichiers ajoutés

REM Commit
echo.
echo 💾 Création du commit...
git commit -m "!MESSAGE!"
if errorlevel 1 (
    echo ⚠️  Aucun changement à committer
    goto :PUSH_ONLY
)
echo ✅ Commit créé

REM Push
:PUSH_ONLY
echo.
echo 🌐 Envoi vers GitHub...
git push origin main
if errorlevel 1 (
    echo ❌ Erreur lors du push
    exit /b 1
)
echo ✅ Envoyé vers GitHub

echo.
echo ================================================
echo ✅ DÉPLOIEMENT RÉUSSI!
echo.
echo 🔗 Accédez à:
echo    https://Ravomahandry.github.io/MAYOTTES_Inter
echo    (dans 5-10 minutes)
echo ================================================
echo.
pause
