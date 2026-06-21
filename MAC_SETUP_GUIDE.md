# 🍏 Guida di Setup iOS e Risoluzione dei Problemi su Mac

Questa guida ti accompagna passo-passo nella configurazione del tuo Mac per compilare, testare ed avviare l'applicazione **SayUp** sul tuo iPhone o sul simulatore iOS.

---

## 1. Configurazione Iniziale del Mac (Solo la prima volta)

Prima di compilare, assicurati che il tuo ambiente macOS sia pronto. Apri il **Terminale** sul Mac ed esegui i passaggi seguenti:

### A. Installa Xcode
1. Scarica **Xcode** gratuitamente dall'App Store del Mac.
2. Una volta scaricato, **aprilo almeno una volta**. Accetta i termini di licenza e attendi che Xcode completi l'installazione dei componenti aggiuntivi.
3. Seleziona i Command Line Tools corretti andando in alto a sinistra su **Xcode** > **Settings** (o *Preferences*) > **Locations** e assicurati che la voce **Command Line Tools** sia impostata sulla versione attuale di Xcode.

### B. Installa Homebrew, Node.js e CocoaPods
Homebrew è il gestore dei pacchetti per macOS. Se non lo hai ancora, installalo incollando questo comando nel Terminale:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Una volta installato Homebrew, installa le dipendenze di sistema necessarie:
```bash
# Installa Node.js e Watchman (necessario per monitorare i file in React Native)
brew install node watchman

# Installa CocoaPods (necessario per gestire le librerie native iOS)
brew install cocoapods
```

---

## 2. Scaricare e Avviare il Progetto

Una volta configurato il Mac, clona il repository (o spostati nella cartella del progetto) ed esegui questi comandi:

### A. Installazione Dipendenze
```bash
# Entra nella cartella del progetto SayUp
cd sayup-codemagic

# Scarica gli ultimi aggiornamenti con le patch automatiche
git pull origin main

# Installa le dipendenze JavaScript
npm install --legacy-peer-deps
```

### B. Avviare l'app (Tutto in automatico)
Abbiamo creato uno script che fa tutto da solo: genera la cartella iOS, inserisce le patch di compatibilità per Xcode 16/C++17, esegue `pod install` in background ed avvia l'app.

* **Su Simulatore iOS:**
  ```bash
  npm run ios-mac
  ```

* **Su iPhone Fisico (Consigliato per testare chiamate/notifiche):**
  1. Collega l'iPhone al Mac tramite cavo USB.
  2. Sblocca l'iPhone e clicca su **Autorizza questo computer** se compare il popup.
  3. Abilita la **Modalità Sviluppatore** sul tuo iPhone:
     * Vai su *Impostazioni* > *Privacy e sicurezza* > scendi in fondo su *Modalità sviluppatore* > attiva la spunta.
     * Riavvia l'iPhone quando richiesto e conferma l'attivazione.
  4. Lancia il comando per compilare direttamente sul tuo iPhone:
     ```bash
     npm run ios-mac -- --device
     ```
  5. Il terminale ti chiederà di selezionare il tuo iPhone dall'elenco. Digitalo o selezionalo per iniziare.

---

## 3. Risoluzione dei Problemi Comuni (Troubleshooting)

### 🔴 Errore: "Untrusted Developer" sul tuo iPhone
Se l'app viene installata sul tuo telefono ma non si avvia dicendo che lo sviluppatore non è attendibile:
1. Sul tuo iPhone, vai su **Impostazioni** > **Generali** > **Gestione VPN e dispositivi**.
2. Sotto la voce "App sviluppatore", individua il tuo account Apple ID.
3. Clicca su **Autorizza [Tua Email]** e conferma.

---

### 🔴 Errore: "Signing for 'SayUp' requires a development team"
Questo accade quando Xcode non sa quale account Apple ID utilizzare per firmare l'applicazione nativa.
1. Apri Xcode.
2. In alto a sinistra, vai su **Xcode** > **Settings** > **Accounts**.
3. Clicca sul tasto **+** in basso a sinistra, seleziona **Apple ID** e inserisci le tue credenziali Apple (va bene anche un account gratuito).
4. Nel terminale sul Mac, apri il progetto iOS con Xcode tramite:
   ```bash
   open ios/SayUp.xcworkspace
   ```
5. Nella barra laterale sinistra di Xcode, clicca sul file radice blu **SayUp**.
6. Clicca sulla scheda **Signing & Capabilities**.
7. Sotto la voce **Team**, seleziona il tuo account personale (*Personal Team* o il tuo nome).
8. Chiudi Xcode e lancia nuovamente `npm run ios-mac -- --device` nel Terminale.

---

### 🔴 Errore: CocoaPods non si installa / Problemi di Ruby
Se riscontri problemi durante la fase di installazione dei Pods legati a Ruby o permessi di scrittura:
1. Rimuovi le installazioni precedenti che creano conflitto:
   ```bash
   sudo gem uninstall cocoapods
   brew uninstall cocoapods
   ```
2. Reinstalla CocoaPods in modo pulito tramite Homebrew (consigliato per evitare problemi di permessi):
   ```bash
   brew install cocoapods
   ```
3. Se sei su un Mac con chip Apple Silicon (M1/M2/M3) e ricevi errori di architettura durante il `pod install`, prova a pulire la cache di CocoaPods:
   ```bash
   pod cache clean --all
   ```

---

### 🔴 Errore: "xcode-select: error: tool 'xcodebuild' requires Xcode"
Se ricevi un errore che dice che `xcodebuild` non è installato o attivo, significa che il percorso dei Command Line Tools non è collegato correttamente all'applicazione Xcode:
1. Esegui questo comando nel terminale per impostare il percorso corretto:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

---

### 🔴 Come pulire completamente per ripartire da zero
Se qualcosa va storto e vuoi ricominciare da uno stato pulito al 100%:
```bash
# Rimuovi cartelle generate e dipendenze
rm -rf node_modules package-lock.json ios

# Reinstalla tutto
npm install --legacy-peer-deps

# Rilancia il comando
npm run ios-mac
```
