# SayUp - Social Messaging App

**SayUp** è un'app di messaggistica e social networking costruita con **React Native** + **Firebase**, con autenticazione TOTP (2FA), chat private e di gruppo, news con like/commenti, chiamate WebRTC, e notifiche push su **Android e iOS**.

---

## Stack Tecnologico

| Livello         | Tecnologia                                      |
|-----------------|-------------------------------------------------|
| Frontend        | React Native 0.76.3 + Expo 50                   |
| Stato           | Zustand (external store)                        |
| Auth            | Firebase Auth (email/password) + TOTP (OTPAuth) |
| Database        | Firebase Firestore (metadata)                   |
| Realtime        | Firebase Realtime Database (messaggi, presence) |
| Storage         | Firebase Storage (immagini, foto profilo)       |
| Push            | Firebase Cloud Messaging (FCM)                  |
| Crypto          | react-native-encrypted-storage                  |
| Chiamate        | react-native-webrtc                             |
| Ads             | Banner in-house (Firestore)                     |

---

## Struttura Progetto

```
talksy/
├── App.tsx                    # Entry point + init notifiche
├── RootNavigator.tsx          # Stack + Tab navigation
├── theme.ts                   # Colori, stili globali
├── useStore.ts                # Stato globale (auth + UI)
│
├── firebase.ts                # Config centralizzata Firebase
├── authService.ts             # Registrazione/login/logout con TOTP
├── chatService.ts             # Chat, messaggi, amicizie, gruppi
├── newsService.ts             # CRUD news, like, commenti
├── notificationService.ts     # FCM: token, permessi, foreground/background
├── secureStorage.ts           # Wrapper EncryptedStorage
│
├── WelcomeScreen.tsx          # Schermata di benvenuto
├── RegisterScreen.tsx         # Registrazione + setup TOTP
├── ProfileSetupScreen.tsx     # Completamento profilo
│
├── ChatsScreen.tsx            # Lista chat + ricerca amici
├── ChatRoomScreen.tsx         # Chat 1:1 / gruppo
├── AddFriendsScreen.tsx       # Cerca utenti, richieste, lista amici
├── CreateGroupScreen.tsx      # Creazione gruppo da lista amici
│
├── NewsScreen.tsx             # Feed news + filtri categoria
├── NewsDetailScreen.tsx       # Dettaglio news: like, commenti, share
├── AdminNewsScreen.tsx        # Crea/modifica news (admin)
│
├── CallsScreen.tsx            # Lista chiamate / WebRTC
├── SettingsScreen.tsx         # Profilo, logout, preferenze
│
├── android/                   # Progetto Android nativo
│   ├── app/build.gradle
│   ├── app/google-services.json
│   └── app/src/main/AndroidManifest.xml
│
├── ios/                       # Progetto iOS nativo (da generare)
│   ├── Podfile
│   └── talksy/Info.plist
│
└── scripts/
    ├── setAdminClaim.js       # Assegna claim admin via Admin SDK
    └── addCustomAd.js         # Aggiunge banner sponsor
```

---

## Funzionalità Principali

### Auth: TOTP 2FA
- Registrazione con nickname → email interna derivata
- QR code per Google Authenticator / Authy
- Login: nickname + password + codice TOTP (6 cifre, 30s)
- Nessuna password esposta all'utente (generata automaticamente)

### Chat
- **1:1**: chat private con amici
- **Gruppi**: crea gruppi da 2+ amici con nome personalizzato
- Messaggi in tempo reale (Firebase RTDB)
- Typing indicator, presenza online/ultimo accesso
- Unread badge per chat non lette

### News / Social
- Feed news con categorie (Tech, Sport, Musica, ecc.)
- **Like** e **Unlike** sulle news
- **Commenti** con autore e timestamp
- **Condivisione** via native share sheet
- Admin: crea, modifica, elimina news
- Sponsor banner in-house (`ads_custom`)

