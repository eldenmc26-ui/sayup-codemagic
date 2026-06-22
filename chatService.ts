import { Auth, Firestore, Database, Collections, RTDBPaths, Storage, FirestoreFieldValue } from './firebase';
import CryptoJS from 'crypto-js';
import { Platform, DeviceEventEmitter, Alert } from 'react-native';

let webrtcModulePromise: Promise<any> | null = null;
function getWebRTC() {
  if (!webrtcModulePromise) {
    webrtcModulePromise = import('react-native-webrtc');
  }
  return webrtcModulePromise;
}

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
  type?: 'text' | 'image';
}

export function subscribeChats(
  callback: (chats: TalksyChat[]) => void,
  onError?: () => void,
): () => void {
  const uid = Auth.currentUser?.uid;
  if (!uid) return () => {};

  return Firestore.collection(Collections.CHATS)
    .where('participants', 'array-contains', uid)
    .onSnapshot(
      (snap: any) => {
        const chats = snap.docs.map((doc: any) => {
          const data = doc.data();
          const chatKey = data.chatKey;
          let lastMessage = data.lastMessage;
          if (chatKey && lastMessage) {
            try {
              const decrypted = CryptoJS.AES.decrypt(lastMessage, chatKey).toString(CryptoJS.enc.Utf8);
              if (decrypted) {
                lastMessage = decrypted;
              }
            } catch (e) {
              // Fallback se il messaggio era in chiaro (retrocompatibilità)
            }
          }
          return {
            id: doc.id,
            ...data,
            lastMessage,
          };
        }) as TalksyChat[];
        callback(chats);
      },
      () => {
        onError?.();
      }
    );
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
    Firestore.collection(Collections.CHATS).doc(chatId).get().then((chatDoc: any) => {
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

  const lastMessageText = type === 'image' ? '📷 Immagine' : content.slice(0, 30);
  const encryptedLastMessage = CryptoJS.AES.encrypt(lastMessageText, chatKey).toString();

  await Database.ref(RTDBPaths.messages(chatId)).push(msgData);
  await Firestore.collection(Collections.CHATS).doc(chatId).update({
    lastMessage: encryptedLastMessage,
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

export async function ensureChatParticipants(chatId: string): Promise<void> {
  const doc = await Firestore.collection(Collections.CHATS).doc(chatId).get();
  if (!doc.exists) return;
  const participants = doc.data()?.participants || [];
  const participantsObj: Record<string, boolean> = {};
  participants.forEach((uid: string) => {
    participantsObj[uid] = true;
  });
  await Database.ref(`chatParticipants/${chatId}`).set(participantsObj);
}

export interface CallSession {
  callerId: string;
  callerName?: string;
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
  
  try {
    const { RTCPeerConnection, mediaDevices, RTCSessionDescription, RTCIceCandidate } = await getWebRTC();
    const callRef = Firestore.collection(Collections.CALL_HISTORY).doc();
    const callData: CallSession = { 
      chatId, 
      participants: [...new Set([...participants, myUid])], 
      callerId: myUid,
      callerName: Auth.currentUser?.displayName || 'Qualcuno',
      groupName: groupName || 'Chiamata vocale',
      status: 'dialing', 
      createdAt: Date.now(),
      type: 'voice'
    };

    // Inizializza PeerConnection per creare l'offerta (CHIAMANTE)
    const pc: any = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.ontrack = (event: any) => {
      console.log('[WebRTC] Caller riceve track remoto');
    };

    // Ottieni stream audio locale e aggiungilo alla PeerConnection
    const stream = (await mediaDevices.getUserMedia({ audio: true, video: false })) as any;
    stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

    // Salva ICE candidates locali su Firestore
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        callRef.collection('callerCandidates').add(event.candidate.toJSON());
      }
    };

    // Salva record chiamata + offerta SDP su Firestore prima di avviare i listener,
    // in modo che le regole di sicurezza (che controllano l'esistenza del documento padre) passino correttamente.
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await callRef.set({
      ...callData,
      offer: { sdp: offer.sdp, type: offer.type }
    });

    console.log('[WebRTC] Signaling document creato:', callRef.id);

    // Ascolta Answer e ICE candidates del destinatario
    const unsub1 = callRef.onSnapshot(
      async (snapshot: any) => {
        if (!snapshot) return;
        const data = snapshot.data();
        if (data?.answer && !pc.remoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          DeviceEventEmitter.emit('ON_CALL_ACTIVE', { id: callRef.id });
        }
        if (data?.status === 'ended') {
          pc.close();
          stream.getTracks().forEach((t: any) => t.stop());
          DeviceEventEmitter.emit('ON_CALL_ENDED', { id: callRef.id });
        }
      },
      (error: any) => {
        console.log('[WebRTC] callRef snapshot error:', error.message);
      }
    );

    const unsub2 = callRef.collection('calleeCandidates').onSnapshot(
      (snap: any) => {
        if (!snap || typeof snap.docChanges !== 'function') return;
        snap.docChanges().forEach(async (change: any) => {
          if (change.type === 'added') {
            await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      },
      (error: any) => {
        console.log('[WebRTC] calleeCandidates snapshot error:', error.message);
      }
    );

    DeviceEventEmitter.emit('ON_OUTGOING_CALL', { 
      ...callData, 
      id: callRef.id,
      pc,
      stream,
      unsub1,
      unsub2
    });
  } catch (e) {
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
  await ensureChatParticipants(chatId);
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