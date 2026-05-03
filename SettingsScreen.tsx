import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, Alert, Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useStore } from './useStore';
import { logout, updateUserProfile } from './authService';
import { Storage, Auth } from './firebase';
import { COLORS } from './theme';

export default function SettingsScreen() {
  const { user, setUser } = useStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? user?.nickname ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function pickPhoto() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function uploadPhoto(uid: string): Promise<string | null> {
    if (!photoUri) return user?.photoURL ?? null;

    const ref = Storage.ref(`avatars/${uid}/profile.jpg`);
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
      const uid = Auth.currentUser!.uid;
      const photoURL = await uploadPhoto(uid);
      const updates = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL,
      };

      await updateUserProfile(uid, updates);
      setUser({ ...user!, ...updates });
      Alert.alert('Profilo aggiornato', 'Le impostazioni sono state salvate.');
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? 'Impossibile salvare le impostazioni');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      setUser(null);
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? 'Impossibile uscire');
    } finally {
      setLoggingOut(false);
    }
  }

  const avatarSource = photoUri ?? user?.photoURL ?? null;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.title}>Impostazioni</Text>
        <Text style={s.subtitle}>Gestisci profilo, foto e accesso.</Text>
      </View>

      <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto} activeOpacity={0.85}>
        {avatarSource ? (
          <Image source={{ uri: avatarSource }} style={s.avatar} />
        ) : (
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarIcon}>📷</Text>
            <Text style={s.avatarLabel}>Cambia foto</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={s.label}>Nome visualizzato</Text>
      <TextInput
        style={s.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Come ti chiamano?"
        placeholderTextColor="#aaa"
        maxLength={40}
      />

      <Text style={s.label}>Bio</Text>
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
        activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Salva modifiche</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btnSecondary, loggingOut && s.btnDisabled]}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.85}
      >
        {loggingOut ? <ActivityIndicator color={COLORS.primary} /> : <Text style={s.btnSecondaryText}>Esci</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  avatarWrap: { alignSelf: 'center', marginBottom: 20, marginTop: 4 },
  avatar: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: COLORS.primarySoft },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  avatarIcon: { fontSize: 28 },
  avatarLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  btnSecondaryText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});
