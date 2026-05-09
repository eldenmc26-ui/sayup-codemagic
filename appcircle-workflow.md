# 🚀 Workflow Comandi per Appcircle (iOS IPA Sideload)

Segui questo ordine per configurare i "Custom Scripts" su Appcircle per ottenere l'IPA compatibile con Sideloadly.

### 1. Installazione Dipendenze (Custom Script)
Sostituisci o modifica lo step di installazione standard. React 19 richiede obbligatoriamente il flag legacy.
```bash
# Pulisci eventuale cache precedente
rm -rf node_modules package-lock.json

# Installazione forzata per React 19
npm install --legacy-peer-deps
```

### 2. Expo Prebuild (Custom Script)
Questo genera la cartella `/ios` nativa che Appcircle dovrà compilare. **Fondamentale** impostare la variabile per Flipper.
```bash
export EXPO_NO_FLIPPER=1

# Genera i file nativi senza installare i pod (lo facciamo dopo)
npx expo prebuild --platform ios --clean --no-install
```

### 3. CocoaPods Install (Custom Script o Step Standard)
Se usi lo step standard di Appcircle, aggiungi `EXPO_NO_FLIPPER=1` nelle variabili d'ambiente dello step. Se usi uno script:
```bash
cd ios
export EXPO_NO_FLIPPER=1
pod install
cd ..
```

### 4. Build Xcode per Sideloadly (Unsigned)
Nello step **Xcode Build**, per ottenere un'IPA che Sideloadly possa firmare sul tuo PC Windows/Mac, usa questi parametri:

*   **Configuration:** `Release`
*   **Export Method:** `Ad Hoc` o `Development`
*   **Extra Parameters (xcconfig):**
```text
CODE_SIGNING_ALLOWED=NO
CODE_SIGNING_REQUIRED=NO
PROVISIONING_PROFILE_SPECIFIER=
```

---

### 💡 Note Tecniche per Mauro:
1.  **Node Version:** Su Appcircle, assicurati di selezionare **Node 20** o superiore nelle impostazioni del workflow.
2.  **Artifacts:** Una volta terminato, scarica l'IPA dalla sezione "Artifacts". Se il file è uno `.zip`, estrailo per trovare l'IPA da trascinare in Sideloadly.
3.  **Errori Common:** Se vedi errori relativi a `get_folly_config`, significa che lo step `pod install` è partito senza la variabile `EXPO_NO_FLIPPER=1`. Assicurati che sia presente in ogni script che tocca la cartella `ios`.

### Comandi Git per caricare queste info:
```bash
git add . && git commit -m "add: appcircle workflow guide" && git push origin main
```