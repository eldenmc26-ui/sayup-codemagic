# 🍎 Guida Automatica alla Build iOS su Mac

Questa guida ti consente di compilare ed avviare l'applicazione **SayUp** sul tuo iPhone o sul simulatore Mac utilizzando un singolo comando. Non dovrai fare nessuna configurazione manuale di CocoaPods né modificare file di Xcode.

---

## 1. Prerequisiti sul Mac
Assicurati di aver installato i seguenti strumenti essenziali sul tuo Mac:

1. **Xcode**: Scaricalo gratuitamente dall'App Store. Aprilo almeno una volta per accettare i termini di licenza e consentire l'installazione dei componenti aggiuntivi richiesti.
2. **Homebrew**: Se non lo hai, installalo aprendo il terminale ed eseguendo:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. **Node.js, Watchman e CocoaPods**: Installa le dipendenze di sistema da terminale:
   ```bash
   brew install node watchman cocoapods
   ```

---

## 2. Configurazione Iniziale del Progetto
Una volta scaricato il codice sul Mac, posizionati nella cartella del progetto tramite terminale ed esegui l'installazione dei pacchetti JavaScript:

```bash
npm install --legacy-peer-deps
```

---

## 3. Avvio Automatico (Senza configurare CocoaPods manualmente!)
Abbiamo creato uno script che fa tutto da solo: genera la cartella nativa `ios`, applica automaticamente le patch per la compatibilità con Xcode 16/C++17, installa le librerie iOS (CocoaPods) in background e compila l'applicazione.

Per avviare la compilazione e l'installazione:

```bash
npm run ios-mac
```

### 📲 Come testare su iPhone fisico:
1. Collega il tuo iPhone al Mac tramite cavo USB.
2. Assicurati che l'iPhone sia sbloccato e che tu abbia autorizzato il computer ("Autorizza questo computer").
3. Abilita la **Modalità Sviluppatore** sul tuo iPhone (se non l'hai già fatta):
   * Vai su *Impostazioni* > *Privacy e sicurezza* > *Modalità sviluppatore* (in fondo alla pagina) e attivala. Riavvia l'iPhone quando richiesto.
4. Esegui il comando specificando che vuoi compilare sul dispositivo fisico:
   ```bash
   npm run ios-mac -- --device
   ```
5. Il terminale ti chiederà di selezionare il tuo iPhone dall'elenco. Selezionalo e attendi che la compilazione e l'installazione vengano completate.

---

## 4. Come generare l'archivio IPA (per caricare l'app su Sideloadly)
Se invece di avviarlo direttamente con il debugger preferisci generare un pacchetto `.ipa` da installare in autonomia:

1. Esegui il comando di prebuild e patching automatico:
   ```bash
   npm run ios-mac
   ```
   *(Puoi interrompere il processo con `Ctrl + C` una volta iniziata la compilazione, poiché il progetto Xcode è già stato generato e configurato).*
2. Apri il file del progetto iOS con Xcode:
   * Clicca due volte su `ios/SayUp.xcworkspace`.
3. In Xcode, in alto a sinistra, seleziona **Any iOS Device (arm64)** come target di build (accanto al pulsante Play).
4. Assicurati che il Signing sia configurato sotto la scheda del target principale (`SayUp` -> `Signing & Capabilities`). Associa il tuo Apple ID gratuito o a pagamento.
5. Nel menu in alto seleziona **Product** > **Archive**.
6. Al termine del processo, nella finestra degli archivi, clicca su **Distribute App** > **Ad Hoc** (o Development) e salva il file `.ipa` sulla tua scrivania.
7. Installa il file `.ipa` sul tuo iPhone usando **Sideloadly** o **AltStore**.