// src/screens/CreateGroupScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native'; // Rimosso importazione duplicata di createGroupChat
import { useNavigation } from '@react-navigation/native';
import { subscribeFriends } from './friendService'; // Corretto il percorso di importazione
import { createGroupChat } from './chatService'; // Mantenuto createGroupChat da chatService
import type { SayUpUser } from './authService';
import { COLORS } from './theme';

export default function CreateGroupScreen() {
  const navigation = useNavigation<any>();
  const [friends, setFriends] = useState<SayUpUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeFriends(setFriends, () => setFriends([]));
    return unsub;
  }, []);

  function toggleSelection(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function handleCreate() {
    if (!groupName.trim()) {
      Alert.alert('Errore', 'Inserisci un nome per il gruppo');
      return;
    }
    if (selected.size < 2) {
      Alert.alert('Errore', 'Seleziona almeno 2 amici');
      return;
    }
    setLoading(true);
    try {
      const chatId = await createGroupChat(groupName.trim(), Array.from(selected));
      navigation.replace('ChatRoom', { chatId });
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? 'Impossibile creare il gruppo');
      setLoading(false);
    }
  }

  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const AVATAR_COLORS = ['#DBEAFE', '#E0EAFF', '#EDE9FE', '#D1FAE5', '#F1F5F9'];
  const TEXT_C = ['#1D4ED8', '#2563EB', '#6D28D9', '#047857', '#0F172A'];

  function colorFor(id: string) {
    const i = id.charCodeAt(0) % AVATAR_COLORS.length;
    return { bg: AVATAR_COLORS[i], text: TEXT_C[i] };
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Crea gruppo</Text>
      <Text style={s.subtitle}>Scegli un nome e seleziona almeno 2 amici.</Text>

      <Text style={s.label}>Nome gruppo</Text>
      <TextInput
        style={s.input}
        value={groupName}
        onChangeText={setGroupName}
        placeholder="Es. Amici del calcio"
        placeholderTextColor="#aaa"
        maxLength={50}
      />

      <Text style={s.label}>Seleziona amici ({selected.size} selezionati)</Text>
      {friends.length === 0 && <Text style={s.empty}>Non hai ancora amici.</Text>}

      {friends.map((friend) => {
        const isSelected = selected.has(friend.uid);
        const color = colorFor(friend.uid);
        return (
          <TouchableOpacity
            key={friend.uid}
            style={[s.friendCard, isSelected && s.friendCardSelected]}
            onPress={() => toggleSelection(friend.uid)}
            activeOpacity={0.8}
          >
            {friend.photoURL ? (
              <Image source={{ uri: friend.photoURL }} style={s.avatar} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: color.bg }]}>
                <Text style={[s.avatarText, { color: color.text }]}>{getInitials(friend.displayName)}</Text>
              </View>
            )}
            <View style={s.friendInfo}>
              <Text style={s.friendName}>{friend.displayName}</Text>
              <Text style={s.friendNick}>@{friend.nickname}</Text>
            </View>
            <View style={[s.check, isSelected && s.checkActive]}>
              {isSelected && <Text style={s.checkText}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[s.btnPrimary, (loading || selected.size < 2 || !groupName.trim()) && s.btnDisabled]}
        onPress={handleCreate}
        disabled={loading || selected.size < 2 || !groupName.trim()}
        activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Crea gruppo</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, gap: 12, paddingBottom: 40 },

  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 8, marginBottom: 8 },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface,
  },

  empty: { fontSize: 14, color: COLORS.textMuted, marginTop: 8 },

  friendCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 16,
    padding: 12, marginBottom: 10, backgroundColor: COLORS.surface,
  },
  friendCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },

  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700' },

  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  friendNick: { fontSize: 13, color: COLORS.textMuted },

  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },

  btnPrimary: {
    backgroundColor: COLORS.primary, borderRadius: 28,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
