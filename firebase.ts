// src/services/firebase.ts
// Configurazione centrale Firebase per Talksy

import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: 'AIzaSyDQotKXNKbJS3F-LbMohD-P2cf-zgUdAGw',
  authDomain: 'talksy-social.firebaseapp.com',
  projectId: 'talksy-social',
  storageBucket: 'talksy-social.firebasestorage.app',
  messagingSenderId: '135500991526',
  appId: '1:135500991526:web:191972e6473581b1686ae7',
  measurementId: 'G-0TVDGFGDDX',
  databaseURL: 'https://talksy-social-default-rtdb.europe-west1.firebasedatabase.app/',
};

type FirebaseCompat = {
  apps: Array<unknown>;
  initializeApp: (config: typeof firebaseConfig) => unknown;
  app: () => unknown;
  auth: () => any;
  firestore: () => any;
  database: () => any;
  storage: () => any;
  messaging?: () => any;
};

let firebase: any;
let Auth: any;
let Firestore: any;
let Database: any;
let Storage: any;
let Messaging: any;
let FirestoreFieldValue: any;

if (Platform.OS === 'web') {
  const firebaseWeb = require('firebase/compat/app').default as FirebaseCompat;
  require('firebase/compat/auth');
  require('firebase/compat/firestore');
  require('firebase/compat/database');
  require('firebase/compat/storage');

  if (!firebaseWeb.apps.length) {
    firebaseWeb.initializeApp(firebaseConfig);
  }

  firebase = firebaseWeb;
  Auth = firebaseWeb.auth();
  Firestore = firebaseWeb.firestore();
  Database = firebaseWeb.database();
  Storage = firebaseWeb.storage();
  Messaging = null;
  FirestoreFieldValue = (firebaseWeb.firestore as any).FieldValue;
} else {
  const firebaseNative = require('@react-native-firebase/app').default;
  const authNative = require('@react-native-firebase/auth').default;
  const firestoreNative = require('@react-native-firebase/firestore').default;
  const databaseNative = require('@react-native-firebase/database').default;
  const storageNative = require('@react-native-firebase/storage').default;
  const messagingNative = require('@react-native-firebase/messaging').default;

  firebase = firebaseNative;
  Auth = authNative();
  Firestore = firestoreNative();
  Database = databaseNative();
  Storage = storageNative();
  Messaging = messagingNative();
  FirestoreFieldValue = firestoreNative.FieldValue;
}

export { Auth, Firestore, Database, Storage, Messaging, FirestoreFieldValue };

export const Collections = {
  USERS: 'users',
  NEWS: 'news',
  CHATS: 'chats',
  CALL_HISTORY: 'call_history',
} as const;

export const RTDBPaths = {
  messages: (chatId: string) => `chats/${chatId}/messages`,
  presence: (uid: string) => `presence/${uid}`,
  typing: (chatId: string) => `chats/${chatId}/typing`,
  call: (chatId: string) => `chats/${chatId}/call`,
  iceCandidates: (chatId: string, uid: string) => `chats/${chatId}/call/candidates/${uid}`,
  signaling: (chatId: string) => `chats/${chatId}/call/signaling`,
} as const;

export default firebase;
