# 🚀 SAYUP — Guida Setup Completa

## 📁 Struttura Progetto

```
talksy/
├── App.tsx                          ✅ Entry point
├── package.json                     ✅ Dipendenze
├── tsconfig.json                    ✅ TypeScript config
├── babel.config.js                  ✅ Babel
├── metro.config.js                  ✅ Metro bundler
├── firebase.json                    ✅ Firebase CLI config
├── firestore.rules                  ✅ Security rules Firestore
├── database.rules.json              ✅ Security rules RTDB
├── storage.rules                    ✅ Security rules Storage
├── .gitignore                       ✅
├── README.md                        ✅ Documentazione
│
└── src/
    ├── navigation/
    │   └── RootNavigator.tsx        ✅ Stack + Tab navigation
    ├── services/
    │   ├── firebase.ts              ✅ Firebase init
    │   ├── authService.ts           ✅ Auth + TOTP
    │   ├── chatService.ts           ✅ Chat real-time
    │   └── newsService.ts           ✅ News
    ├── store/
    │   └── useStore.ts              ✅ Zustand global state
    ├── screens/
    │   ├── WelcomeScreen.tsx        ✅ Schermata benvenuto
    │   ├── RegisterScreen.tsx       ✅ Registrazione OTP + QR
    │   ├── ProfileSetupScreen.tsx   ✅ Setup profilo
    │   ├── ChatsScreen.tsx          ✅ Lista chat
    │   ├── ChatRoomScreen.tsx       ✅ Chat room real-time
    │   ├── NewsScreen.tsx           ✅ News feed
    │   ├── CallsScreen.tsx          ✅ Placeholder chiamate
    │   └── AdminNewsScreen.tsx      ✅ Pannello admin news
    └── components/                  (da aggiungere custom components)
```

---

## ⚡ INSTALLAZIONE RAPIDA

### 1️⃣ Installa Node modules
```bash
npm install --legacy-peer-deps
npx expo prebuild
```

### 2️⃣ Setup Firebase Android

**Scarica `google-services.json` dalla Firebase Console:**
- Vai su https://console.firebase.google.com
- Seleziona il progetto `talksy-social`
- Impostazioni progetto → Le tue app → Android → Scarica `google-services.json`
- Metti il file in: `android/app/google-services.json`

**Modifica `android/build.gradle`:**
Nella sezione `dependencies` aggiungi:
```groovy
classpath("com.google.gms:google-services:4.4.0")
```

**Modifica `android/app/build.gradle`:**
Alla fine del file aggiungi:
```groovy
apply plugin: 'com.google.gms.google-services'
```

### 3️⃣ Setup Firebase iOS

**Scarica `GoogleService-Info.plist`:**
- Firebase Console → Impostazioni progetto → iOS
- Scarica `GoogleService-Info.plist`
- Apri `ios/talksy.xcworkspace` in Xcode
- Trascina il file nella root del progetto (target talksy)

**Installa i pod:**
```bash
cd ios
pod install
cd ..
```

### 4️⃣ Deploy Security Rules Firebase
```bash
npm install -g firebase-tools
firebase login
firebase use talksy-social
firebase deploy --only firestore:rules,database,storage
```

### 5️⃣ Avvia l'app

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

---

## 🔐 Setup Admin (per pubblicare news)

Gli admin possono creare news. Per impostare un utente come admin:

1. Installa Firebase Admin SDK in un progetto Node separato (o usa Cloud Functions)
2. Esegui:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

