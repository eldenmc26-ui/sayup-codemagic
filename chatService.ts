import { Auth, Firestore, Database, Collections, RTDBPaths, Storage, FirestoreFieldValue } from './firebase';
import CryptoJS from 'crypto-js';
import { Platform, DeviceEventEmitter, Alert } from 'react-native';

const SendbirdCalls = Platform.OS !== 'web' ? require('@sendbird/calls-react-native').SendbirdCalls : null;

export type Chat = TalksyChat & { isGroup?: boolean; groupName?: string; groupImage?: string | null; unread?: Record<string, number>; lastTs?: number; chatKey?: string };
export interface ChatMessage {
  id: string;
  content: string; // Testo o URL immagine
  type: 'text' | 'image';
  senderUid: string;
  createdAt: number;
}

export interface TalksyChat {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: number;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: number;
}

export function subscribeChats(callback: (chats: TalksyChat[]) => void): () => void {
  const uid = Auth.currentUser?.uid;
  if (!uid) return () => {};

  return Firestore.collection(Collections.CHATS)
    .where('participants', 'array-contains', uid)
    .onSnapshot((snap: any) => {
      const chats = snap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as TalksyChat[];
      callback(chats);
    });
}

function generateAESKey(): string {
  return CryptoJS.lib.WordArray.random(256 / 8).toString(); // Genera una chiave AES a 256 bit
}

export async function getOrCreateChat(otherUid: string): Promise<string> {
  const myUid = Auth.currentUser?.uid;
  if (!myUid) throw new Error('Non autenticato');

  const participants = [myUid, otherUid].sort();
  const query = await Firestore.collection(Collections.CHATS)
    .where('participants', '==', participants)
    .where('isGroup', '==', false)
    .get();

  if (!query.empty) return query.docs[0].id;

  const newChat = await Firestore.collection(Collections.CHATS).add({
    participants,
    isGroup: false,
    updatedAt: Date.now(),
    chatKey: generateAESKey(), // Genera e salva la chiave di chat
  });
  return newChat.id;
}

export async function createGroupChat(name: string, members: string[]): Promise<string> {
  const myUid = Auth.currentUser?.uid;
  if (!myUid) throw new Error('Non autenticato');

  const participants = [...members, myUid];
  const newChat = await Firestore.collection(Collections.CHATS).add({
    participants,
    isGroup: true,
    groupName: name,
    updatedAt: Date.now(),
    chatKey: generateAESKey(), // Genera e salva la chiave di chat per il gruppo
  });
  return newChat.id;
}

export function subscribeToMessages(chatId: string, callback: (msgs: Message[]) => void) {
  const ref = Database.ref(RTDBPaths.messages(chatId));
  ref.on('value', (snapshot: any) => {
    const data = snapshot.val();
    if (!data) {
      return callback([]);
    }
    // Recupera la chiave di chat da Firestore per decrittografare i messaggi
    Firestore.collection(Collections.CHATS).doc(chatId).get().then(chatDoc => {
      const chatKey = chatDoc.data()?.chatKey;
      const msgs = Object.keys(data).map(key => {
        const msg = { id: key, ...data[key] };
        if (chatKey && msg.content) {
          try {
            msg.content = CryptoJS.AES.decrypt(msg.content, chatKey).toString(CryptoJS.enc.Utf8);
          } catch (e) {
            console.error('Decryption failed:', e);
            msg.content = '[Messaggio illeggibile]'; // Fallback per errori di decrittografia
          }
        }
        return msg;
      });
      callback(msgs.sort((a, b) => a.timestamp - b.timestamp));
    });
  });
  return () => ref.off();
}

async function triggerPushNotification(targetUid: string, title: string, body: string, type: string, extraData?: any) {
  // Notifiche disabilitate per piano Spark
  console.log(`[Notifica interna] Per: ${targetUid} - ${title}: ${body}`);
}

export async function sendMessage(chatId: string, content: string, chatKey: string, type: 'text' | 'image' = 'text') {
  const myUid = Auth.currentUser?.uid;
  if (!myUid) return;

  // Recupera i partecipanti per inviare la notifica
  const chatDoc = await Firestore.collection(Collections.CHATS).doc(chatId).get();
  const participants = chatDoc.data()?.participants || [];

  const encryptedContent = CryptoJS.AES.encrypt(content, chatKey).toString();

  const msgData = {
    content: encryptedContent,
    senderId: myUid,
    timestamp: Date.now(),
    type,
  };

  await Database.ref(RTDBPaths.messages(chatId)).push(msgData);
  await Firestore.collection(Collections.CHATS).doc(chatId).update({
    lastMessage: type === 'image' ? '📷 Immagine' : content.slice(0, 30),
    lastTs: Date.now(),
    updatedAt: Date.now(),
  });

  // Notifica gli altri partecipanti
  const otherParticipants = participants.filter((p: string) => p !== myUid);
  const senderName = Auth.currentUser?.displayName || 'Qualcuno';
  for (const uid of otherParticipants) {
    triggerPushNotification(
      uid, 
      senderName, 
      type === 'image' ? '📷 Ti ha inviato una foto' : content.slice(0, 50), 
      'message', 
      { chatId, senderId: myUid }
    );
  }
}

