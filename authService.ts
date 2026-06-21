// src/services/authService.ts
// Gestione account: registrazione con TOTP, login, logout

import { Auth, Firestore, Collections } from './firebase';
import CryptoJS from 'crypto-js';
import { Secret, TOTP } from 'otpauth';
import EncryptedStorage from './secureStorage';
import * as LocalAuthentication from 'expo-local-authentication';

// ──────────────────────────────────────────────
// Tipi
// ──────────────────────────────────────────────
export interface SayUpUser {
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
  authMethod?: 'totp' | 'password' | 'biometric';
}

const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const TOTP_SECRET_BYTES = 20;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function wordArrayToBytes(wordArray: any) {
  const bytes: number[] = [];
  const { words, sigBytes } = wordArray;
  for (let i = 0; i < sigBytes; i += 1) {
    bytes.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
  }
  return bytes;
}

function bytesToWordArray(bytes: number[]) {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    const wordIndex = i >>> 2;
    const byteOffset = 24 - (i % 4) * 8;
    words[wordIndex] = (words[wordIndex] || 0) | (bytes[i] << byteOffset);
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function base32Encode(bytes: number[]) {
  let value = 0;
  let bits = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(secret: string) {
  const clean = secret.replace(/=+$/g, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let value = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return bytes;
}

function generateRandomBase32Secret() {
  let output = '';
  for (let i = 0; i < 32; i += 1) {
    output += BASE32_ALPHABET[Math.floor(Math.random() * BASE32_ALPHABET.length)];
  }
  return output;
}

function counterToWordArray(counter: number) {
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  const hex = high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0');
  return CryptoJS.enc.Hex.parse(hex);
}

function generateOtp(secret: string, counter: number) {
  const key = bytesToWordArray(base32Decode(secret));
  const message = counterToWordArray(counter);
  const hmac = CryptoJS.HmacSHA1(message, key);
  const hash = wordArrayToBytes(hmac);
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

function validateOtp(secret: string, code: string, window = 1) {
  const normalized = code.trim().replace(/\D/g, '');
  const totp = new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });
  return totp.validate({ token: normalized, window }) !== null;
}

function buildOtpAuthUri(nickname: string, secret: string) {
  const totp = new TOTP({
    issuer: 'SayUp',
    label: nickname,
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });
  return totp.toString();
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

  const secret = generateRandomBase32Secret();
  const qrUri = buildOtpAuthUri(nickname, secret);

  console.log('[TOTP] generate secret', {
    nickname: nickname.trim().toLowerCase(),
    secretLength: secret.length,
    secretPreview: secret.slice(0, 8),
    qrUri,
  });

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
  const normalized = code.trim().replace(/\D/g, '');
  const previewTotp = new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });
  const expectedNow = previewTotp.generate();
  const result = validateOtp(secret, normalized, 1);
  console.log('[TOTP] verify pending', {
    code: normalized,
    expectedNow,
    secretLength: secret.length,
    result,
  });
  return result;
}

// ──────────────────────────────────────────────
// Registrazione completa:
// 1. Crea account Firebase con email derivata
// 2. Salva profilo su Firestore
// 3. Persiste il segreto TOTP cifrato
// ──────────────────────────────────────────────
export async function registerWithTOTP(
  nickname:    string,
  profileData: Partial<SayUpUser>,
): Promise<SayUpUser> {
  const cleanNickname = nickname.trim().toLowerCase();
  const available = await isNicknameAvailable(cleanNickname);
  if (!available) {
    throw new Error('Questo nickname e gia in uso');
  }

  const secret = await EncryptedStorage.getItem('totp_secret_pending');
  if (!secret) throw new Error('Dati di sicurezza mancanti. Ricomincia la registrazione.');

  // Deriva la password dal segreto (stessa logica del login)
  const internalPassword = secret + 'SayUpApp1!'; 

  // Email interna derivata dal nickname (non esposta all'utente)
  const internalEmail = `${cleanNickname}@sayup.internal`;

  const { user } = await Auth.createUserWithEmailAndPassword(internalEmail, internalPassword);

  if (secret) {
    // Sposta il segreto nella storage permanente dell'utente
    await EncryptedStorage.setItem(`totp_secret_${user.uid}`, secret);
    await EncryptedStorage.removeItem('totp_secret_pending');
  }

  const newUser: SayUpUser = {
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

  console.log('[TOTP] register completed', {
    uid: user.uid,
    nickname: cleanNickname,
    hasSecret: !!secret,
  });

  return newUser;
}

// ──────────────────────────────────────────────
// Login: verifica OTP poi accede con Firebase
// ──────────────────────────────────────────────
export async function loginWithTOTP(
  nickname: string,
  code:     string,
): Promise<SayUpUser> {
  const internalEmail = `${nickname.toLowerCase()}@sayup.internal`;
  
  // Tenta di recuperare il profilo per ottenere l'UID (necessario per trovare il segreto)
  const userQuery = await Firestore.collection(Collections.USERS)
    .where('nickname', '==', nickname.toLowerCase())
    .limit(1)
    .get();

  if (userQuery.empty) throw new Error('Non esiste un account con questo nickname');
  const userData = userQuery.docs[0].data() as SayUpUser;

  // Recupera il segreto: prima prova in locale, se manca lo prende dal profilo (Firestore)
  let secret: string | null = await EncryptedStorage.getItem(`totp_secret_${userData.uid}`);
  if (!secret) secret = userData.totpSecret ?? null;

  if (!secret) throw new Error('Segreto TOTP non trovato');

  const normalized = code.trim().replace(/\D/g, '');
  const previewTotp = new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });
  const expectedNow = previewTotp.generate();
  const result = validateOtp(secret, normalized, 1);
  console.log('[TOTP] login verify', {
    nickname: nickname.trim().toLowerCase(),
    code: normalized,
    expectedNow,
    secretLength: secret.length,
    result,
  });

  if (!result) {
    throw new Error('Codice OTP non valido');
  }
  
  const internalPassword = secret + 'SayUpApp1!'; 
  
  const { user } = await Auth.signInWithEmailAndPassword(internalEmail, internalPassword);

  return userData;
}