await admin.auth().setCustomUserClaims(UID_UTENTE, { admin: true });
```

3. L'utente dovrà rifare il login per applicare il custom claim
4. Nella schermata News vedrà il banner admin

---

## 📝 Funzionalità Implementate

### ✅ Autenticazione
- [x] Registrazione con Google Authenticator (TOTP)
- [x] QR Code generation
- [x] Verifica OTP a 6 cifre
- [x] Login con nickname + OTP
- [x] Logout

### ✅ Profilo
- [x] Upload foto profilo
- [x] Nome, bio, interessi
- [x] Salvataggio su Firestore + Storage

### ✅ Chat
- [x] Cerca utenti per nickname
- [x] Crea chat 1:1
- [x] Messaggi real-time (Firebase RTDB)
- [x] Lista chat con preview ultimo messaggio
- [x] Badge unread count
- [x] Typing indicator (implementato lato servizio)
- [x] Presenza online (implementato lato servizio)

### ✅ News
- [x] Feed personalizzato per interessi
- [x] Filtraggio automatico
- [x] Link esterni
- [x] Timestamp relativo
- [x] Pannello admin per creare news

### 🚧 Da Completare (opzionale)
- [ ] Chiamate vocali (WebRTC o Agora SDK)
- [ ] Videochiamate
- [ ] Push notifications (FCM già configurato)
- [ ] Allegati immagini nelle chat
- [ ] Gruppi chat
- [ ] Stato "ultimo accesso"
- [ ] Conferma lettura messaggi
- [ ] Eliminazione messaggi

---

## 🐛 Troubleshooting

### Errore: `Unable to resolve module otpauth`
```bash
npm install otpauth
cd ios && pod install
```

### Errore: `google-services.json not found`
Assicurati che il file sia in `android/app/google-services.json` (non nella root)

### iOS: `GoogleService-Info.plist not found`
Apri Xcode → verifica che il file sia nel target talksy

### Firestore permission denied
Controlla che le rules siano deployate:
```bash
firebase deploy --only firestore:rules
```

### Metro bundler errore
```bash
npx react-native start --reset-cache
```

---

## 🎨 Personalizzazione

### Colori principali (theme Talksy)
```javascript
GREEN:  '#25D366'  // Talksy green
DARK:   '#075E54'  // Header dark
LIGHT:  '#DCF8C6'  // Chat bubble mine
BG:     '#ECE5DD'  // Chat background
```

Modifica i colori in ogni screen secondo le tue preferenze.

---

## 📱 Test su Dispositivo Fisico

### Android
1. Attiva "Opzioni sviluppatore" sul telefono
2. Attiva "Debug USB"
3. Collega via USB
4. `npm run android`

### iOS
1. Xcode → Signing & Capabilities
2. Seleziona il tuo Team
3. Collega iPhone via USB
4. Xcode → Product → Run

---

## 🚀 Build per Produzione

### Android APK
```bash
cd android
./gradlew assembleRelease
```
APK in: `android/app/build/outputs/apk/release/app-release.apk`

### iOS
1. Xcode → Product → Archive
2. Distribuisci su TestFlight o App Store

---

## 🔒 Note di Sicurezza

- ✅ Security Rules di Firestore/RTDB/Storage già configurate
- ✅ TOTP secret salvato con `react-native-encrypted-storage` (Keychain/EncryptedSharedPreferences)
- ✅ Password interne generate random, mai mostrate all'utente
- ⚠️ API Key Firebase nel codice è normale — la protezione è nelle rules
- ⚠️ NON committare su GitHub i file `google-services.json` e `GoogleService-Info.plist`

---

## 📞 Supporto

Per problemi specifici:
1. Controlla la console Firebase: https://console.firebase.google.com
2. Verifica i log: `npx react-native log-android` o `log-ios`
3. React Native debugging: Shake device → Enable Remote JS Debugging

---

## ✨ Prossimi Passi Consigliati

1. **Test completo del flusso**:
   - Registrati con Google Authenticator
   - Crea profilo
   - Cerca un amico e invia messaggi
   - Visualizza le news

2. **Crea un utente admin**:
   - Usa Firebase Admin SDK
   - Pubblica una news di test

3. **Deploy su TestFlight/Google Play Internal Testing**

4. **Aggiungi funzionalità extra**:
   - Push notifications
   - Gruppi chat
   - Allegati immagini

Buon sviluppo! 🎉
