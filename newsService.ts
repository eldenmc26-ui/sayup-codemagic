// src/services/newsService.ts
import { Firestore, Collections, Auth, FirestoreFieldValue } from './firebase';
import type { TalksyUser } from './authService';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  category: string;
  url: string;
  imageUrl: string | null;
  createdAt: number;
  createdBy: string;
  likes?: Record<string, boolean>;
  commentsCount?: number;
}

export interface NewsComment {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: number;
}

export type Comment = NewsComment;

export function subscribeToNews(
  callback: (news: NewsItem[]) => void,
  onError?: () => void,
): () => void {
  const query = Firestore.collection(Collections.NEWS)
    .orderBy('createdAt', 'desc')
    .limit(50);

  const unsub = query.onSnapshot(
    (snap: any) => {
      const items = snap.docs.map((d: any) => d.data() as NewsItem);
      callback(items);
    },
    () => {
      onError?.();
    },
  );

  return unsub;
}

export function subscribeNewsItem(
  newsId: string,
  callback: (item: NewsItem | null) => void,
): () => void {
  return Firestore.collection(Collections.NEWS).doc(newsId).onSnapshot((snap: any) => {
    callback(snap.exists ? (snap.data() as NewsItem) : null);
  });
}

// Crea una news (solo admin)
export async function createNews(
  title: string,
  description: string,
  source: string,
  category: string,
  url: string,
  imageUrl: string | null,
): Promise<void> {
  const ref = Firestore.collection(Collections.NEWS).doc();
  const item: NewsItem = {
    id: ref.id,
    title,
    description,
    source,
    category,
    url,
    imageUrl,
    createdAt: Date.now(),
    createdBy: Auth.currentUser!.uid,
    likes: {},
    commentsCount: 0,
  };
  await ref.set(item);

  const allUsers = await Firestore.collection(Collections.USERS).get();
  for (const doc of allUsers.docs) {
    const user = doc.data() as TalksyUser;
    if (user.fcmToken) {
      await Firestore.collection('notifications').add({
        title: 'Nuova news su Talksy!',
        body: `${title} — ${category}`,
        type: 'news',
        targetUid: user.uid,
        read: false,
        createdAt: Date.now(),
      });
    }
  }
}

export async function updateNews(
  newsId: string,
  updates: Partial<Pick<NewsItem, 'title' | 'description' | 'source' | 'category' | 'url' | 'imageUrl'>>,
): Promise<void> {
  await Firestore.collection(Collections.NEWS).doc(newsId).update(updates);
}

// Elimina una news (solo admin o creatore)
export async function deleteNews(newsId: string): Promise<void> {
  await Firestore.collection(Collections.NEWS).doc(newsId).delete();
}

// Like / Unlike
export async function toggleLike(newsId: string, uid: string): Promise<void> {
  const ref = Firestore.collection(Collections.NEWS).doc(newsId);
  const doc = await ref.get();
  if (!doc.exists) return;

  const likes = (doc.data()?.likes ?? {}) as Record<string, boolean>;
  if (likes[uid]) {
    await ref.update({ [`likes.${uid}`]: FirestoreFieldValue.delete() });
  } else {
    await ref.update({ [`likes.${uid}`]: true });
  }
}

// Aggiungi commento
export async function addComment(
  newsId: string,
  text: string,
  authorUid?: string,
  authorName?: string,
): Promise<void> {
  const resolvedUid = authorUid ?? Auth.currentUser!.uid;
  const resolvedName = authorName?.trim() || null;

  let fallbackName = resolvedName;
  if (!fallbackName) {
    const myDoc = await Firestore.collection(Collections.USERS).doc(resolvedUid).get();
    const myUser = myDoc.data() as TalksyUser | undefined;
    fallbackName = myUser?.displayName || myUser?.nickname || 'Utente';
  }

  const ref = Firestore.collection(Collections.NEWS).doc(newsId).collection('comments').doc();
  const comment: NewsComment = {
    id: ref.id,
    authorUid: resolvedUid,
    authorName: fallbackName,
    text: text.trim(),
    createdAt: Date.now(),
  };
  await ref.set(comment);

  await Firestore.collection(Collections.NEWS).doc(newsId).update({
    commentsCount: FirestoreFieldValue.increment(1),
  });
}

// Sottoscrivi commenti
export function subscribeComments(
  newsId: string,
  callback: (comments: NewsComment[]) => void,
): () => void {
  return Firestore.collection(Collections.NEWS).doc(newsId).collection('comments')
    .orderBy('createdAt', 'asc')
    .onSnapshot((snap: any) => {
      const comments = snap.docs.map((d: any) => d.data() as NewsComment);
      callback(comments);
    });
}

// Elimina commento
export async function deleteComment(newsId: string, commentId: string): Promise<void> {
  await Firestore.collection(Collections.NEWS).doc(newsId).collection('comments').doc(commentId).delete();
  await Firestore.collection(Collections.NEWS).doc(newsId).update({
    commentsCount: FirestoreFieldValue.increment(-1),
  });
}
