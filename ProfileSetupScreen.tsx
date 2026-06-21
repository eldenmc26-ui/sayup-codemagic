// src/screens/ProfileSetupScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, Alert, Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useStore } from './useStore';
import { updateUserProfile } from './authService';
import { Storage } from './firebase';
import { Auth } from './firebase';
import { COLORS } from './theme';

export default function ProfileSetupScreen() {
  const { user, setUser } = useStore();
  const [displayName, setDisplayName] = useState(user?.nickname ?? '');
  const [bio, setBio]                 = useState('');
  const [photoUri, setPhotoUri]       = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  async function pickPhoto() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
  }

  async function uploadPhoto(uid: string): Promise<string | null> {
    if (!photoUri) return null;
    const ref  = Storage.ref(`avatars/${uid}/profile.jpg`);
    if (Platform.OS === 'web') {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      await ref.put(blob);
    } else {
      await ref.putFile(photoUri);
    }
    return await ref.getDownloadURL();
  }

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert('Errore', 'Inserisci il tuo nome');
      return;
    }
    setLoading(true);
    try {
      const uid      = Auth.currentUser!.uid;
      const photoURL = await uploadPhoto(uid);
      const updates  = { displayName: displayName.trim(), bio, photoURL };
      await updateUserProfile(uid, updates);
      setUser({ ...user!, ...updates });
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? 'Impossibile salvare il profilo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Il tuo profilo</Text>
      <Text style={s.subtitle}>Puoi modificarlo in qualsiasi momento dalle impostazioni.</Text>

      {/* Avatar */}
      <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto}>
        {photoUri
          ? <Image source={{ uri: photoUri }} style={s.avatar} />
          : <View style={s.avatarPlaceholder}><Text style={s.avatarIcon}>📷</Text><Text style={s.avatarLabel}>Aggiungi foto</Text></View>
        }
      </TouchableOpacity>

      {/* Nome */}
      <Text style={s.label}>Nome visualizzato</Text>
      <TextInput
        style={s.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Come ti chiamano?"
        placeholderTextColor="#aaa"
        maxLength={40}
      />

      {/* Bio */}
      <Text style={s.label}>Bio <Text style={s.optional}>(opzionale)</Text></Text>
      <TextInput
        style={[s.input, s.inputMulti]}
        value={bio}
        onChangeText={setBio}
        placeholder="Raccontaci qualcosa di te..."
        placeholderTextColor="#aaa"
        multiline
        maxLength={120}
      />

      <TouchableOpacity
        style={[s.btnPrimary, loading && s.btnDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>Vai a SayUp →</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48, gap: 12 },

  title:    { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20, marginBottom: 12 },

  avatarWrap:        { alignSelf: 'center', marginBottom: 8 },
  avatar:            { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primarySoft },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  avatarIcon:  { fontSize: 28 },
  avatarLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  label:     { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 8 },
  optional:  { fontWeight: '400', color: COLORS.textSoft },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  btnPrimary: {
    backgroundColor: COLORS.primary, borderRadius: 28,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
