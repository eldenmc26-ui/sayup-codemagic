# TODO - Fix Talksy + E2EE Implementation

## ✅ Piano approvato dall'utente
- [x] Creare TODO.md con tracking progress

## 🔒 1. CRITTOGRAFIA E2EE (PRIORITÀ MASSIMA)
- [ ] Installa crypto-js: `npm i crypto-js`
- [ ] Fix chatService.ts: 
  - Genera/derivazione chiavi per chat 
  - Encrypt/decrypt messaggi
  - Salva chiavi in secureStorage
- [ ] Update ChatRoomScreen.tsx: 
  - Decrittazione UI
  - Indicatori E2EE
  - Fallback messaggi illeggibili

## 🐛 2. BUG CRITICI
- [x] Fix AddFriendsScreen.tsx: </View> mancante
- [ ] Fix race conditions chatService.ts

## 🎨 3. UI/UX MIGLIORAMENTI
- [ ] ChatsScreen.tsx: pull-to-refresh + badge
- [ ] ChatRoomScreen.tsx: typing indicators + timestamps

## 🚀 4. TEST & DEPLOY
- [ ] Test end-to-end (2 utenti)
- [ ] Deploy regole Firebase
- [ ] Pulizia backup files (.backup, .edit, .encrypted)

**✅ crypto-js installato con --legacy-peer-deps**