export async function deleteMessage(chatId: string, messageId: string) {
  await Database.ref(RTDBPaths.messages(chatId)).child(messageId).remove();
}

export async function updateMessage(chatId: string, messageId: string, newContent: string, chatKey: string) {
  const encrypted = CryptoJS.AES.encrypt(newContent, chatKey).toString();
  await Database.ref(RTDBPaths.messages(chatId)).child(messageId).update({ content: encrypted, isEdited: true });
}

export async function setTyping(chatId: string, isTyping: boolean) {
  const myUid = Auth.currentUser?.uid;
  if (!myUid) return;
  const ref = Database.ref(RTDBPaths.typing(chatId)).child(myUid);
  if (isTyping) await ref.set(true);
  else await ref.remove();
}

export async function ensureChatParticipants(chatId: string) {
  // Logica opzionale per sincronizzare i permessi RTDB
  return Promise.resolve();
}

export interface CallSession {
  callerId: string;
  participants: string[]; // Supporto per più persone
  status: 'dialing' | 'active' | 'ended';
  type: 'voice' | 'video';
  createdAt: number;
  chatId: string;
  groupName?: string;
}

export async function startVoiceCall(chatId: string, participants: string[], groupName?: string) {
  const myUid = Auth.currentUser?.uid;
  if (!myUid || participants.length === 0) return;

  if (Platform.OS === 'web') throw new Error('Le chiamate non sono supportate su Web');
  
  if (!SendbirdCalls) {
    Alert.alert('Errore modulo', 'Il sistema di chiamata non è disponibile in Expo Go. È necessaria una Development Build.');
    return;
  }

  const otherUid = participants[0]; // Chiamata 1:1 per i test

  try {
    const dialParams = {
      userId: otherUid,
      isVideoCall: false,
      callOption: { audioEnabled: true },
    };

    const call = await SendbirdCalls.dial(dialParams);

    // Avvisa il RootNavigator che abbiamo iniziato una chiamata in uscita
    DeviceEventEmitter.emit('ON_OUTGOING_CALL', call);

    await Firestore.collection(Collections.CALL_HISTORY).add({
      callerId: myUid,
      participants: [myUid, otherUid],
      type: 'voice',
      createdAt: Date.now(),
      groupName: groupName || 'Chiamata vocale',
    });

    return call;
  } catch (e) {
    console.error('[Sendbird] Dial error:', e);
    if (e.message?.includes('not authenticated')) {
      Alert.alert('Errore', 'Il sistema di chiamata non è ancora pronto. Riprova tra un istante.');
    }
    throw e;
  }
}

// --- NUOVE FUNZIONI: GESTIONE CHAT E GRUPPI ---

export async function deleteChat(chatId: string) {
  await Firestore.collection(Collections.CHATS).doc(chatId).delete();
  await Database.ref(`chats/${chatId}`).remove();
}

export async function updateGroupInfo(chatId: string, updates: { groupName?: string, groupImage?: string | null }) {
  await Firestore.collection(Collections.CHATS).doc(chatId).update({
    ...updates,
    updatedAt: Date.now()
  });
}

export async function addParticipantsToGroup(chatId: string, newUids: string[]) {
  const doc = await Firestore.collection(Collections.CHATS).doc(chatId).get();
  if (!doc.exists) return;
  const current = doc.data()?.participants || [];
  const merged = [...new Set([...current, ...newUids])];
  await Firestore.collection(Collections.CHATS).doc(chatId).update({
    participants: merged,
    updatedAt: Date.now()
  });
}

export function subscribeCallHistory(callback: (history: any[]) => void) {
  const uid = Auth.currentUser?.uid;
  if (!uid) return () => {};

  return Firestore.collection(Collections.CALL_HISTORY)
    .where('participants', 'array-contains', uid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .onSnapshot(
      (snap: any) => {
        callback(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
      },
      (error: any) => {
        console.error("⚠️ Errore Indice Firestore (Crea l'indice cliccando il link nei log precedenti):", error);
      }
    );
}