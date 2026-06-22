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
     * **Se usi un account sviluppatore Apple a pagamento ($99/anno):**
       ```bash
       npm run ios-mac -- --device
       ```
     * **Se usi un account Apple ID standard / gratuito (senza pagare l'abbonamento sviluppatori):**
       Dovrai disabilitare le notifiche push nativamente per consentire a Xcode di accettare il profilo gratuito:
       ```bash
       npm run ios-mac -- --free --device
       ```
  5. Il terminale ti chiederà di selezionare il tuo iPhone dall'elenco. Digitalo o selezionalo per iniziare.

---

## 3. Risoluzione dei Problemi Comuni (Troubleshooting)

### 🔴 Errore: Notifiche Push o "aps-environment" non supportati (Account Gratuito)
Gli account sviluppatore Apple gratuiti **non hanno i permessi per usare le Notifiche Push** a livello di sistema operativo. Se provi a compilare il progetto generato da Expo, Xcode fallirà dicendo che il profilo di provisioning non supporta la capability "Push Notifications" (o l'entitlement `aps-environment`).

**Come risolvere in automatico:**
* **Se usi la riga di comando:** Aggiungi sempre il parametro `--free` al comando di build:
  ```bash
  npm run ios-mac -- --free --device
  ```
* **Se preferisci usare Xcode direttamente:** Prima di aprire il progetto in Xcode o avviare la compilazione, esegui questo comando nel terminale del Mac per rimuovere i riferimenti alle notifiche push dai file nativi generati:
  ```bash
  npm run patch-free
  ```
  Una volta fatto, puoi procedere a compilare su Xcode. *(Nota: Se esegui un `prebuild --clean` o elimini la cartella `ios`, dovrai ri-eseguire `npm run patch-free` prima di ricompilare).*

---

### 🔴 Errore: Flag del compilatore o Pods che falliscono in Xcode
Se apri Xcode direttamente e ricevi errori sui Pods (come flag `-GCC_WARN_INHIBIT_ALL_WARNINGS` non riconosciuto o errori C++ in `basic_seq.h`), significa che Xcode sta provando a compilare i file nativi grezzi prima che vengano applicate le patch necessarie per Xcode 16.

**Come risolvere:**
1. Assicurati che lo script di prebuild e patching sia stato eseguito almeno una volta.
2. Se vuoi configurare tutto in un colpo solo prima di aprire Xcode, esegui:
   ```bash
   # Genera la cartella nativa pulita senza compilare
   npx expo prebuild --platform ios --clean --no-install
   
   # Applica le patch Xcode 16/Pods
   node scripts/patch-podfile.js
   
   # Se usi un account gratuito, applica anche la patch per le notifiche push
   node scripts/patch-free-signing.js
   
   # Installa i CocoaPods con le patch attive
   cd ios && pod install && cd ..
   ```
3. A questo punto puoi aprire `ios/SayUp.xcworkspace` in Xcode ed eseguire la build (Product > Build o Run) senza alcun errore di compilazione dei Pods.

---

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
8. Chiudi Xcode e lancia nuovamente `npm run ios-mac -- --free --device` nel Terminale.

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
