import { Auth, Firestore, Collections, FirestoreFieldValue } from './firebase';
import type { TalksyUser } from './authService';

export function subscribeFriends(callback: (friends: TalksyUser[]) => void, onError: () => void) {
  const uid = Auth.currentUser?.uid;
  if (!uid) return () => {};

  return Firestore.collection(Collections.USERS)
    .doc(uid)
    .onSnapshot(async (doc: any) => {
      const data = doc.data();
      const friendIds = data?.friends || [];
      if (friendIds.length === 0) return callback([]);

      // Recupera i dettagli di ogni amico
      const friendsQuery = await Firestore.collection(Collections.USERS)
        .where('uid', 'in', friendIds)
        .get();
      
      callback(friendsQuery.docs.map((d: any) => d.data() as TalksyUser));
    }, onError);
}

export async function sendFriendRequest(recipientUid: string): Promise<void> {
  const currentUser = Auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated.');
  }

  // Add to recipient's incoming requests
  await Firestore.collection(Collections.USERS).doc(recipientUid).update({
    incomingFriendRequests: FirestoreFieldValue.arrayUnion(currentUser.uid),
  });

  // Add to sender's outgoing requests
  await Firestore.collection(Collections.USERS).doc(currentUser.uid).update({
    outgoingFriendRequests: FirestoreFieldValue.arrayUnion(recipientUid),
  });

  // Invia notifica
  await Firestore.collection('notifications').add({
    targetUid: recipientUid,
    title: 'Richiesta di amicizia in arrivo',
    body: `${Auth.currentUser?.displayName || 'Un utente'} ti ha mandato una richiesta di amicizia`,
    type: 'friend_request',
    data: { senderId: currentUser.uid },
    createdAt: Date.now(),
  });
}

export async function acceptFriendRequest(senderUid: string): Promise<void> {
  const currentUser = Auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated.');
  }

  const batch = Firestore.batch();

  // Rimuovi dalla lista di richieste in entrata dell'utente corrente e aggiungi agli amici
  const currentUserRef = Firestore.collection(Collections.USERS).doc(currentUser.uid);
  batch.update(currentUserRef, {
    incomingFriendRequests: FirestoreFieldValue.arrayRemove(senderUid),
    friends: FirestoreFieldValue.arrayUnion(senderUid),
  });

  // Rimuovi dalla lista di richieste in uscita del mittente e aggiungi agli amici
  const senderUserRef = Firestore.collection(Collections.USERS).doc(senderUid);
  batch.update(senderUserRef, {
    outgoingFriendRequests: FirestoreFieldValue.arrayRemove(currentUser.uid),
    friends: FirestoreFieldValue.arrayUnion(currentUser.uid),
  });

  await batch.commit();
}

export async function declineFriendRequest(senderUid: string): Promise<void> {
  const currentUser = Auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated.');
  }

  const batch = Firestore.batch();

  // Remove from current user's incoming requests
  const currentUserRef = Firestore.collection(Collections.USERS).doc(currentUser.uid);
  batch.update(currentUserRef, {
    incomingFriendRequests: FirestoreFieldValue.arrayRemove(senderUid),
  });

  // Remove from sender's outgoing requests
  const senderUserRef = Firestore.collection(Collections.USERS).doc(senderUid);
  batch.update(senderUserRef, {
    outgoingFriendRequests: FirestoreFieldValue.arrayRemove(currentUser.uid),
  });

  await batch.commit();
}

export async function removeFriend(friendUid: string): Promise<void> {
  const currentUser = Auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated.');
  }

  const batch = Firestore.batch();

  // Remove from current user's friends
  const currentUserRef = Firestore.collection(Collections.USERS).doc(currentUser.uid);
  batch.update(currentUserRef, {
    friends: FirestoreFieldValue.arrayRemove(friendUid),
  });

  // Remove current user from friend's friends
  const friendUserRef = Firestore.collection(Collections.USERS).doc(friendUid);
  batch.update(friendUserRef, {
    friends: FirestoreFieldValue.arrayRemove(currentUser.uid),
  });

  await batch.commit();
}
