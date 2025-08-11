# Guide : Créer des Alias PowerShell

Ce guide explique comment créer des alias PowerShell persistants qui fonctionnent dans toutes vos sessions.

## Comprendre les Profils PowerShell

PowerShell utilise des fichiers de profil pour exécuter des commandes au démarrage. Il existe différents profils selon la version de PowerShell :

- **PowerShell 5.1** (Windows PowerShell) : `C:\Users\[USERNAME]\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
- **PowerShell 7+** (PowerShell Core) : `C:\Users\[USERNAME]\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`

## Étapes pour Créer un Alias

### 1. Identifier votre Version PowerShell

```powershell
# Vérifier la version
$PSVersionTable.PSVersion

# Voir le chemin du profil
$PROFILE
```

### 2. Vérifier si le Profil Existe

```powershell
# Tester l'existence du profil
Test-Path $PROFILE

# Si False, créer le profil
New-Item -Path $PROFILE -Type File -Force
```

### 3. Modifier le Profil

```powershell
# Ouvrir le profil dans le bloc-notes
notepad $PROFILE

# Ou avec votre éditeur préféré
code $PROFILE  # VSCode
```

### 4. Ajouter votre Alias

Dans le fichier de profil, ajoutez une fonction :

```powershell
# Exemple d'alias simple
function ll {
    Get-ChildItem -Force
}

# Exemple d'alias avec paramètres
function gd {
    param($branch = "main")
    git diff $branch
}

# Exemple d'alias complexe (notre cas cc)
function cc {
    # Lancer le serveur copilot-api en arrière-plan
    Start-Job -ScriptBlock {
        Set-Location "C:\Users\Louis\Documents\Projects\copilot-api"
        node dist/main.js start --claude-code --server-only
    } | Out-Null
    
    # Attendre un peu que le serveur démarre
    Start-Sleep -Seconds 2
    
    # Lancer Claude Code depuis le répertoire courant
    $env:ANTHROPIC_BASE_URL = "http://localhost:4141"
    $env:ANTHROPIC_AUTH_TOKEN = "dummy"
    $env:ANTHROPIC_MODEL = "claude-sonnet-4"
    $env:ANTHROPIC_SMALL_FAST_MODEL = "gpt-4.1-2025-04-14"
    claude --dangerously-skip-permissions
}
```

### 5. Appliquer les Changements

```powershell
# Recharger le profil
. $PROFILE

# Ou redémarrer PowerShell
```

## Techniques Avancées

### Alias avec Variables d'Environnement

```powershell
function mycommand {
    $originalPath = Get-Location
    $env:MY_VAR = "value"
    # Votre logique ici
    Set-Location $originalPath
}
```

### Alias avec Tâches en Arrière-Plan

```powershell
function bgserver {
    Start-Job -ScriptBlock {
        # Code qui s'exécute en arrière-plan
        python -m http.server 8000
    } | Out-Null
    
    Write-Host "Serveur démarré en arrière-plan"
}
```

### Alias avec Gestion d'Erreurs

```powershell
function safe-command {
    try {
        # Votre commande ici
        dangerous-operation
    } catch {
        Write-Error "Erreur : $_"
    } finally {
        # Nettoyage
        cleanup-resources
    }
}
```

## Bonnes Pratiques

### 1. Nommage des Alias
- Utilisez des noms courts et mémorables
- Évitez les conflits avec les commandes existantes
- Utilisez des verbes PowerShell standard si possible

### 2. Documentation
```powershell
# Documentez vos alias avec des commentaires
function myalias {
    <#
    .SYNOPSIS
    Description courte de l'alias
    
    .DESCRIPTION
    Description détaillée de ce que fait l'alias
    
    .EXAMPLE
    myalias -param value
    #>
    param($param)
    # Votre code ici
}
```

### 3. Paramètres
```powershell
function flexible-alias {
    param(
        [string]$Required,
        [string]$Optional = "default",
        [switch]$Flag
    )
    
    if ($Flag) {
        Write-Host "Flag activé"
    }
    
    Write-Host "Required: $Required, Optional: $Optional"
}
```

## Gestion Multi-Version

Pour que vos alias fonctionnent dans PowerShell 5.1 ET PowerShell 7+ :

### Option 1 : Dupliquer le Contenu
Copiez le même contenu dans les deux fichiers de profil.

### Option 2 : Profil Partagé
Créez un fichier partagé et importez-le :

```powershell
# Dans chaque profil
. "C:\Users\[USERNAME]\Documents\shared-aliases.ps1"
```

## Dépannage

### Profil non Chargé
```powershell
# Vérifier la politique d'exécution
Get-ExecutionPolicy

# Autoriser l'exécution (si nécessaire)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Alias non Reconnu
```powershell
# Lister toutes les fonctions
Get-Command -CommandType Function

# Recharger le profil
. $PROFILE
```

### Erreurs dans le Profil
```powershell
# Tester le profil
PowerShell -NoProfile
. $PROFILE  # Voir les erreurs
```

## Exemples d'Alias Utiles

```powershell
# Navigation rapide
function home { Set-Location $HOME }
function docs { Set-Location "$HOME\Documents" }
function desktop { Set-Location "$HOME\Desktop" }

# Git shortcuts
function gs { git status }
function ga { git add . }
function gc { param($msg) git commit -m $msg }
function gp { git push }

# Développement
function serve { python -m http.server 8000 }
function build { npm run build }
function dev { npm run dev }

# Système
function cls { Clear-Host }
function open { param($path) Invoke-Item $path }
function edit { param($file) code $file }
```

## Conclusion

Les alias PowerShell sont puissants pour automatiser vos tâches répétitives. Avec les profils PowerShell, vous pouvez créer un environnement personnalisé qui améliore votre productivité.

**Points clés à retenir :**
- Utilisez des fonctions plutôt que des alias simples pour plus de flexibilité
- Documentez vos alias pour vous rappeler leur utilité
- Testez vos alias dans différentes situations
- Sauvegardez vos profils PowerShell régulièrement