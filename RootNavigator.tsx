// src/navigation/RootNavigator.tsx
// Navigazione principale — gestisce auth state e routing

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Modal, Platform, DeviceEventEmitter } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Auth, Database, Firestore, Collections } from './firebase';
import { useStore } from './useStore';
import secureStorage from './secureStorage';
import type { SayUpUser } from './authService';
import type { CallSession } from './chatService';


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

// ── Stack types ────────────────────────────────
export type AuthStackParams = {
  Welcome: undefined;
  Register: undefined;
  Login: undefined;
  ProfileSetup: undefined;
};

export type MainStackParams = {
  Home: undefined;
  ChatRoom: { chatId: string };
  AdminNews: { newsId?: string } | undefined;
  NewsDetail: { newsId: string };
  AddFriends: undefined;
  CreateGroup: undefined;
};

export type HomeStackParams = {
  ChatsList: undefined;
};

export type HomeTabParams = {
  ChatsStack: undefined;
  NewsStack: undefined;
  Calls: undefined;
  Settings: undefined;
};

export type NewsStackParams = {
  NewsList: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const MainStack = createNativeStackNavigator<MainStackParams>();
const ChatsStack = createNativeStackNavigator<HomeStackParams>();
const NewsStack = createNativeStackNavigator<NewsStackParams>();
const HomeTab = createBottomTabNavigator<HomeTabParams>();

// ── Chats Stack (lista) ─────────────────
function ChatsStackScreen() {
  return (
    <ChatsStack.Navigator>
      <ChatsStack.Screen
        name="ChatsList"
        component={ChatsScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Chat',
        }}
      />
    </ChatsStack.Navigator>
  );
}

// ── News Stack (lista) ─────────────────
function NewsStackScreen() {
  return (
    <NewsStack.Navigator>
      <NewsStack.Screen
        name="NewsList"
        component={NewsScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Post',
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
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 60,
          right: 60,
          height: 50,
          borderRadius: 25,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          elevation: 6,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          flexDirection: 'row',
          justifyContent: 'center',
          paddingBottom: Platform.OS === 'ios' ? 0 : 0,
        },
        tabBarIcon: ({ focused }) => {
          let iconName: any;
          if (route.name === 'ChatsStack') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          } else if (route.name === 'NewsStack') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Calls') {
            iconName = focused ? 'call' : 'call-outline';
          } else {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          const iconColor = focused ? COLORS.primary : COLORS.textSoft;

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: Platform.OS === 'ios' ? 10 : 0 }}>
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 3,
              }}>
                <Ionicons name={iconName} size={20} color={iconColor} />
              </View>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 2 }} />}
            </View>
          );
        },
      })}
    >
      <HomeTab.Screen
        name="ChatsStack"
        component={ChatsStackScreen}
        options={{ title: 'Chat', headerShown: false }}
      />
      <HomeTab.Screen name="NewsStack" component={NewsStackScreen} options={{ title: 'Post', headerShown: false }} />
      <HomeTab.Screen name="Calls" component={CallsScreen} options={{ title: 'Chiamate' }} />
      <HomeTab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Impostazioni' }} />
    </HomeTab.Navigator>
  );
}

// ── Main Stack (contenitore principale con tab + dettagli esterni) ──
function MainStackScreen() {
  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="Home"
        component={HomeTabs}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Chat',
        }}
      />
      <MainStack.Screen
        name="AdminNews"
        component={AdminNewsScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Crea',
        }}
      />
      <MainStack.Screen
        name="NewsDetail"
        component={NewsDetailScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Dettaglio',
        }}
      />
      <MainStack.Screen
        name="AddFriends"
        component={AddFriendsScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Aggiungi amici',
        }}
      />
      <MainStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{
          headerStyle: APP_HEADER,
          headerTintColor: COLORS.white,
          title: 'Crea gruppo',
        }}
      />
    </MainStack.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────
