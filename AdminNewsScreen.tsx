// src/screens/AdminNewsScreen.tsx
// Pannello per creare/modificare news e post

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { createNews, createPost, updateNews, subscribeNewsItem } from './newsService';
import { Storage, Auth } from './firebase';
import { COLORS } from './theme';
import { useStore } from './useStore';

const CATEGORIES = ['Tech', 'Sport', 'Finanza', 'Musica', 'Politica', 'Scienza', 'Cinema', 'Gaming', 'Viaggi', 'Cucina'];

export default function AdminNewsScreen({ navigation }: any) {
  const route = useRoute<any>();
  const { user } = useStore();
  const editingNewsId = route.params?.newsId as string | undefined;

  const [title, setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource]     = useState('');
  const [url, setUrl]           = useState('');
  const [category, setCategory] = useState('Tech');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const isPost = !user?.isAdmin;

  useEffect(() => {
    if (!editingNewsId) return;
    const unsub = subscribeNewsItem(editingNewsId, (item) => {
      if (item) {
        setTitle(item.title);
        setDescription(item.description);
        setSource(item.source);
        setUrl(item.url);
        setCategory(item.category);
        setExistingImageUrl(item.imageUrl);
      }
    });
    return unsub;
  }, [editingNewsId]);

  async function pickImage() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 as any });
    if (result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageUri) return existingImageUrl;

    const ref = Storage.ref(`news/${Auth.currentUser!.uid}/${Date.now()}.jpg`);
    const response = await fetch(imageUri);
    const blob = await response.blob();
    await ref.put(blob, { contentType: 'image/jpeg' });
    return await ref.getDownloadURL();
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Errore', 'Inserisci un titolo');
      return;
    }
    if (!isPost && (!source.trim() || !url.trim())) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori per le news');
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadImage();
      if (editingNewsId) {
        await updateNews(editingNewsId, {
          title: title.trim(),
          description: description.trim(),
          source: isPost ? 'SayUp Community' : source.trim(),
          category,
          url: isPost ? '' : url.trim(),
          imageUrl,
        });
        Alert.alert('✅ Fatto', isPost ? 'Post aggiornato' : 'News aggiornata');
      } else {
        if (isPost) {
          await createPost(
            title.trim(),
            description.trim(),
            category,
            imageUrl,
          );
          Alert.alert('✅ Fatto', 'Post pubblicato');
        } else {
          await createNews(
            title.trim(),
            description.trim(),
            source.trim(),
            category,
            url.trim(),
            imageUrl,
          );
          Alert.alert('✅ Fatto', 'News pubblicata');
        }
        setTitle('');
        setDescription('');
        setSource('');
        setUrl('');
        setImageUri(null);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Errore', e.message ?? 'Impossibile salvare il contenuto');
    } finally {
      setLoading(false);
    }
  }

  const displayImage = imageUri ?? existingImageUrl;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>
        {editingNewsId 
          ? (isPost ? 'Modifica post' : 'Modifica news') 
          : (isPost ? 'Crea nuovo post' : 'Crea nuova news')}
      </Text>

      <Text style={s.label}>Titolo</Text>
      <TextInput
        style={s.input}
        value={title}
        onChangeText={setTitle}
        placeholder={isPost ? "Scrivi un titolo accattivante..." : "Es. Apple annuncia il nuovo chip M4"}
        placeholderTextColor="#aaa"
        maxLength={200}
      />

      <Text style={s.label}>Descrizione / Contenuto</Text>
      <TextInput
        style={[s.input, s.inputMulti]}
        value={description}
        onChangeText={setDescription}
        placeholder="Scrivi il corpo del post o un riassunto..."
        placeholderTextColor="#aaa"
        multiline
        maxLength={500}
      />

      {!isPost && (
        <>
          <Text style={s.label}>Fonte</Text>
          <TextInput
            style={s.input}
            value={source}
            onChangeText={setSource}
            placeholder="Es. TechCrunch"
            placeholderTextColor="#aaa"
            maxLength={50}
          />

          <Text style={s.label}>URL Fonte</Text>
          <TextInput
            style={s.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            keyboardType="url"
          />
        </>
      )}

      <Text style={s.label}>Categoria</Text>
      <View style={s.tagsWrap}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.tag, category === cat && s.tagActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[s.tagText, category === cat && s.tagTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Immagine</Text>
      <TouchableOpacity style={s.imagePicker} onPress={pickImage} activeOpacity={0.85}>
        {displayImage
          ? <Image source={{ uri: displayImage }} style={s.previewImage} />
          : <Text style={s.imagePickerText}>Seleziona immagine</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btnPrimary, loading && s.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>
              {editingNewsId 
                ? 'Salva modifiche' 
                : (isPost ? 'Pubblica post' : 'Pubblica news')}
            </Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, gap: 12 },

  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 8 },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface,
  },
  inputMulti: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  imagePickerText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tagActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tagText:       { fontSize: 13, color: COLORS.textMuted },
  tagTextActive: { color: COLORS.white, fontWeight: '600' },

  btnPrimary: {
    backgroundColor: COLORS.primary, borderRadius: 28,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