// ──────────────────────────────────────────────
// Ottieni il profilo utente corrente
// ──────────────────────────────────────────────
export async function getCurrentUserProfile(): Promise<SayUpUser | null> {
  const user = Auth.currentUser;
  if (!user) return null;

  const doc = await Firestore.collection(Collections.USERS).doc(user.uid).get();
  return doc.exists ? (doc.data() as SayUpUser) : null;
}

// ──────────────────────────────────────────────
// Aggiorna profilo
// ──────────────────────────────────────────────
export async function updateUserProfile(
  uid:     string,
  updates: Partial<SayUpUser>,
): Promise<void> {
  await Firestore.collection(Collections.USERS).doc(uid).update(updates);
}

export async function searchUsers(query: string): Promise<SayUpUser[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Ricerca per prefisso sul nickname (case-insensitive perché salvati in minuscolo)
  const snap = await Firestore.collection(Collections.USERS)
    .where('nickname', '>=', q)
    .where('nickname', '<=', q + '\uf8ff')
    .limit(20)
    .get();

  return snap.docs.map((doc: any) => ({ uid: doc.id, ...doc.data() }) as SayUpUser);
}

export async function registerWithPassword(
  nickname: string,
  passwordCustom: string,
  profileData: Partial<SayUpUser>,
): Promise<SayUpUser> {
  const cleanNickname = nickname.trim().toLowerCase();
  const available = await isNicknameAvailable(cleanNickname);
  if (!available) {
    throw new Error('Questo nickname è già in uso');
  }

  const internalEmail = `${cleanNickname}@sayup.internal`;
  const { user } = await Auth.createUserWithEmailAndPassword(internalEmail, passwordCustom);

  const newUser: SayUpUser = {
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
    authMethod:  'password',
  };

  await Firestore.collection(Collections.USERS).doc(user.uid).set(newUser);
  return newUser;
}

export async function registerWithBiometrics(
  nickname: string,
  profileData: Partial<SayUpUser>,
): Promise<SayUpUser> {
  const cleanNickname = nickname.trim().toLowerCase();

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    throw new Error('Autenticazione biometrica non supportata o non configurata su questo dispositivo.');
  }

  const authResult = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Registra la tua Passkey biometrica per SayUp',
    cancelLabel: 'Annulla',
  });

  if (!authResult.success) {
    throw new Error('Registrazione biometrica annullata o fallita.');
  }

  const available = await isNicknameAvailable(cleanNickname);
  if (!available) {
    throw new Error('Questo nickname è già in uso');
  }

  const internalEmail = `${cleanNickname}@sayup.internal`;
  const randomPassword = CryptoJS.lib.WordArray.random(32).toString() + 'SayUpBiometrics1!';
  const { user } = await Auth.createUserWithEmailAndPassword(internalEmail, randomPassword);

  // Salva la password locale
  await EncryptedStorage.setItem(`biometric_nickname_key_${cleanNickname}`, randomPassword);

  const newUser: SayUpUser = {
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
    authMethod:  'biometric',
  };

  await Firestore.collection(Collections.USERS).doc(user.uid).set(newUser);
  return newUser;
}

export async function loginWithPassword(nickname: string, passwordCustom: string): Promise<SayUpUser> {
  const cleanNickname = nickname.trim().toLowerCase();
  const internalEmail = `${cleanNickname}@sayup.internal`;

  const userQuery = await Firestore.collection(Collections.USERS)
    .where('nickname', '==', cleanNickname)
    .limit(1)
    .get();

  if (userQuery.empty) throw new Error('Non esiste un account con questo nickname');
  const userData = userQuery.docs[0].data() as SayUpUser;

  await Auth.signInWithEmailAndPassword(internalEmail, passwordCustom);
  return userData;
}

export async function loginWithBiometrics(nickname: string): Promise<SayUpUser> {
  const cleanNickname = nickname.trim().toLowerCase();
  
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    throw new Error('Autenticazione biometrica non disponibile o non configurata.');
  }

  const authResult = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Accedi a SayUp con la tua Passkey biometrica',
    cancelLabel: 'Annulla',
  });

  if (!authResult.success) {
    throw new Error('Autenticazione biometrica fallita');
  }

  const storedPassword = await EncryptedStorage.getItem(`biometric_nickname_key_${cleanNickname}`);
  if (!storedPassword) {
    throw new Error('Nessuna credenziale biometrica salvata per questo nickname su questo dispositivo.');
  }

  const internalEmail = `${cleanNickname}@sayup.internal`;
  const userQuery = await Firestore.collection(Collections.USERS)
    .where('nickname', '==', cleanNickname)
    .limit(1)
    .get();

  if (userQuery.empty) throw new Error('Non esiste un account con questo nickname');
  const userData = userQuery.docs[0].data() as SayUpUser;

  await Auth.signInWithEmailAndPassword(internalEmail, storedPassword);
  return userData;
}

export async function logout(): Promise<void> {
  await Auth.signOut();
}