export default function RootNavigator() {
  const { user, loading, setUser, setLoading } = useStore();

  const [showTutorial, setShowTutorial] = useState(false);

  // Stati Chiamata Globale
  const [activeCall, setActiveCall] = useState<{ id: string, data: CallSession } | null>(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [localStream, setLocalStream] = useState<any>(null);
  const pcRef = useRef<any>(null);
  const ringtoneRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const inCallManagerRef = useRef<any>(null);
  const webrtcModuleRef = useRef<Promise<any> | null>(null);
  const callSnapshotUnsubRef = useRef<any>(null);
  const candidatesUnsubRef = useRef<any>(null);

  // Refs per evitare stale closure nei listener
  const activeCallRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getWebRTC = () => {
    if (!webrtcModuleRef.current) {
      webrtcModuleRef.current = import('react-native-webrtc');
    }
    return webrtcModuleRef.current;
  };

  const getInCallManager = () => {
    if (!inCallManagerRef.current) {
      try {
        inCallManagerRef.current = require('react-native-incall-manager').default;
      } catch {
        inCallManagerRef.current = null;
      }
    }
    return inCallManagerRef.current;
  };

  useEffect(() => {
    let userUnsub: (() => void) | undefined;
    let callsUnsub: (() => void) | undefined;

    // Ascolta i cambiamenti dello stato di autenticazione Firebase
    const unsubscribe = Auth.onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser) {
        // Listener real-time per il profilo utente (richieste amicizia, ecc.)
        userUnsub = Firestore.collection(Collections.USERS)
          .doc(firebaseUser.uid)
          .onSnapshot(
            (doc: any) => {
              if (doc && doc.exists) {
                setUser({ uid: doc.id, ...doc.data() } as SayUpUser);
              }
            },
            (err: any) => {
              console.log('[RootNavigator] Error listening to user profile:', err.message);
            }
          );

        // Listener per chiamate in arrivo
        callsUnsub = Firestore.collection(Collections.CALL_HISTORY)
          .where('participants', 'array-contains', firebaseUser.uid)
          .where('status', 'in', ['dialing', 'active'])
          .onSnapshot(
            (snap: any) => {
              if (!snap || typeof snap.docChanges !== 'function') return;
              snap.docChanges().forEach((change: any) => {
                const data = change.doc.data() as CallSession;
                const isCaller = data.callerId === firebaseUser.uid;
                if (change.type === 'added') {
                  const isStale = Date.now() - data.createdAt > 2 * 60 * 1000;
                  if (isStale) return; // Ignora chiamate vecchie/fantasma su avvio app

                  if (!isCaller) {
                    if (activeCallRef.current) {
                      console.log('[RootNavigator] Chiamata in arrivo ignorata: già in chiamata');
                      return;
                    }
                    setActiveCall({ id: change.doc.id, data });
                    if (data.status === 'dialing') {
                      playRingtone();
                    }
                  }
                } else if (change.type === 'removed') {
                  if (!isCaller) {
                    handleEndInternal();
                  }
                } else if (change.type === 'modified') {
                  if (!isCaller && data.status === 'ended') {
                    handleEndInternal();
                  }
                }
              });
            },
            (error: any) => {
              console.log('[RootNavigator] calls list snapshot error:', error.message);
            }
          );
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listener per chiamate in uscita WebRTC
    const outgoingSub = DeviceEventEmitter.addListener('ON_OUTGOING_CALL', (callData) => {
      setActiveCall({
        id: callData.id,
        data: {
          ...callData,
          status: 'dialing',
          callerId: Auth.currentUser?.uid || '',
          createdAt: Date.now(),
          type: 'voice'
        }
      });
      if (callData.pc) {
        pcRef.current = callData.pc;
      }
      if (callData.stream) {
        setLocalStream(callData.stream);
        localStreamRef.current = callData.stream;
      }
      if (callData.unsub1) {
        callSnapshotUnsubRef.current = callData.unsub1;
      }
      if (callData.unsub2) {
        candidatesUnsubRef.current = callData.unsub2;
      }
    });

    const activeSub = DeviceEventEmitter.addListener('ON_CALL_ACTIVE', ({ id }) => {
      setActiveCall(prev => prev && prev.id === id
        ? { ...prev, data: { ...prev.data, status: 'active' } }
        : prev);
    });

    const endedSub = DeviceEventEmitter.addListener('ON_CALL_ENDED', ({ id }) => {
      if (activeCallRef.current && activeCallRef.current.id === id) {
        handleEndInternal();
      }
    });

    return () => {
      unsubscribe();
      outgoingSub.remove();
      activeSub.remove();
      endedSub.remove();
      if (userUnsub) userUnsub();
      if (callsUnsub) callsUnsub();
    };
  }, []);

  useEffect(() => {
    if (user) {
      secureStorage.getItem(`has_seen_tutorial_${user.uid}`).then((val) => {
        if (!val) {
          setShowTutorial(true);
        }
      }).catch(() => { });
    } else {
      setShowTutorial(false);
    }
  }, [user]);

  const handleCloseTutorial = async () => {
    if (user) {
      try {
        await secureStorage.setItem(`has_seen_tutorial_${user.uid}`, 'true');
      } catch (e) { }
    }
    setShowTutorial(false);
  };

  const getLocalStream = async () => {
    const { mediaDevices } = await getWebRTC();
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    setLocalStream(stream);
    localStreamRef.current = stream;
    return stream;
  };

  // FIX VIVAVOCE E MUTO: Gestione driver audio
  const setAudioOutput = (useSpeaker: boolean) => {
    const InCallManager = getInCallManager();
    if (Platform.OS !== 'web' && InCallManager) {
      try {
        InCallManager.setSpeakerphoneOn(useSpeaker);
        InCallManager.setForceSpeakerphoneOn(useSpeaker);
      } catch (e) { }
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

  useEffect(() => {
    const InCallManager = getInCallManager();
    if (Platform.OS !== 'web' && InCallManager) {
      if (activeCall?.data.status === 'active') {
        console.log('[InCallManager] Starting audio session');
        try {
          InCallManager.start({ media: 'audio', auto: true });
          InCallManager.setForceSpeakerphoneOn(isSpeaker);
        } catch (e) {
          console.log('[InCallManager] Start error:', e);
        }
      } else if (!activeCall) {
        console.log('[InCallManager] Stopping audio session');
        try {
          InCallManager.stop();
        } catch (e) {
          console.log('[InCallManager] Stop error:', e);
        }
      }
    }
  }, [activeCall?.data.status, activeCall === null]);

  const playRingtone = () => {
    if (Platform.OS === 'web' && !ringtoneRef.current) {
      const audio = new (globalThis as any).Audio('https://assets.mixkit.co/active_storage/sfx/1358/1358-preview.mp3');
      audio.loop = true;
      audio.play().catch(() => { });
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
    // Chiudi lo stream locale
    const currentStream = localStreamRef.current;
    if (currentStream) {
      try {
        currentStream.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Chiudi la PeerConnection
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    setAudioOutput(false);
    setActiveCall(null); // Resetta lo stato della chiamata
    stopRingtone();
    setDuration(0);
    setIsMuted(false);
    setIsSpeaker(true);

    if (callSnapshotUnsubRef.current) {
      try {
        callSnapshotUnsubRef.current();
      } catch (e) {}
      callSnapshotUnsubRef.current = null;
    }
    if (candidatesUnsubRef.current) {
      try {
        candidatesUnsubRef.current();
      } catch (e) {}
      candidatesUnsubRef.current = null;
    }
  };

  const handleAccept = async () => {
    stopRingtone();

    // --- LOGICA WEBRTC ANSWER ---
    try {
      const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = await getWebRTC();
      const pc: any = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      // Aggiungi stream audio locale
      const stream = await getLocalStream();
      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

      // Gestione ICE candidates (Ricevente)
      const callRef = Firestore.collection(Collections.CALL_HISTORY).doc(activeCall?.id);

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          callRef.collection('calleeCandidates').add(event.candidate.toJSON());
        }
      };

      // Ascolta la chiusura della chiamata da parte dell'altro (Chiamante)
      let calleeCallUnsub: any = null;
      let callerCandidatesUnsub: any = null;

      calleeCallUnsub = callRef.onSnapshot(
        (snapshot: any) => {
          if (!snapshot) return;
          const data = snapshot.data();
          if (data?.status === 'ended') {
            pc.close();
            stream.getTracks().forEach((t: any) => t.stop());
            handleEndInternal();
            if (calleeCallUnsub) calleeCallUnsub();
            if (callerCandidatesUnsub) callerCandidatesUnsub();
          }
        },
        (error: any) => {
          console.log('[WebRTC] callee callRef snapshot error:', error.message);
        }
      );
      callSnapshotUnsubRef.current = calleeCallUnsub;

      callerCandidatesUnsub = callRef.collection('callerCandidates').onSnapshot(
        (snap: any) => {
          if (!snap || typeof snap.docChanges !== 'function') return;
          snap.docChanges().forEach(async (change: any) => {
            if (change.type === 'added') {
              await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            }
          });
        },
        (error: any) => {
          console.log('[WebRTC] callerCandidates snapshot error:', error.message);
        }
      );
      candidatesUnsubRef.current = callerCandidatesUnsub;

      // Audio remoto (WebRTC gestisce l'output automaticamente con InCallManager)
      pc.ontrack = (_event: any) => {
        console.log('[WebRTC] Ricevuto track remoto');
      };

      // 1. Ottieni offerta da Firestore (collezione calls/{id}/sdp)
      const callDoc = await callRef.get();
      const offer = callDoc.data()?.offer;

      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // 2. Salva la risposta su Firestore
        await callRef.update({
          answer: answer,
          status: 'active',
          answererId: Auth.currentUser?.uid,
        });

        setActiveCall(prev => prev ? { ...prev, data: { ...prev.data, status: 'active' } } : null);
      }
    } catch (e) {
      console.error('[WebRTC] Accept error:', e);
      handleEndInternal();
    }
  };

  const handleHangup = () => {
    // Aggiorna Firestore per chiudere la chiamata anche per l'altro
    const currentCall = activeCallRef.current;
    if (currentCall?.id) {
      Firestore.collection(Collections.CALL_HISTORY).doc(currentCall.id).update({
        status: 'ended',
        endedAt: Date.now()
      });
    }
    handleEndInternal();
  };


  const toggleSpeaker = () => {
    const nextValue = !isSpeaker;
    setIsSpeaker(nextValue);
    setAudioOutput(nextValue);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !nextMuted;
      });
      setIsMuted(nextMuted);
    }
  };

  const renderOverlay = () => {
    if (!activeCall) return null;
    const isIncomingCall = activeCall.data.callerId !== user?.uid;
    const showAcceptButton = activeCall.data.status === 'dialing' && isIncomingCall;
    const isGroup = activeCall.data.participants && activeCall.data.participants.length > 2;
    const displayName = isGroup 
      ? (activeCall.data.groupName || 'Chiamata di gruppo')
      : (isIncomingCall ? (activeCall.data.callerName || 'Chiamata Vocale') : (activeCall.data.groupName || 'Chiamata Vocale'));

    return (
      <Modal visible={true} animationType="slide">
        <View style={[styles.callOverlay, activeCall.data.status === 'active' ? styles.callActive : styles.callDialing]}>
          <Ionicons name="person-circle" size={100} color="#fff" />
          <Text style={styles.callTitle}>{displayName}</Text>
          <Text style={styles.callStatus}>{activeCall.data.status === 'active' ? formatTime(duration) : isIncomingCall ? 'CHIAMATA IN ARRIVO' : 'CHIAMATA IN CORSO...'}</Text>

          {activeCall.data.status === 'active' && (
            <View style={[styles.controlsRow, { flexDirection: 'row', gap: 24 }]}>
              <TouchableOpacity
                style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                onPress={toggleMute}
              >
                <Ionicons name="mic-off" size={28} color={isMuted ? "#000" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
                onPress={toggleSpeaker}
              >
                <Ionicons name="volume-high" size={28} color={isSpeaker ? "#000" : "#fff"} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.callActions}>
            {showAcceptButton && (
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
        <>
          <MainStackScreen />
          {renderOverlay()}
          <AppTutorial visible={showTutorial} onClose={handleCloseTutorial} />
        </>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
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
  controlBtn: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'rgba(255,255,255,0.15)' 
  },
  controlBtnActive: { 
    backgroundColor: 'rgba(255,255,255,0.9)' 
  },
  controlLabel: { color: '#fff', fontSize: 12, marginTop: 5 },
  callActions: { flexDirection: 'row', gap: 40, marginTop: 40 },
  btn: { width: 75, height: 75, borderRadius: 40, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  accept: { backgroundColor: COLORS.success },
  hangup: { backgroundColor: COLORS.danger },
});

type AppTutorialProps = {
  visible: boolean;
  onClose: () => void;
};

function AppTutorial({ visible, onClose }: AppTutorialProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  if (!visible) return null;

  const currentSlide = TUTORIAL_SLIDES[slideIndex];
  const isLastSlide = slideIndex === TUTORIAL_SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onClose();
    } else {
      setSlideIndex(prev => prev + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={tutorialStyles.overlay}>
        <View style={tutorialStyles.card}>
          {!isLastSlide && (
            <TouchableOpacity style={tutorialStyles.skipBtn} onPress={onClose}>
              <Text style={tutorialStyles.skipText}>Salta</Text>
            </TouchableOpacity>
          )}

          <View style={tutorialStyles.imageContainer}>
            <View style={[tutorialStyles.iconBg, { backgroundColor: currentSlide.color + '18' }]}>
              <Ionicons name={currentSlide.icon as any} size={64} color={currentSlide.color} />
            </View>
          </View>

          <View style={tutorialStyles.textContainer}>
            <Text style={tutorialStyles.title}>{currentSlide.title}</Text>
            <Text style={tutorialStyles.desc}>{currentSlide.desc}</Text>
          </View>

          <View style={tutorialStyles.dotsRow}>
            {TUTORIAL_SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  tutorialStyles.dot,
                  slideIndex === idx && [tutorialStyles.activeDot, { backgroundColor: currentSlide.color }],
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[tutorialStyles.actionBtn, { backgroundColor: currentSlide.color }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={tutorialStyles.actionBtnText}>
              {isLastSlide ? 'Inizia' : 'Avanti'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const TUTORIAL_SLIDES = [
  {
    title: 'Benvenuto su SayUp!',
    desc: 'L\'app di messaggistica istantanea semplice, veloce e sicura.\nScopriamo insieme le sue funzioni principali!',
    icon: 'sparkles-outline',
    color: '#2563EB', // Matching primary blue
  },
  {
    title: 'Chat in tempo reale',
    desc: 'Invia messaggi istantanei protetti ai tuoi amici e crea gruppi per chattare tutti insieme in totale privacy.',
    icon: 'chatbubble-ellipses-outline',
    color: '#16A34A', // Matching success green
  },
  {
    title: 'Chiamate Audio',
    desc: 'Parla a voce con chi vuoi effettuando chiamate vocali stabili ad alta definizione direttamente dall\'app.',
    icon: 'call-outline',
    color: '#8B5CF6', // Purple
  },
  {
    title: 'News & Social',
    desc: 'Resta sempre aggiornato leggendo le news pubblicate e aggiungi amici inserendo il loro nickname univoco.',
    icon: 'newspaper-outline',
    color: '#DC2626', // Matching danger red
  },
];

const tutorialStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  skipBtn: {
    position: 'absolute',
    top: 24,
    right: 28,
    padding: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  imageContainer: {
    marginTop: 24,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  activeDot: {
    width: 20,
  },
  actionBtn: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
