// src/screens/ChatsScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  Image, ScrollView, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getOrCreateChat,
  subscribeChats, // Manteniamo subscribeChats per le chat esistenti
  type Chat, // Manteniamo il tipo Chat
} from './chatService';
import { subscribeFriends, sendFriendRequest, acceptFriendRequest, declineFriendRequest } from './friendService'; // Aggiungi accept/decline
import { searchUsers } from './authService';
import firebase, { Auth } from './firebase'; 
import { setUserOnline, subscribeToUserPresence } from './presenceService';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { TalksyUser } from './authService'; 
import { COLORS } from './theme'; 
import { useStore } from './useStore';
import { useMemo } from 'react';

export default function ChatsScreen() {
  const navigation = useNavigation<any>();
  const searchRef = useRef<TextInput>(null);
  const { user } = useStore();

  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [friends, setFriends] = useState<TalksyUser[]>([]);
  const [searchResults, setSearchResults] = useState<TalksyUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestingUid, setRequestingUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!Auth.currentUser) {
      setChats([]);
      setLoading(false);
      return;
    }

    // Set current user online status and handle disconnect
    setUserOnline(Auth.currentUser.uid);

    const timeout = setTimeout(() => { // Timeout per evitare loader infinito se non ci sono chat
      setLoading(false);
    }, 2500);

    let presenceUnsubs: (() => void)[] = [];
    const unsubscribes: (() => void)[] = [];

    const chatUnsub = subscribeChats(
      (data: Chat[]) => { // Explicitly type 'data'
        clearTimeout(timeout); // Cancella il timeout se le chat arrivano
        setChats(data);
        setLoading(false);

        // Subscribe to presence for all chat participants
        const participantUids = new Set<string>(); // Usa un Set per evitare duplicati
        data.forEach(chat => {
          chat.participants.forEach((p: string) => { // Explicitly type 'p'
            if (p !== Auth.currentUser?.uid) {
              participantUids.add(p);
            }
          });
        });

        presenceUnsubs.forEach(u => u());
        presenceUnsubs = [];

        participantUids.forEach(uid => {
          const unsub = subscribeToUserPresence(uid, (isOnline) => {
            setOnlineStatuses(prev => ({ ...prev, [uid]: isOnline })); // Aggiorna lo stato online
          });
          presenceUnsubs.push(unsub);
        });
      },
      () => {
        clearTimeout(timeout);
        setChats([]);
        setLoading(false);
      },
    );
    unsubscribes.push(chatUnsub);

    const friendsUnsub = subscribeFriends(setFriends, () => setFriends([]));
    unsubscribes.push(friendsUnsub);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      presenceUnsubs.forEach(u => u());
    };
  }, []);

  useEffect(() => {
    // Questo useEffect è stato spostato e integrato nel primo useEffect
    // per gestire le sottoscrizioni in un unico punto.
  }, []); // Rimosso, la logica è nel primo useEffect

  useEffect(() => {
    const query = searchQ.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchUsers(query);
        setSearchResults(
          found.filter((candidate: TalksyUser) => candidate.uid !== Auth.currentUser?.uid), // Explicitly type 'candidate'
        );
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQ]);

  async function openChat(otherUid: string) {
    try {
      const chatId = await getOrCreateChat(otherUid);
      setSearchQ(''); // Pulisci la ricerca dopo aver aperto la chat
      setSearchResults([]);
      navigation.navigate('ChatRoom', { chatId });
    } catch (error: any) {
      Alert.alert('Errore', error?.message ?? 'Impossibile aprire la chat.');
    }
  }

  async function handleSendFriendRequest(otherUid: string) {
    setRequestingUid(otherUid);
    try {
      await sendFriendRequest(otherUid);
      Alert.alert('Richiesta inviata', 'La richiesta di amicizia è stata inviata.');
      // Aggiorna lo stato locale dell'utente per riflettere la richiesta inviata
      if (user) {
        setUser({
          ...user,
          outgoingFriendRequests: [...(user.outgoingFriendRequests || []), otherUid],
        });
      }
      // Rimuovi l'utente dai risultati di ricerca per evitare di inviare più richieste
      setSearchResults((prev) => prev.filter((item) => item.uid !== otherUid));
    } catch (error: any) {
      Alert.alert('Errore', error?.message ?? 'Impossibile inviare la richiesta');
    } finally {
      setRequestingUid(null);
    }
  }

  async function handleAcceptFriendRequest(senderUid: string) {
    try {
      await acceptFriendRequest(senderUid);
      Alert.alert('Amicizia accettata', 'Ora siete amici!');
    } catch (error: any) {
      Alert.alert('Errore', error?.message ?? 'Impossibile accettare la richiesta');
    }
  }

  // Funzione per verificare se un utente è già amico
  const isFriend = useMemo(() => (uid: string) => {
    return friends.some((friend) => friend.uid === uid) || user?.friends?.includes(uid);
  }, [friends, user?.friends]);

  function formatTime(ts: number) {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return format(d, 'HH:mm');
    return format(d, 'dd/MM', { locale: it });
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  const AVATAR_COLORS = ['#DBEAFE', '#E0EAFF', '#EDE9FE', '#D1FAE5', '#F1F5F9'];
  const TEXT_C = ['#1D4ED8', '#2563EB', '#6D28D9', '#047857', '#0F172A'];

  function colorFor(id: string) {
    const i = id.charCodeAt(0) % AVATAR_COLORS.length;
    return { bg: AVATAR_COLORS[i], text: TEXT_C[i] };
  }

  const query = searchQ.trim();

  // Combina chat e amici per la visualizzazione
  const combinedList = useMemo(() => {
    // Se c'è una query di ricerca, mostra solo i risultati della ricerca
    if (query) {
      return searchResults;
    }

    // Prendi gli UID di chi ha già una chat 1:1
    const uidsWithChat = chats.reduce((acc, c) => {
      if (!c.isGroup) c.participants.forEach(p => acc.add(p));
      return acc;
    }, new Set<string>());

    // Filtra gli amici che non appaiono ancora nelle chat
    const friendsWithoutChat = friends.filter(f => !uidsWithChat.has(f.uid));

    // Unisci Chat attive + Amici "silenziosi"
    return [...chats, ...friendsWithoutChat];
  }, [chats, friends, searchResults, query]);

  return (
    <View style={s.root}>
      <View style={s.actionsRow}>
        <TouchableOpacity
          style={s.actionButton}
          onPress={() => navigation.navigate('AddFriends')}
          activeOpacity={0.85} // Corretto: Richieste amici
        >
          <Text style={s.actionButtonText}>Aggiungi amici</Text>
          {user?.incomingFriendRequests && user.incomingFriendRequests.length > 0 && (
            <View style={s.buttonBadge}>
              <Text style={s.buttonBadgeText}>{user.incomingFriendRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionButton, s.actionButtonSecondary]}
          onPress={() => navigation.navigate('CreateGroup')}
          activeOpacity={0.85}
        > {/* Corretto: Crea gruppo */}
          <Text style={s.actionButtonTextSecondary}>Crea gruppo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          ref={searchRef}
          style={s.search}
          placeholder="Cerca persone o amici..."
          placeholderTextColor="#aaa"
          value={searchQ}
          onChangeText={setSearchQ}
          autoCapitalize="none"
        />
      </View>

      {/* Chat list */}
      {loading || searching
        ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        : ( // Corretto: Visualizza la lista combinata
          <FlatList
            data={combinedList}
            keyExtractor={item => (item as any).id || (item as any).uid}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>💬</Text>
                <Text style={s.emptyText}>Niente da vedere qui.</Text>
              </View>
            }
            renderItem={({ item: chat }) => {
              // Renderizza i risultati di ricerca (se presenti)
              if ('nickname' in chat) {
                const person = chat as TalksyUser;
                const color = colorFor(person.uid);
                return (
                  <TouchableOpacity style={s.chatItem} onPress={() => openChat(person.uid)}>
                    <View style={[s.avatar, { backgroundColor: color.bg }]}>
                      <Text style={[s.avatarText, { color: color.text }]}>{getInitials(person.displayName)}</Text>
                    </View>
                    <View style={s.chatInfo}>
                      <Text style={s.chatName}>{person.displayName}</Text>
                      <Text style={s.chatPreview}>@{person.nickname}</Text>
                    </View>
                    <View style={s.chatMeta}> {/* Aggiungi logica per richieste di amicizia */}
                      {isFriend(person.uid) ? (
                        <Text style={s.chatTime}>Amico</Text>
                      ) : user?.outgoingFriendRequests?.includes(person.uid) ? (
                        <View style={s.statusPill}><Text style={s.statusPillText}>Inviata</Text></View>
                      ) : user?.incomingFriendRequests?.includes(person.uid) ? (
                        <TouchableOpacity style={s.acceptSmallBtn} onPress={() => handleAcceptFriendRequest(person.uid)}>
                          <Text style={s.acceptSmallBtnText}>Accetta</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => handleSendFriendRequest(person.uid)}>
                          <Text style={s.addTextAction}>+ Aggiungi</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }

              const isGroup = chat.isGroup;
              if (isGroup) {
                const unread = chat.unread?.[Auth.currentUser?.uid ?? ''] ?? 0; // Contatore non letti
                return (
                  <TouchableOpacity
                    style={s.chatItem}
                    onPress={() => navigation.navigate('ChatRoom', { chatId: chat.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[s.avatar, { backgroundColor: COLORS.primary }]}>
                      <Text style={[s.avatarText, { color: COLORS.white }]}>👥</Text>
                    </View>
                    <View style={s.chatInfo}>
                      <Text style={s.chatName}>{chat.groupName ?? 'Gruppo'}</Text>
                      <Text style={s.chatPreview} numberOfLines={1}>{chat.lastMessage || 'Inizia a chattare!'}</Text>
                    </View>
                    <View style={s.chatMeta}>
                      <Text style={s.chatTime}>{chat.lastTs ? formatTime(chat.lastTs) : ''}</Text>
                      {unread > 0 && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }

              const otherId = chat.participants.find((p: string) => p !== Auth.currentUser?.uid) ?? '';
              const unread = chat.unread?.[Auth.currentUser?.uid ?? ''] ?? 0;
              const color = colorFor(otherId);
              const friend = friends.find((entry) => entry.uid === otherId);
              const isOnline = onlineStatuses[otherId]; // Get online status

              return (
                <TouchableOpacity
                  style={s.chatItem}
                  onPress={() => navigation.navigate('ChatRoom', { chatId: chat.id })}
                  activeOpacity={0.7}
                >
                  <View> {/* Wrap avatar e indicatore online */}
                    {friend?.photoURL ? <Image source={{ uri: friend.photoURL }} style={s.avatar} /> : (
                      <View style={[s.avatar, { backgroundColor: color.bg }]}>
                        <Text style={[s.avatarText, { color: color.text }]}>
                          {getInitials(friend?.displayName ?? otherId.slice(0, 4).toUpperCase())}
                        </Text>
                      </View>
                    )}
                    {otherId && ( // Mostra indicatore online solo per chat 1:1 con un otherId valido
                      <View style={[s.onlineIndicator, isOnline ? s.online : s.offline]} />
                    )}
                  </View>
                  <View style={s.chatInfo}>
                    <Text style={s.chatName}>{friend?.displayName ?? otherId}</Text>
                    <Text style={s.chatPreview} numberOfLines={1}>{chat.lastMessage || 'Inizia a chattare!'}</Text>
                  </View>
                  <View style={s.chatMeta}>
                    <Text style={s.chatTime}>{chat.lastTs ? formatTime(chat.lastTs) : ''}</Text>
                    {unread > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )
      }
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',...Platform.select({ios:{shadowColor:'#1D4ED8',shadowOpacity:0.12,shadowRadius:10,shadowOffset:{width:0,height:6}},android:{elevation:3},default:{boxShadow:'0px 6px 10px rgba(29, 78, 216, 0.12)'}}),
  },
  statusPill: { backgroundColor: COLORS.surfaceMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 10, color: COLORS.textSoft, fontWeight: '600' },
  acceptSmallBtn: { backgroundColor: COLORS.success, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  acceptSmallBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  addTextAction: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  chatPreview: { fontSize: 13, color: COLORS.textSoft, marginTop: 3 }, // Leggermente più scuro per leggibilità
  chatTime: { fontSize: 11, color: COLORS.text, fontWeight: '500' }, // Più scuro
  buttonBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  buttonBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  friendsSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  friendsScroll: {
    gap: 14,
    paddingRight: 16,
  },
  friendItem: {
    alignItems: 'center',
    width: 64,
  },
  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surfaceMuted,
  },
  friendAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  friendName: {
    fontSize: 11,
    color: COLORS.text,
    marginTop: 6,
    textAlign: 'center',
    width: 64,
  },

  searchWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  search: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultsList: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resultText: {
    flex: 1,
    minWidth: 0,
  },
  resultName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  resultNick: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  resultAction: {
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultActionPrimary: {
    backgroundColor: COLORS.primary,
  },
  resultActionSecondary: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultActionDisabled: {
    opacity: 0.75,
  },
  resultActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultActionTextPrimary: {
    color: COLORS.white,
  },
  resultActionTextSecondary: {
    color: COLORS.primary,
  },
  noFriendsText: { fontSize: 14, color: COLORS.textMuted, paddingVertical: 12, paddingHorizontal: 16 },

  avatar:     { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceMuted },
  avatarText: { fontSize: 15, fontWeight: '700' },

  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatInfo:    { flex: 1, minWidth: 0 },
  chatName:    { fontSize: 15, fontWeight: '600', color: COLORS.text },
  chatPreview: { fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  chatMeta:    { alignItems: 'flex-end', gap: 4 },
  chatTime:    { fontSize: 11, color: COLORS.textSoft },
  badge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },

  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: COLORS.surface,
    zIndex: 10,
  },
  online: {
    backgroundColor: '#4CAF50', // Green
  },
  offline: {
    backgroundColor: '#9E9E9E', // Gray
  },

  empty:     { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
});
