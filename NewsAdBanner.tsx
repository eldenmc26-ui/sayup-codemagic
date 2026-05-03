// src/components/NewsAdBanner.tsx
// Banner sponsor personalizzato da Firestore (ads_custom)
// Funziona su web, Android e iOS — nessuna dipendenza nativa

import React, { useEffect, useState } from 'react';
import {
  View, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, Linking, Platform, Text,
} from 'react-native';
import { Firestore } from './firebase';
import { COLORS } from './theme';

interface CustomAdDoc {
  active: boolean;
  imageUrl: string;
  linkUrl: string;
  title?: string;
  description?: string;
}

export default function NewsAdBanner() {
  const [customAd, setCustomAd] = useState<CustomAdDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = Firestore.collection('ads_custom')
      .where('active', '==', true)
      .limit(1)
      .onSnapshot(
        (snap: any) => {
          console.log('[Ads] Snapshot ricevuto, numero documenti:', snap.size);
          if (snap.empty) {
            console.log('[Ads] Nessun documento attivo trovato con active == true');
            setCustomAd(null);
          } else {
            const data = snap.docs[0].data();
            console.log('[Ads] Dati pubblicità caricati con successo:', data.title);
            setCustomAd(data as CustomAdDoc);
          }
          setLoading(false);
        },
        (err: any) => {
          console.error('[Ads] Errore durante il recupero delle pubblicità:', err);
          setCustomAd(null);
          setLoading(false);
        },
      );
    return unsub;
  }, []);

  function handleOpenLink(url: string) {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  }

  if (loading) {
    return (
      <View style={s.cardPlaceholder}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  // Nessun banner attivo
  if (!customAd?.imageUrl) {
    // Se siamo su Mobile e non c'è una pubblicità custom, qui andrebbe il componente AdMob
    if (Platform.OS !== 'web') {
      return (
        <View style={s.adMobCard}>
          <Text style={s.adMobText}>Post Sponsorizzato</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <TouchableOpacity
      style={s.newsItemAd}
      onPress={() => handleOpenLink(customAd.linkUrl)}
      activeOpacity={0.9}
      accessibilityLabel={customAd.title || 'Pubblicità sponsor'}
    >
      <View style={s.categoryPillAd}>
        <Text style={s.categoryTextAd}>Sponsorizzato</Text>
      </View>
      <Text style={s.newsTitleAd}>{customAd.title || 'In evidenza oggi'}</Text>
      {customAd.description ? <Text style={s.newsDescriptionAd}>{customAd.description}</Text> : null}
      <Image
        source={{ uri: customAd.imageUrl }}
        style={s.newsImageAd}
        resizeMode="cover"
      />
      <TouchableOpacity onPress={() => handleOpenLink(customAd.linkUrl)}>
        <Text style={s.linkAd}>Scopri di più su {customAd.linkUrl.replace('https://', '').split('/')[0]}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  newsItemAd: {
    padding: 16,
    marginHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
  },
  cardPlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surfaceMuted, margin: 14, borderRadius: 18 },
  adMobCard: { height: 260, backgroundColor: COLORS.surfaceMuted, margin: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  adMobText: { color: COLORS.textSoft, fontSize: 14, fontWeight: '600' },
  categoryPillAd: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.primary,
  },
  categoryTextAd: { fontSize: 11, color: '#fff', fontWeight: '600', textTransform: 'uppercase' },
  newsTitleAd:    { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 22, marginBottom: 6 },
  newsDescriptionAd: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 8 },
  newsImageAd: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: COLORS.surfaceMuted,
  },
  linkAd: { fontSize: 12, color: COLORS.primary, textDecorationLine: 'underline', marginTop: 4 },
});
