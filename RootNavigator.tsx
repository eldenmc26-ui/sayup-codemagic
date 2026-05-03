// src/navigation/RootNavigator.tsx
// Navigazione principale — gestisce auth state e routing

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer }          from '@react-navigation/native';
import { createNativeStackNavigator }   from '@react-navigation/native-stack';
import { createBottomTabNavigator }     from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Modal, Platform, DeviceEventEmitter } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Auth, Database, Firestore, Collections } from './firebase';
import { useStore } from './useStore';
import { TalksyUser } from './authService';
import { CallSession } from './chatService';

// Carichiamo Sendbird solo su Mobile per evitare crash nel browser
const SendbirdCalls = Platform.OS !== 'web' ? require('@sendbird/calls-react-native').SendbirdCalls : null;
const InCallManager = Platform.OS !== 'web' ? require('react-native-incall-manager').default : null;

// Schermate
import WelcomeScreen from './WelcomeScreen';
import RegisterScreen from './RegisterScreen';
import LoginScreen from './LoginScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import ChatsScreen from './ChatsScreen';
import ChatRoomScreen from './ChatRoomScreen';
import NewsScreen from './NewsScreen';
import CallsScreen from './CallsScreen';
import SettingsScreen from './SettingsScreen';
import AddFriendsScreen from './AddFriendsScreen';
import AdminNewsScreen from './AdminNewsScreen';
import NewsDetailScreen from './NewsDetailScreen';
import CreateGroupScreen from './CreateGroupScreen';
import { APP_HEADER, COLORS } from './theme';

// Helper WebRTC
// Inserisci qui l'Application ID che trovi nella dashboard di Sendbird (sezione Application)
const SENDBIRD_APP_ID = '87670304-95D1-4110-9BDF-4F0E5308D37A'; 

// ── Stack types ────────────────────────────────
export type AuthStackParams = {
  Welcome:      undefined;
  Register:     undefined;
  Login:        undefined;
  ProfileSetup: undefined;
};

export type HomeStackParams = {
  ChatsList: undefined;
  ChatRoom:  { chatId: string };
  AddFriends: undefined;
  CreateGroup: undefined;
};

export type HomeTabParams = {
  ChatsStack: undefined;
  NewsStack:  undefined;
  Calls:      undefined;
  Settings:   undefined;
};

export type NewsStackParams = {
  NewsList: undefined;
  AdminNews: { newsId?: string } | undefined;
  NewsDetail: { newsId: string };
};

const AuthStack  = createNativeStackNavigator<AuthStackParams>();
const ChatsStack = createNativeStackNavigator<HomeStackParams>();
const NewsStack = createNativeStackNavigator<NewsStackParams>();
const HomeTab    = createBottomTabNavigator<HomeTabParams>();

// ── Chats Stack (lista + room) ─────────────────
function ChatsStackScreen() {
  return (
    <ChatsStack.Navigator>
      <ChatsStack.Screen
        name="ChatsList"
        component={ChatsScreen}
        options={{
          headerStyle:     APP_HEADER,
          headerTintColor: COLORS.white,
          title:           'Chat',
        }}
      />
      <ChatsStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{
          headerStyle:     APP_HEADER,
          headerTintColor: COLORS.white,
          title:           'Chat',
        }}
      />
      <ChatsStack.Screen
        name="AddFriends"
        component={AddFriendsScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Aggiungi amici',
        }}
      />
      <ChatsStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Crea gruppo',
        }}
      />
    </ChatsStack.Navigator>
  );
}

function NewsStackScreen() {
  return (
    <NewsStack.Navigator>
      <NewsStack.Screen
        name="NewsList"
        component={NewsScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'News',
        }}
      />
      <NewsStack.Screen
        name="AdminNews"
        component={AdminNewsScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Crea news',
        }}
      />
      <NewsStack.Screen
        name="NewsDetail"
        component={NewsDetailScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'News',
        }}
      />
    </NewsStack.Navigator>
  );
}

