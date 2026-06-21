// src/services/notificationService.ts
// Gestione notifiche push Firebase Cloud Messaging per Talksy
// Supporta Android e iOS

import { Platform } from 'react-native';
import { Firestore, Auth, Messaging } from './firebase';
import RNCallKeep from 'react-native-callkeep';

// ── Tipi ────────────────────────────────────────
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ── Richiedi permesso notifiche ─────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || !Messaging) return false;

  if (Platform.OS === 'ios') {
    // Su iOS richiede il permesso esplicito all'utente
    const authStatus = await Messaging.requestPermission();
    return (
      authStatus === 1 || // AUTHORIZED
      authStatus === 2    // PROVISIONAL
    );
  }

  // Android: su API < 33 il permesso è implicito,
  // su API 33+ requestPermission() mostra il dialog
  const authStatus = await Messaging.requestPermission();
  return (
    authStatus === 1 ||
    authStatus === 2
  );
}

// ── Ottieni e registra FCM token ────────────────
export async function registerFCMToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Messaging) return null;

  const enabled = await requestNotificationPermission();
  if (!enabled) {
    console.log('[FCM] Permesso notifiche negato');
    return null;
  }

  try {
    const token = await Messaging.getToken();
    if (token) {
      await saveFCMToken(token);
      console.log('[FCM] Token registrato:', token);
    }
    return token;
  } catch (err) {
    console.error('[FCM] Errore registrazione token:', err);
    return null;
  }
}

// ── Salva token su Firestore ────────────────────
async function saveFCMToken(token: string): Promise<void> {
  const uid = Auth.currentUser?.uid;
  if (!uid) return;
  try {
    await Firestore.collection('users').doc(uid).update({ fcmToken: token });
  } catch (err) {
    console.error('[FCM] Errore salvataggio token:', err);
  }
}

// ── Ascolta aggiornamenti token ─────────────────
export function listenTokenRefresh(): () => void {
  if (Platform.OS === 'web' || !Messaging) return () => {};

  return Messaging.onTokenRefresh(async (token: string) => {
    console.log('[FCM] Token aggiornato:', token);
    await saveFCMToken(token);
  });
}

// ── Ascolta messaggi in foreground ──────────────
export function listenForegroundMessages(
  onMessage: (payload: NotificationPayload) => void,
): () => void {
  if (Platform.OS === 'web' || !Messaging) return () => {};

  return Messaging.onMessage(async (remoteMessage: any) => {
    console.log('[FCM] Messaggio foreground:', remoteMessage);
    
    const { type, callerName, chatId } = remoteMessage.data as Record<string, string> || {};

    // Logica specifica per tipo
    if (type === 'call' && Platform.OS !== 'web') {
      RNCallKeep.displayIncomingCall(chatId, callerName || 'SayUp', callerName || 'Chiamata');
      return; // Non mostriamo l'alert se è una chiamata, ci pensa CallKeep
    }

    onMessage({
      title: remoteMessage.notification?.title ?? 'SayUp',
      body: remoteMessage.notification?.body ?? '',
      data: remoteMessage.data,
    });
  });
}

// ── Ascolta notifica aperta dall'utente ─────────
export function listenNotificationOpenedApp(
  onOpen: (data: Record<string, string>) => void,
): () => void {
  if (Platform.OS === 'web' || !Messaging) return () => {};

  return Messaging.onNotificationOpenedApp((remoteMessage: any) => {
    console.log('[FCM] Notifica aperta:', remoteMessage);
    onOpen(remoteMessage?.data ?? {});
  });
}

// ── Ottieni la notifica che ha aperto l'app (killed state)
export async function getInitialNotification(): Promise<Record<string, string> | null> {
  if (Platform.OS === 'web' || !Messaging) return null;

  const remoteMessage = await Messaging.getInitialNotification();
  return remoteMessage?.data ?? null;
}

// ── Invia notifica a un utente specifico ────────
export async function sendNotificationToUser(
  targetUid: string,
  payload: { title: string; body: string; type: string; data?: any },
): Promise<void> {
  await Firestore.collection('notifications').add({
    ...payload,
    targetUid,
    read: false,
    createdAt: Date.now(),
  });
}