### Amici
- Ricerca per nickname (case-insensitive)
- Richieste di amicizia in entrata/uscita
- Lista amici con foto profilo, bio, presenza

### Notifiche Push (FCM) — Android + iOS
- Nuovi messaggi
- Richieste di amicizia
- Nuove news pubblicate
- **Foreground**: Alert popup in-app
- **Background**: Notifica di sistema con suono e vibrazione
- **Killed**: Notifica push che riapre l'app

### Chiamate (WebRTC)
- Chiamate audio/video peer-to-peer
- Gestione ICE candidates, offer/answer

---

## Setup Ambiente

### Prerequisiti
- Node.js ≥ 18
- **Android**: Android Studio (SDK + Emulator)
- **iOS**: macOS con Xcode ≥ 14
- Java 17
- Firebase project configurato
- CocoaPods (per iOS)

### 1. Installazione dipendenze

```bash
npm install --legacy-peer-deps
# Installa moduli nativi per WebRTC
npx expo install react-native-webrtc react-native-incall-manager
npx expo prebuild
```

### 2. Configurazione Firebase

#### Android
1. Scarica `google-services.json` da Firebase Console
2. Copialo in `android/app/google-services.json`

#### iOS
1. Scarica `GoogleService-Info.plist` da Firebase Console
2. Crea la cartella `ios/talksy/` e copialo lì
3. Aggiungi il file al progetto Xcode (tasto destro → Add Files)

### 3. Configurazione FCM (Push Notifications)

#### Android
Già configurato. I permessi sono in `AndroidManifest.xml`:
- `POST_NOTIFICATIONS` (Android 13+)
- `RECEIVE_BOOT_COMPLETED`
- `VIBRATE`

#### iOS
1. Vai su Firebase Console → Project Settings → Cloud Messaging
2. Scarica l'**APNs Authentication Key** (.p8) da Apple Developer
3. Caricalo su Firebase (Key ID + Team ID)
4. In Xcode, abilita:
   - **Push Notifications** capability
   - **Background Modes** → `Remote notifications`

### 4. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Configurazione Realtime Database

`database.rules.json`:
```json
{
  "rules": {
    "chats": {
      "$chatId": {
        "messages": {
          ".read": "root.child('chatParticipants/' + $chatId + '/' + auth.uid).exists()",
          ".write": "root.child('chatParticipants/' + $chatId + '/' + auth.uid).exists()"
        },
        "typing": {
          ".read": "root.child('chatParticipants/' + $chatId + '/' + auth.uid).exists()",
          ".write": "root.child('chatParticipants/' + $chatId + '/' + auth.uid).exists()"
        }
      }
    },
    "presence": {
      "$uid": {
        ".read": true,
        ".write": "auth.uid == $uid"
      }
    },
    "chatParticipants": {
      "$chatId": {
        ".read": "root.child('chatParticipants/' + $chatId + '/' + auth.uid).exists()",
        ".write": "root.child('chatParticipants/' + $chatId + '/' + auth.uid).exists()"
      }
    }
  }
}
```

---

## Esecuzione

### Android

```bash
# Build e run
npx expo run:android

# Oppure via Android Studio
cd android && ./gradlew assembleDebug
```

### iOS

```bash
# Genera il progetto iOS se non esiste
npx expo prebuild -p ios

# Installa i pod
cd ios && pod install

# Build e run
npx expo run:ios

# Oppure apri in Xcode
open ios/talksy.xcworkspace
```

### Metro bundler (entrambe le piattaforme)

```bash
npx expo start
```

---

## Gestione Admin

### Diventare Admin

**Metodo A** — Modifica diretta su Firestore:
1. Vai su Firebase Console → Firestore Database
2. Trova il tuo documento in `users/{uid}`
3. Aggiungi il campo `isAdmin: true`

**Metodo B** — Custom Claim JWT (più sicuro):
```bash
npm install -D firebase-admin
# Scarica service account key da Firebase Console
export GOOGLE_APPLICATION_CREDENTIALS=/percorso/serviceAccountKey.json
node scripts/setAdminClaim.js <TUO_UID>
```

