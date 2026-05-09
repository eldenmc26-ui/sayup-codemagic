# 🍎 Guida alla Build iOS su Mac (M1/M2/M3 o Intel)

Questa guida ti spiega come configurare l'ambiente e generare l'IPA (o avviare l'app) partendo da zero sul tuo Mac.

## 1. Installazione Strumenti di Sistema
Apri il terminale e installa le dipendenze necessarie tramite Homebrew:

```bash
# Installa Node.js e Watchman (necessario per React Native)
brew install node watchman

# Installa CocoaPods (gestore pacchetti iOS)
brew install cocoapods
```

**Importante:** Scarica e installa **Xcode** dall'App Store. Una volta installato, aprilo una volta per accettare i termini di licenza e installare i componenti aggiuntivi.

## 2. Setup del Progetto
Spostati nella cartella del progetto (`talksy`) ed esegui la pulizia profonda:

```bash
# Rimuovi vecchi file
rm -rf node_modules package-lock.json ios

# Installa le dipendenze JS (usando legacy-peer-deps per compatibilità React 19)
npm install --legacy-peer-deps
```

## 3. Generazione Cartella Nativa (Prebuild)
Usa Expo per generare i file di Xcode:

```bash
npx expo prebuild --platform ios --clean
```

## 4. Installazione Dipendenze iOS (Pods)
Entra nella cartella `ios` e installa i CocoaPods. Se sei su Mac Silicon (M1/M2/M3), forza l'architettura x86_64 se riscontri errori, altrimenti usa il comando standard:

```bash
cd ios
export EXPO_NO_FLIPPER=1
pod install
cd ..
```

## 5. Avvio e Build IPA
Ora puoi lanciare l'app sul simulatore o generare il file per Sideloadly.

**Per avviare sul simulatore:**
```bash
npx expo run:ios
```

**Per generare l'IPA (Sideloadly):**
1. Apri `ios/talksy.xcworkspace` con **Xcode**.
2. In alto, seleziona **Any iOS Device (arm64)** come target.
3. Vai su **Product** > **Archive**.
4. Al termine, clicca su **Distribute App** > **Ad Hoc** e salva il file `.ipa` sulla tua scrivania.

## 6. Sincronizzazione con GitHub
Per inviare le modifiche alla repo `talksy-social` e attivare i workflow automatici:

```bash
# Aggiungi modifiche
git add .
# Salva con messaggio
git commit -m "messaggio della modifica"
# Invia a GitHub
git push origin main
```