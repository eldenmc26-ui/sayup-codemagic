// src/screens/ChatRoomScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Image,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { ensureChatParticipants, subscribeToMessages, sendMessage, setTyping, subscribeChats, startVoiceCall, deleteMessage, updateMessage } from './chatService';
import { Auth, Firestore, Collections } from './firebase';
import type { SayUpUser } from './authService';
import type { Message, Chat } from './chatService';
import { format } from 'date-fns';
import { COLORS } from './theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = NativeStackScreenProps<any, 'ChatRoom'>;
 
export default function ChatRoomScreen({ route, navigation }: Props) {
  const { chatId } = route.params as { chatId: string };
  const myUid      = Auth.currentUser!.uid;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<SayUpUser | null>(null);
  const listRef                 = useRef<FlatList<Message>>(null); // Specifica il tipo per FlatList
  const typingTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function initChat() {
      try {
        await ensureChatParticipants(chatId);
        if (!active) return;
        
        const unsub = subscribeToMessages(chatId, msgs => {
          setMessages(msgs);
          setLoading(false);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        });

        return unsub;
      } catch {
        if (active) setLoading(false);
        return undefined;
      }
    }

    let cleanup: (() => void) | undefined;
    void initChat().then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [chatId]);

  useEffect(() => {
    const unsub = subscribeChats(
      (chats) => {
        const current = chats.find((c) => c.id === chatId);
        if (current) setChatInfo(current); // chatInfo ora contiene chatKey
      }
    );
    return unsub;
  }, [chatId]);

  useEffect(() => {
    if (chatInfo && !chatInfo.isGroup) {
      const otherId = chatInfo.participants.find((p) => p !== myUid);
      if (otherId) {
        Firestore.collection(Collections.USERS).doc(otherId).get().then((doc: any) => {
          if (doc.exists) setOtherUser(doc.data() as SayUpUser);
        });
      }
    }
  }, [chatInfo, myUid]);

  useEffect(() => {
    if (chatInfo?.isGroup) {
      navigation.setOptions({ 
        title: chatInfo.groupName ?? 'Gruppo',
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => startVoiceCall(chatId, chatInfo.participants.filter(p => p !== myUid), chatInfo.groupName || 'Chiamata di gruppo')}
            style={{ marginRight: 15 }}
          >
            <Text style={{ fontSize: 20 }}>📞</Text>
          </TouchableOpacity>
        )
      });
    } else if (otherUser) {
      const otherId = chatInfo?.participants.find((p) => p !== myUid);
      navigation.setOptions({ 
        title: otherUser.displayName,
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => startVoiceCall(chatId, [otherId!], otherUser.displayName)}
            style={{ marginRight: 15 }}
          >
            <Text style={{ fontSize: 20 }}>📞</Text>
          </TouchableOpacity>
        )
      });
    }
  }, [chatInfo, otherUser, navigation, chatId, myUid]);

  function handleTextChange(val: string) {
    setText(val);
    setTyping(chatId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(chatId, false), 1500);
  }

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.2, // Qualità bassa per Base64
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64 && chatInfo?.chatKey) {
      setSending(true);
      try {
        const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await sendMessage(chatId, base64Data, chatInfo.chatKey, 'image');
      } catch (e) { 
        Alert.alert('Errore', 'Impossibile inviare immagine'); 
      } finally { 
        setSending(false); 
      }
    }
  };

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !chatInfo?.chatKey) return;
    
    setSending(true);
    try {
      if (editingMsgId) {
        await updateMessage(chatId, editingMsgId, trimmed, chatInfo.chatKey);
        setEditingMsgId(null);
      } else {
        await sendMessage(chatId, trimmed, chatInfo.chatKey);
      }
      setText('');
    } finally {
      setSending(false);
    }
  }

  function handleLongPress(msg: Message) {
    if (msg.senderId !== myUid) return;
    Alert.alert('Messaggio', 'Scegli un\'azione', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Modifica', onPress: () => { setText(msg.content); setEditingMsgId(msg.id); }},
      { text: 'Elimina', style: 'destructive', onPress: () => deleteMessage(chatId, msg.id) }
    ]);
  }

  function renderMessage({ item: msg }: { item: Message }) {
    const isMine = msg.senderId === myUid;
    return <TouchableOpacity 
      onLongPress={() => handleLongPress(msg)}
      activeOpacity={0.9}
      style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}
    ><View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {chatInfo?.isGroup && !isMine && <Text style={styles.senderName}>{msg.senderId.slice(0, 8)}</Text>}
        {msg.type === 'image' ? (
          <Image source={{ uri: msg.content }} style={styles.chatImage} />
        ) : (
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{msg.content}</Text>
        )}
        <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>{format(new Date(msg.timestamp), 'HH:mm')}</Text>
      </View></TouchableOpacity>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator style={{ flex: 1, marginTop: 40 }} color={COLORS.primary} />
        ) : ( <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={m => m.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Nessun messaggio ancora. 👋</Text>
                </View>
              }
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            /> )
        }
      </View>

      <View style={styles.inputBar}>
        <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn}>
          <Ionicons name="attach" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder='Scrivi un messaggio...'
          placeholderTextColor='#aaa'
          multiline
          maxLength={2000}
          returnKeyType='default'
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size='small' color='#fff' />
            : <Ionicons name="send" size={18} color={COLORS.white} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 12, gap: 6 },

  msgRow:      { flexDirection: 'row', marginVertical: 2 },
  msgRowMine:  { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 1,
    borderRadius: 15,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
      default: { boxShadow: '0px 1px 2px rgba(0,0,0,0.1)' }
    }),
  },
  bubbleMine: {
    backgroundColor: '#DCF8C6', // Verde WhatsApp
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 4 },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderName: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  bubbleText:      { fontSize: 16, lineHeight: 21, color: '#000' },
  bubbleTextMine:  { color: '#000' },
  bubbleTextOther: { color: '#000' },
  bubbleTime:      { fontSize: 11, marginTop: 4, alignSelf: 'flex-end', minWidth: 40, textAlign: 'right' },
  bubbleTimeMine:  { color: '#667781' },
  bubbleTimeOther: { color: '#667781' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#BFDBFE' },

  empty:     { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
});
