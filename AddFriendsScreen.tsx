import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Auth, Firestore, Collections } from './firebase'; 
import { searchUsers } from './authService';
import type { SayUpUser } from './authService';
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } from './friendService';
import { COLORS } from './theme';
import { useStore } from './useStore';

type Tab = 'search' | 'pending' | 'sent' | 'friends';

export default function AddFriendsScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useStore(); // Ottieni setUser dallo store
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SayUpUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestingUid, setRequestingUid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [pendingProfiles, setPendingProfiles] = useState<SayUpUser[]>([]);
  const [sentProfiles, setSentProfiles] = useState<SayUpUser[]>([]);
  const [friendsProfiles, setFriendsProfiles] = useState<SayUpUser[]>([]);

  // Carica i profili per le richieste in sospeso o inviate
  useEffect(() => {
    async function fetchProfiles() {
      const ids = activeTab === 'pending' ? user?.incomingFriendRequests : activeTab === 'sent' ? user?.outgoingFriendRequests : user?.friends;
      if (!ids || ids.length === 0) {
        if (activeTab === 'pending') setPendingProfiles([]); else if (activeTab === 'sent') setSentProfiles([]); else setFriendsProfiles([]);
        return;
      }

      try {
        setLoading(true);
        const snap = await Firestore.collection(Collections.USERS)
          .where('uid', 'in', ids.slice(0, 10)) // Max 10 per volta per limiti Firestore query
          .get();
        const profiles = snap.docs.map((d: any) => d.data() as SayUpUser);
        if (activeTab === 'pending') setPendingProfiles(profiles); else if (activeTab === 'sent') setSentProfiles(profiles); else setFriendsProfiles(profiles);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    if (activeTab !== 'search') {
      fetchProfiles();
    }
  }, [activeTab, user?.incomingFriendRequests, user?.outgoingFriendRequests, user?.friends]);

  useEffect(() => {
    if (activeTab !== 'search') return;
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setLoading(true);
        try {
          const results = await searchUsers(searchQuery);
          // Filtra solo te stesso: vuoi poter vedere se un utente esiste anche se è già amico
          const filteredResults = results.filter(
            (u) => u.uid !== user?.uid
          );
          setSearchResults(filteredResults);
        } catch (error: any) {
          Alert.alert('Error', error.message);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user, activeTab]);

  const handleSendFriendRequest = async (recipientUid: string) => {
    setRequestingUid(recipientUid);
    try {
      await sendFriendRequest(recipientUid);
      Alert.alert('Richiesta inviata', 'Richiesta inviata con successo!');
      
      // Update user store correctly without direct mutation
      if (user) {
        setUser({
          ...user,
          outgoingFriendRequests: [...(user.outgoingFriendRequests || []), recipientUid],
        });
      }
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setRequestingUid(null);
    }
  };

  const handleAccept = async (uid: string) => {
    try {
      await acceptFriendRequest(uid);
      // Aggiorna lo store globale
      if (user) {
        setUser({
          ...user,
          incomingFriendRequests: (user.incomingFriendRequests || []).filter(id => id !== uid),
          friends: [...(user.friends || []), uid],
        });
      }
      // Rimuove subito il profilo dalla lista visualizzata
      setPendingProfiles(prev => prev.filter(p => p.uid !== uid));
      Alert.alert('Successo', 'Richiesta accettata!');
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    }
  };

  const handleDecline = async (uid: string) => {
    try {
      await declineFriendRequest(uid);
      // Aggiorna lo store globale
      if (user) {
        setUser({
          ...user,
          incomingFriendRequests: (user.incomingFriendRequests || []).filter(id => id !== uid),
        });
      }
      // Rimuove subito il profilo dalla lista visualizzata
      setPendingProfiles(prev => prev.filter(p => p.uid !== uid));
      Alert.alert('Info', 'Richiesta rimossa');
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    }
  };

  const handleRemove = async (uid: string) => {
    Alert.alert('Rimuovi amico', 'Sei sicuro di voler rimuovere questo utente dagli amici?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: async () => {
          try {
            await removeFriend(uid);
            if (user) {
              setUser({ ...user, friends: (user.friends || []).filter(id => id !== uid) });
            }
            setFriendsProfiles(prev => prev.filter(p => p.uid !== uid));
          } catch (e: any) { Alert.alert('Errore', e.message); }
        }
      }
    ]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const AVATAR_COLORS = ['#DBEAFE', '#E0EAFF', '#EDE9FE', '#D1FAE5', '#F1F5F9'];
  const TEXT_C = ['#1D4ED8', '#2563EB', '#6D28D9', '#047857', '#0F172A'];

  function colorFor(id: string) {
    const i = id.charCodeAt(0) % AVATAR_COLORS.length;
    return { bg: AVATAR_COLORS[i], text: TEXT_C[i] };
  }

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>Nessun utente trovato in questa sezione.</Text>
      </View>
    );
  };

  const renderUserItem = (person: SayUpUser) => {
    const color = colorFor(person.uid);
    const isFriend = user?.friends?.includes(person.uid);
    const isOutgoing = user?.outgoingFriendRequests?.includes(person.uid);
    const isIncoming = user?.incomingFriendRequests?.includes(person.uid);

    return (
      <View style={styles.userItem}>
        <View style={[styles.avatar, { backgroundColor: color.bg }]}>
          {person.photoURL ? (
            <Image source={{ uri: person.photoURL }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: color.text }]}>{getInitials(person.displayName)}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{person.displayName}</Text>
          <Text style={styles.userNickname}>@{person.nickname}</Text>
        </View>
        
        {activeTab === 'search' && (
          <TouchableOpacity
            style={[styles.addButton, (requestingUid === person.uid || isFriend || isOutgoing || isIncoming) && styles.addButtonDisabled]}
            onPress={() => !isFriend && !isOutgoing && !isIncoming && handleSendFriendRequest(person.uid)}
            disabled={requestingUid === person.uid || isFriend || isOutgoing || isIncoming}
          >
            <Text style={styles.addButtonText}>
              {isFriend ? 'Amico' : isOutgoing ? 'Inviata' : isIncoming ? 'Ricevuta' : 'Aggiungi'}
            </Text>
          </TouchableOpacity>
        )}

        {activeTab === 'pending' && (
          <View style={styles.row}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(person.uid)}>
              <Text style={styles.btnTextSmall}>Accetta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(person.uid)}>
              <Text style={styles.btnTextSmall}>X</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'friends' && (
          <TouchableOpacity style={styles.declineBtn} onPress={() => handleRemove(person.uid)}>
            <Text style={styles.btnTextSmall}>Rimuovi</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'sent' && (
          <Text style={styles.statusText}>In attesa...</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'search' && styles.tabActive]} onPress={() => setActiveTab('search')}>
          <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>Cerca</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.tabActive]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>In arrivo ({user?.incomingFriendRequests?.length || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'sent' && styles.tabActive]} onPress={() => setActiveTab('sent')}>
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>Inviate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'friends' && styles.tabActive]} onPress={() => setActiveTab('friends')}>
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Amici</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' && (
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca per nickname..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      )}

      {loading && <ActivityIndicator style={styles.loader} color={COLORS.primary} />}

      <FlatList
        data={activeTab === 'search' ? searchResults : activeTab === 'pending' ? pendingProfiles : activeTab === 'sent' ? sentProfiles : friendsProfiles}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => renderUserItem(item)}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  tabBar: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.white },
  row: { flexDirection: 'row', gap: 8 },
  searchInput: {
    height: 46,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  loader: {
    marginVertical: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userNickname: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  acceptBtn: { backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  declineBtn: { backgroundColor: COLORS.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  btnTextSmall: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  statusText: { fontSize: 12, color: COLORS.textSoft, fontStyle: 'italic' },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: COLORS.textSoft, textAlign: 'center', fontSize: 14 },
});
