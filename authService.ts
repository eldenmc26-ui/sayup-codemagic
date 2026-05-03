// src/services/authService.ts
// Gestione account: registrazione con TOTP, login, logout

import { Auth, Firestore, Collections } from './firebase';
import { TOTP } from 'otpauth';
import EncryptedStorage from './secureStorage';

// ──────────────────────────────────────────────
// Tipi
// ──────────────────────────────────────────────
export interface TalksyUser {
  uid:       string;
  nickname:  string;
  displayName: string;
  bio:       string;
  photoURL:  string | null;
  friends: string[];
  incomingFriendRequests: string[];
  outgoingFriendRequests: string[];
  isAdmin:   boolean;
  createdAt: number;
  fcmToken?: string;
  totpSecret?: string; // Aggiunto per permettere l'accesso da più dispositivi
}

export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  const cleanNickname = nickname.trim().toLowerCase();
  const existing = await Firestore
    .collection(Collections.USERS)
    .where('nickname', '==', cleanNickname)
    .limit(1)
    .get();

  return existing.empty;
}

// ──────────────────────────────────────────────
// Genera un segreto TOTP + QR code URI
// da mostrare all'utente per scansionare con
// Google Authenticator
// ──────────────────────────────────────────────
export async function generateTOTPSecret(nickname: string): Promise<{
  secret: string;
  qrUri:  string;
}> {
  const available = await isNicknameAvailable(nickname);
  if (!available) {
    throw new Error('Questo nickname e gia in uso');
  }

  const totp = new TOTP({
    issuer:    'Talksy',
    label:     nickname,
    algorithm: 'SHA1',
    digits:    6,
    period:    30,
  });

  const secret = totp.secret.base32;
  const qrUri  = totp.toString(); // otpauth:// URI da passare a QRCode

  // Salva il segreto temporaneamente durante la registrazione
  await EncryptedStorage.setItem('totp_secret_pending', secret);

  return { secret, qrUri };
}

// ──────────────────────────────────────────────
// Verifica il codice OTP inserito dall'utente
// ──────────────────────────────────────────────
export async function verifyTOTPCode(code: string): Promise<boolean> {
  const secret = await EncryptedStorage.getItem('totp_secret_pending');
  if (!secret) throw new Error('Nessun segreto TOTP in attesa');

  const totp  = new TOTP({ secret, algorithm: 'SHA1', digits: 6, period: 30 });
  const delta = totp.validate({ token: code, window: 2 }); // FIX: finestra ±60s per tolleranza orario

  return delta !== null;
}

// ──────────────────────────────────────────────
// Registrazione completa:
// 1. Crea account Firebase con email derivata
// 2. Salva profilo su Firestore
// 3. Persiste il segreto TOTP cifrato
// ──────────────────────────────────────────────
export async function registerWithTOTP(
  nickname:    string,
  profileData: Partial<TalksyUser>,
): Promise<TalksyUser> {
  const cleanNickname = nickname.trim().toLowerCase();
  const available = await isNicknameAvailable(cleanNickname);
  if (!available) {
    throw new Error('Questo nickname e gia in uso');
  }

  const secret = await EncryptedStorage.getItem('totp_secret_pending');
  if (!secret) throw new Error('Dati di sicurezza mancanti. Ricomincia la registrazione.');

  // Deriva la password dal segreto (stessa logica del login)
  const internalPassword = secret + 'Talksy1!'; 

  // Email interna derivata dal nickname (non esposta all'utente)
  const internalEmail = `${cleanNickname}@talksy.internal`;

  const { user } = await Auth.createUserWithEmailAndPassword(internalEmail, internalPassword);

  if (secret) {
    // Sposta il segreto nella storage permanente dell'utente
    await EncryptedStorage.setItem(`totp_secret_${user.uid}`, secret);
    await EncryptedStorage.removeItem('totp_secret_pending');
  }

  const newUser: TalksyUser = {
    uid:         user.uid,
    nickname:    cleanNickname,
    displayName: (profileData.displayName || nickname.trim()).slice(0, 50),
    bio:         profileData.bio         ?? '',
    photoURL:    null,
    friends:     [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    isAdmin:     false,
    createdAt:   Date.now(),
    totpSecret:  secret || '', // Assicura che totpSecret non sia mai undefined per Firestore
  };

  await Firestore.collection(Collections.USERS).doc(user.uid).set(newUser);

  return newUser;
}

// ──────────────────────────────────────────────
// Login: verifica OTP poi accede con Firebase
// ──────────────────────────────────────────────
export async function loginWithTOTP(
  nickname: string,
  code:     string,
): Promise<TalksyUser> {
  const internalEmail = `${nickname.toLowerCase()}@talksy.internal`;
  
  // Tenta di recuperare il profilo per ottenere l'UID (necessario per trovare il segreto)
  const userQuery = await Firestore.collection(Collections.USERS)
    .where('nickname', '==', nickname.toLowerCase())
    .limit(1)
    .get();

  if (userQuery.empty) throw new Error('Non esiste un account con questo nickname');
  const userData = userQuery.docs[0].data() as TalksyUser;

  // Recupera il segreto: prima prova in locale, se manca lo prende dal profilo (Firestore)
  let secret = await EncryptedStorage.getItem(`totp_secret_${userData.uid}`);
  if (!secret) secret = userData.totpSecret;

  if (!secret) throw new Error('Segreto TOTP non trovato');

  const totp  = new TOTP({ secret, algorithm: 'SHA1', digits: 6, period: 30 });
  const valid = totp.validate({ token: code, window: 2 }); // FIX: finestra ±60s

  if (valid === null) {
    throw new Error('Codice OTP non valido');
  }

  // Usiamo il segreto stesso come password interna per Firebase
  // ATTENZIONE: Per una sicurezza robusta in produzione, l'approccio ideale per il login "passwordless" con TOTP
  // sarebbe usare Firebase Custom Authentication. Il tuo backend verificherebbe il codice TOTP e poi
  // conierebbe un token Firebase personalizzato per l'app. Questo evita di derivare una password
  // da un segreto memorizzato localmente, che, seppur cifrato, è un punto di vulnerabilità maggiore
  // rispetto a un token di sessione di breve durata.
  const internalPassword = secret + 'Talksy1!'; 
  
  const { user } = await Auth.signInWithEmailAndPassword(internalEmail, internalPassword);

  return userData;
}

// ──────────────────────────────────────────────
// Ottieni il profilo utente corrente
// ──────────────────────────────────────────────
export async function getCurrentUserProfile(): Promise<TalksyUser | null> {
  const user = Auth.currentUser;
  if (!user) return null;

  const doc = await Firestore.collection(Collections.USERS).doc(user.uid).get();
  return doc.exists ? (doc.data() as TalksyUser) : null;
}

// ──────────────────────────────────────────────
// Aggiorna profilo
// ──────────────────────────────────────────────
export async function updateUserProfile(
  uid:     string,
  updates: Partial<TalksyUser>,
): Promise<void> {
  await Firestore.collection(Collections.USERS).doc(uid).update(updates);
}

export async function searchUsers(query: string): Promise<TalksyUser[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Ricerca per prefisso sul nickname (case-insensitive perché salvati in minuscolo)
  const snap = await Firestore.collection(Collections.USERS)
    .where('nickname', '>=', q)
    .where('nickname', '<=', q + '\uf8ff')
    .limit(20)
    .get();

  return snap.docs.map(doc => doc.data() as TalksyUser);
}

export async function logout(): Promise<void> {
  await Auth.signOut();
}