---

## Aggiungere News da Firestore Console

Puoi aggiungere news direttamente dalla **Firebase Console** senza usare l'app. Utile per test o per inserire contenuti manualmente.

### 1. Vai su Firestore Database

1. Apri [Firebase Console](https://console.firebase.google.com)
2. Seleziona il tuo progetto **talksy-social**
3. Vai su **Firestore Database** → **Dati**

### 2. Crea la collection (se non esiste)

Se la collection `news` non esiste ancora:
- Clicca **"Inizia una collection"**
- Nome collection: `news`
- Clicca **Avanti** → **Salva** (puoi saltare il primo documento)

### 3. Aggiungi un documento

Clicca **"Aggiungi documento"** e inserisci i campi:

| Campo | Tipo | Valore | Esempio |
|-------|------|--------|---------|
| `id` | string | ID auto-generato da Firestore | `abc123def456` |
| `title` | string | Titolo della news | `"Apple annuncia il chip M4"` |
| `description` | string | Riassunto breve | `"Il nuovo processore promette prestazioni record..."` |
| `source` | string | Nome della fonte | `"TechCrunch"` |
| `category` | string | Una delle categorie supportate | `"Tech"` |
| `url` | string | Link alla news originale | `"https://techcrunch.com/..."` |
| `imageUrl` | string | URL immagine (opzionale) | `"https://..."` oppure `null` |
| `createdAt` | number | Timestamp in millisecondi | `1704067200000` |
| `createdBy` | string | UID dell'admin | `"uid_admin_123"` |
| `likes` | map | Oggetto vuoto `{}` | `{}` |
| `commentsCount` | number | Contatore commenti | `0` |

### Categorie supportate

```
Tech, Sport, Finanza, Musica, Politica, Scienza, Cinema, Gaming, Viaggi, Cucina
```

### Immagine della news

**Opzione A — URL esterno:**
- Inserisci direttamente l'URL di un'immagine (`https://...`)

**Opzione B — Firebase Storage:**
1. Vai su **Storage** nella Firebase Console
2. Carica l'immagine in una cartella (es. `news/`)
3. Copia l'URL di download e incollalo in `imageUrl`

### Esempio completo (JSON)

```json
{
  "id": "news_001",
  "title": "Nuovo aggiornamento SayUp!",
  "description": "Abbiamo aggiunto le notifiche push e i gruppi di chat.",
  "source": "SayUp Blog",
  "category": "Tech",
  "url": "https://sayup.app/blog/update-v1-2",
  "imageUrl": "https://firebasestorage.googleapis.com/.../update.png",
  "createdAt": 1704067200000,
  "createdBy": "uid_admin_123",
  "likes": {},
  "commentsCount": 0
}
```

### Notifiche automatiche

Quando crei una news dall'app (AdminNewsScreen), viene inviata automaticamente una notifica push a tutti gli utenti. Se inserisci la news manualmente da console, **la notifica non parte automaticamente** — gli utenti la vedranno solo aprendo l'app.

---

## Aggiungere Pubblicità Custom da Firestore

Il banner pubblicitario in `NewsScreen` usa un sistema **ibrido**:

1. **Priorità**: banner custom salvato su Firestore (`ads_custom`)
2. **Fallback**: AdMob (solo su Android/iOS, disabilitato su web)

### Come aggiungere un banner sponsor

#### Metodo A — Da Firebase Console (manuale)

1. Vai su [Firebase Console](https://console.firebase.google.com) → **Firestore Database**
2. Crea (se non esiste) la collection **`ads_custom`**
3. Aggiungi un documento con questi campi:

| Campo | Tipo | Descrizione | Esempio |
|-------|------|-------------|---------|
| `active` | boolean | Attiva/disattiva il banner | `true` |
| `imageUrl` | string | URL immagine del banner (obbligatorio) | `"https://..."` |
| `linkUrl` | string | Link di destinazione al click | `"https://sponsor.it/offerta"` |
| `title` | string | Testo alternativo (opzionale) | `"Offerta speciale"` |
| `createdAt` | number | Timestamp in ms | `1704067200000` |

**Regole:**
- Se `active === true` e `imageUrl` è presente → viene mostrato il banner custom
- Se non ci sono documenti attivi → fallback su AdMob
- Su **web** il banner AdMob non viene mai caricato (modulo nativo)

#### Metodo B — Script CLI

```bash
npm install -D firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=/percorso/serviceAccountKey.json

# Aggiungi un banner
node scripts/addCustomAd.js "https://tuo-sito.com/banner.jpg" "https://tuo-sito.com/offerta" "Titolo banner"
```

### Immagine del banner

- **Dimensione consigliata**: 320×100 px (banner standard)
- **Formato**: JPG o PNG, max 200KB
- **Hosting**: puoi usare qualsiasi URL esterno, oppure caricare l'immagine su **Firebase Storage** e copiare l'URL di download

### Disattivare un banner

Per nascondere un banner senza eliminarlo, modifica il campo:
```json
{ "active": false }
```

Oppure elimina il documento dalla collection `ads_custom`.

---

## Notifiche Push: FAQ

### Come funzionano le notifiche?

Le notifiche usano **Firebase Cloud Messaging (FCM)** su entrambe le piattaforme:

| Stato app | Android | iOS |
|-----------|---------|-----|
| **Foreground** | Alert popup + vibrazione | Alert popup + vibrazione |
| **Background** | Notifica sistema + suono | Notifica sistema + suono |
| **Killed** | Notifica push + riapertura | Notifica push + riapertura |

### Cosa scatena una notifica?

| Evento | Ricevente | Contenuto |
|--------|-----------|-----------|
| Messaggio in chat | Altri partecipanti | "Messaggio da [Nome]" |
| Richiesta amicizia | Destinatario | "[Nome] vuole essere tuo amico!" |
| Richiesta accettata | Mittente originale | "[Nome] ha accettato la tua richiesta" |
| Nuova news pubblicata | Tutti gli utenti | "Nuova news su Talksy! [Titolo]" |

### Personalizzazione suono/vibrazione

- **Android**: Dipende dalle impostazioni di sistema del canale notifiche FCM
- **iOS**: Usa il suono di default di sistema. Per un suono custom, aggiungi il file `.caf` al progetto Xcode e specifica il nome in `app.json`

---

## Scripts Utili

| Script | Descrizione |
|--------|-------------|
| `scripts/setAdminClaim.js` | Assegna claim `admin: true` a un utente |
| `scripts/addCustomAd.js` | Aggiunge un banner sponsor al database |

---

## Troubleshooting

### "Codice OTP non valido"
- Assicurati che l'orologio del telefono sia sincronizzato (NTP)
- Prova con una finestra di tolleranza maggiore (`window: 2`)

### "Impossibile creare news"
- Verifica di avere `isAdmin: true` nel profilo
- Deploya le Firestore rules: `firebase deploy --only firestore:rules`

### Notifiche non arrivano (Android)
- Verifica che il token FCM sia salvato nel documento utente (`fcmToken`)
- Controlla i permessi Android (Android 13+ richiede `POST_NOTIFICATIONS`)
- Riavvia l'app dopo aver accettato i permessi

### Notifiche non arrivano (iOS)
- Verifica che **Push Notifications** capability sia abilitata in Xcode
- Controlla che l'APNs key sia caricato su Firebase Console
- Assicurati di aver accettato i permessi notifiche al primo avvio
- Prova a disinstallare e reinstallare l'app

### Errore "nickname già in uso"
- I nickname sono case-insensitive e univoci globali
- Prova una variante o aggiungi numeri

### Errore CocoaPods (iOS)
```bash
cd ios && pod deintegrate && pod install
```

---

## Licenza

MIT — Progetto open source per scopo didattico.
#   s a y u p - c o d e m a g i c  
 