// ── Tab Navigator (utenti loggati) ─────────────
function HomeTabs() {
  return (
    <HomeTab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSoft,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.surface,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        sceneStyle: {
          backgroundColor: COLORS.background,
        },
        headerStyle: APP_HEADER,
        headerTintColor: COLORS.white,
        tabBarIcon: ({ color, size, focused }) => {
          const iconName =
            route.name === 'ChatsStack' ? (focused ? 'chatbubble' : 'chatbubble-outline')
            : route.name === 'NewsStack' ? (focused ? 'newspaper' : 'newspaper-outline')
            : route.name === 'Calls' ? (focused ? 'call' : 'call-outline')
            : focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <HomeTab.Screen
        name="ChatsStack"
        component={ChatsStackScreen}
        options={{ title: 'Chat', headerShown: false }}
      />
      <HomeTab.Screen name="NewsStack" component={NewsStackScreen} options={{ title: 'News', headerShown: false }} />
      <HomeTab.Screen name="Calls" component={CallsScreen} options={{ title: 'Chiamate' }} />
      <HomeTab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Impostazioni' }} />
    </HomeTab.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────
export default function RootNavigator() {
  const { user, loading, setUser, setLoading } = useStore();
  
  // Stati Chiamata Globale
  const [activeCall, setActiveCall] = useState<{id: string, data: CallSession} | null>(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const sbCallRef = useRef<any>(null); // Usiamo any per compatibilità cross-platform
  const outgoingSubRef = useRef<any>(null);
  const ringtoneRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    let userUnsub: (() => void) | undefined;

    const initSendbird = async (uid: string) => {
      if (Platform.OS === 'web' || !SendbirdCalls) return;

      try {
        await SendbirdCalls.initialize(SENDBIRD_APP_ID);
        await SendbirdCalls.authenticate({ userId: uid });
        
        SendbirdCalls.setListener({
          onRinging: (call) => {
            sbCallRef.current = call;
            setActiveCall({ 
              id: call.callId, 
              data: { status: 'dialing', callerId: call.caller.userId, participants: [uid], type: 'voice', createdAt: Date.now(), chatId: '', groupName: call.caller.nickname || 'Chiamata' } 
            });
            setupCallListeners(call);
            playRingtone();
          },
        });

      } catch (e) { console.error('[Sendbird] Init error', e); }
    };

    // Gestisce la UI quando sei TU a far partire la chiamata (deve essere fuori da initSendbird)
    if (!outgoingSubRef.current) {
      outgoingSubRef.current = DeviceEventEmitter.addListener('ON_OUTGOING_CALL', (call: any) => {
        if (!call) return;
        sbCallRef.current = call;
        setActiveCall({
          id: call.callId,
          data: { 
            status: 'dialing', 
            callerId: Auth.currentUser?.uid || '', 
            participants: [], 
            type: 'voice', 
            createdAt: Date.now(), 
            chatId: '', 
            groupName: 'Sto chiamando...' 
          }
        });
        if (typeof call.setListener === 'function') setupCallListeners(call);
      });
    }

    // Ascolta i cambiamenti dello stato di autenticazione Firebase
    const unsubscribe = Auth.onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser) {
        // Listener real-time per il profilo utente (richieste amicizia, ecc.)
        userUnsub = Firestore.collection(Collections.USERS)
          .doc(firebaseUser.uid)
          .onSnapshot(doc => {
            if (doc.exists) {
              setUser(doc.data() as TalksyUser);
            }
          });
        initSendbird(firebaseUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      outgoingSubRef.current?.remove();
      if (userUnsub) userUnsub();
    };
  }, []);

  const setupCallListeners = (call: any) => {
    call.setListener({
      onEstablished: () => {
        setActiveCall(prev => prev ? { ...prev, data: { ...prev.data, status: 'active' } } : null);
      },
      onEnded: () => {
        handleEndInternal();
      },
    });
  };

  // FIX VIVAVOCE E MUTO: Gestione driver audio
  const setAudioOutput = (useSpeaker: boolean) => {
    if (Platform.OS !== 'web' && InCallManager) {
      try {
        InCallManager.setForceSpeakerphoneOn(useSpeaker);
      } catch(e) {}
    }
  };

  useEffect(() => {
    if (activeCall?.data.status === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeCall?.data.status]);

  const playRingtone = () => {
    if (Platform.OS === 'web' && !ringtoneRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1358/1358-preview.mp3');
      audio.loop = true;
      audio.play().catch(() => {});
      ringtoneRef.current = audio;
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  };

  const handleEndInternal = () => {
    setAudioOutput(false);
    setActiveCall(null); // Resetta lo stato della chiamata
    stopRingtone();
  };

  const handleAccept = async () => {
    stopRingtone();
    if (sbCallRef.current) {
      await sbCallRef.current.accept();
    }
  };

  const handleHangup = () => {
    if (sbCallRef.current) {
      sbCallRef.current.end();
    }
    handleEndInternal();
  };

  
  const toggleSpeaker = () => {
    const newValue = !isSpeaker;
    setIsSpeaker(newValue);
    setAudioOutput(newValue);
  };

  
  const toggleMute = () => {
    if (sbCallRef.current) {
      if (isMuted) {
        sbCallRef.current.unmuteMicrophone();
      } else {
        sbCallRef.current.muteMicrophone();
      }
      setIsMuted(!isMuted);
    }
  };

  
  const renderOverlay = () => {
    if (!activeCall) return null;
    const isIncoming = activeCall.data.status === 'dialing' && activeCall.data.callerId !== user?.uid;
    
    return (
      <Modal visible={true} animationType="slide">
        <View style={[styles.callOverlay, activeCall.data.status === 'active' ? styles.callActive : styles.callDialing]}>
          <Ionicons name="person-circle" size={100} color="#fff" />
          <Text style={styles.callTitle}>{activeCall.data.groupName || 'Chiamata Vocale'}</Text>
          <Text style={styles.callStatus}>{activeCall.data.status === 'active' ? formatTime(duration) : isIncoming ? 'CHIAMATA IN ARRIVO' : 'CHIAMATA IN CORSO...'}</Text>
          
          <View style={styles.callActions}>
            {isIncoming && (
              <TouchableOpacity style={[styles.btn, styles.accept]} onPress={handleAccept}>
                <Ionicons name="call" size={32} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.btn, styles.hangup]} onPress={handleHangup}>
              <Ionicons name="call-outline" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <><HomeTabs />{renderOverlay()}</>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome"      component={WelcomeScreen} />
          <AuthStack.Screen name="Register"     component={RegisterScreen} />
          <AuthStack.Screen name="Login"        component={LoginScreen} />
          <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  callOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  callDialing: { backgroundColor: COLORS.primary },
  callActive: { backgroundColor: '#075E54' },
  callTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 20 },
  callStatus: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 8, letterSpacing: 1.5, fontWeight: '600' },
  controlsRow: { marginTop: 40, marginBottom: 20 },
  controlBtn: { alignItems: 'center', padding: 15, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)' },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.4)' },
  controlLabel: { color: '#fff', fontSize: 12, marginTop: 5 },
  callActions: { flexDirection: 'row', gap: 40, marginTop: 40 },
  btn: { width: 75, height: 75, borderRadius: 40, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  accept: { backgroundColor: COLORS.success },
  hangup: { backgroundColor: COLORS.danger },
});
