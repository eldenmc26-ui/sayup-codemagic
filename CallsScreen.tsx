// src/screens/CallsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Modal, TextInput, Platform } from 'react-native';
import { COLORS } from './theme';
import { Auth } from './firebase';
import { 
  subscribeCallHistory, startVoiceCall, getOrCreateChat
} from './chatService';
import { subscribeFriends } from './friendService';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { SayUpUser } from './authService';

export default function CallsScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [ showNewCallModal, setShowNewCallModal ] = useState(false);
  const [ friends, setFriends ] = useState<SayUpUser[]>([]);
  const [ selectedFriends, setSelectedFriends ] = useState<string[]>([]);
  const [ callGroupName, setCallGroupName ] = useState('');
  const myUid = Auth.currentUser?.uid;

  useEffect(() => {
    const unsubFriends = subscribeFriends(setFriends, () => setFriends([]));
    return unsubFriends;
  }, []);

  useEffect(() => {
    const unsub = subscribeCallHistory(setHistory);
    return unsub;
  }, []);

  const toggleFriendSelection = (uid: string) => {
    setSelectedFriends(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleStartNewCall = async () => {
    if (selectedFriends.length === 0) return;

    let defaultCallName = 'Chiamata di gruppo';
    if (selectedFriends.length === 1) {
      const selectedFriend = friends.find(f => f.uid === selectedFriends[0] || (f as any).id === selectedFriends[0]);
      defaultCallName = selectedFriend ? selectedFriend.displayName : 'Chiamata vocale';
    } else {
      defaultCallName = 'Chiamata di gruppo';
    }

    const chatIdForCall = selectedFriends.length === 1 
      ? await getOrCreateChat(selectedFriends[0])
      : `group_${Date.now()}`;

    try {
      await startVoiceCall(chatIdForCall, selectedFriends, callGroupName || defaultCallName);
      setShowNewCallModal(false);
      setSelectedFriends([]);
      setCallGroupName('');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  // Funzioni helper per avatar (copiate da ChatsScreen)
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

  const colorFor = (id: string) => {
    const i = id.charCodeAt(0) % AVATAR_COLORS.length;
    return { bg: AVATAR_COLORS[i], text: TEXT_C[i] };
  };

  return (
    <View style={s.root}>
      <View style={{ flex: 1 }}>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.newCallButton} onPress={() => setShowNewCallModal(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={s.newCallButtonText}>Nuova Chiamata</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={history}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <View style={s.headerPillContainer}>
              <View style={s.headerPill}>
                <Text style={s.historyTitle}>Cronologia Chiamate</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.historyItem}>
              <View style={s.historyIconBox}>
                <Ionicons name={item.type === 'voice' ? 'call' : 'videocam'} size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.historyName}>{item.groupName || `Chiamata ID: ${item.callerId.slice(0, 8)}`}</Text>
                <Text style={s.historyDate}>{format(item.createdAt, 'HH:mm - dd MMM', { locale: it })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="call-outline" size={40} color={COLORS.textSoft} />
              </View>
              <Text style={s.emptyTitle}>Nessuna chiamata</Text>
              <Text style={s.emptySubtitle}>Le tue chiamate recenti appariranno qui.</Text>
            </View>
          }
        />
      </View>

      <Modal
        animationType="slide"
        transparent={false}
        visible={showNewCallModal}
        onRequestClose={() => setShowNewCallModal(false)}
      >
        <View style={s.modalContainer}>
          <Text style={s.modalTitle}>Seleziona amici per la chiamata</Text>
          
          {selectedFriends.length > 1 && (
            <TextInput
              style={s.groupNameInput}
              placeholder="Nome della chiamata di gruppo (opzionale)"
              placeholderTextColor="#aaa"
              value={callGroupName}
              onChangeText={setCallGroupName}
            />
          )}

          <FlatList
            data={friends}
            keyExtractor={item => item.uid}
            renderItem={({ item: friend }) => {
              const isSelected = selectedFriends.includes(friend.uid);
              const color = colorFor(friend.uid);
              return (
                <TouchableOpacity
                  style={s.friendSelectionItem}
                  onPress={() => toggleFriendSelection(friend.uid)}
                >
                  <View style={[s.avatar, { backgroundColor: color.bg }]}>
                    <Text style={[s.avatarText, { color: color.text }]}>{getInitials(friend.displayName)}</Text>
                  </View>
                  <Text style={s.friendSelectionName}>{friend.displayName}</Text>
                  <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                    {isSelected && <Text style={s.checkboxText}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={s.emptyText}>Non hai amici da chiamare.</Text>}
          />

          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalButton} onPress={handleStartNewCall}>
              <Text style={s.modalButtonText}>Avvia Chiamata ({selectedFriends.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modalButton, s.modalButtonSecondary]} onPress={() => setShowNewCallModal(false)}>
              <Text style={s.modalButtonTextSecondary}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.background },
  headerActions: { paddingHorizontal: 16, paddingTop: 12 },
  newCallButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({ 
      ios: { shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, 
      android: { elevation: 4 } 
    }),
  },
  newCallButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  headerPillContainer: { padding: 16, alignItems: 'flex-start' },
  headerPill: { 
    backgroundColor: COLORS.surface, 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  historyTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textSoft, textTransform: 'uppercase', letterSpacing: 1 },
  historyItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: COLORS.surface, 
    marginHorizontal: 16, 
    marginBottom: 10, 
    borderRadius: 16, 
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  historyName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  historyDate: { fontSize: 12, color: COLORS.textSoft, marginTop: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSoft, textAlign: 'center', lineHeight: 20 },
  modalContainer: { flex: 1, padding: 20, backgroundColor: COLORS.background },
  emptyText: { color: COLORS.textSoft, textAlign: 'center', marginTop: 16 },

  groupInput: { backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  friendItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 8, gap: 12 },
  friendSelected: { borderColor: COLORS.primary, borderWidth: 1 },
  friendName: { flex: 1, fontSize: 16, color: COLORS.text },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnStart: { flex: 2, backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnCancel: { flex: 1, backgroundColor: COLORS.surface, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: 15,
  },
  friendSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendSelectionName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalActions: {
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  modalButtonTextSecondary: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
