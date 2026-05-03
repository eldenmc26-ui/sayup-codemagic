// src/screens/NewsScreen.tsx
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from './useStore';
import { subscribeToNews, type NewsItem } from './newsService';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { COLORS } from './theme';
import NewsAdBanner from './NewsAdBanner';

export default function NewsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useStore();
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    if (!user?.isAdmin) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminNews')}
          activeOpacity={0.8}
          style={{ marginRight: 12, paddingHorizontal: 10, paddingVertical: 6 }}
        >
          <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '600' }}>Crea</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, user?.isAdmin]);

  useEffect(() => {
    if (!user) {
      setNews([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const timeout = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 2500);

    const unsub = subscribeToNews(
      (items) => {
        clearTimeout(timeout);
        setNews(items);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        clearTimeout(timeout);
        setNews([]);
        setLoading(false);
        setRefreshing(false);
      },
    );
    return unsub;
  }, [user]);

  function handleRefresh() {
    setRefreshing(true);
  }

  function openNewsDetail(newsId: string) {
    navigation.navigate('NewsDetail', { newsId });
  }

  function timeAgo(ts: number) {
    return formatDistanceToNow(new Date(ts), { locale: it, addSuffix: true });
  }

  const categoryColors: Record<string, string> = {
    Tech:     '#4CAF50',
    Sport:    '#2196F3',
    Finanza:  '#FF9800',
    Musica:   '#E91E63',
    Politica: '#9C27B0',
    Scienza:  '#00BCD4',
    Cinema:   '#F44336',
    Gaming:   '#3F51B5',
    Viaggi:   '#009688',
    Cucina:   '#FF5722',
  };

  return (
    <View style={s.root}>
      {user?.isAdmin && (
        <View style={s.adminBanner}>
          <Text style={s.adminText}>👑 Sei admin — puoi gestire le news</Text>
        </View>
      )}

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        : (
          <FlatList
            data={news}
            keyExtractor={n => n.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
            }
            ListHeaderComponent={
              <>
                <NewsAdBanner />
              </>
            }
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📰</Text>
                <Text style={s.emptyText}>
                  Niente da vedere qui.
                </Text>
              </View>
            }
            renderItem={({ item: n, index }) => (
              <TouchableOpacity
                style={s.newsItem}
                onPress={() => openNewsDetail(n.id)}
                activeOpacity={0.7}
              >
                <View style={[s.categoryPill, { backgroundColor: categoryColors[n.category] ?? '#888' }]}>
                  <Text style={s.categoryText}>{n.category}</Text>
                </View>
                <Text style={s.newsTitle}>{n.title}</Text>
                {n.description ? <Text style={s.newsDescription}>{n.description}</Text> : null}
                {n.imageUrl ? <Image source={{ uri: n.imageUrl }} style={s.newsImage} /> : null}
                <Text style={s.sourceLabel}>Fonte: {n.source}</Text>
                <Text style={s.link} numberOfLines={1}>{n.url}</Text>
                <View style={s.newsMeta}>
                  <Text style={s.newsTime}>{timeAgo(n.createdAt)}</Text>
                  <Text style={s.stats}>❤️ {Object.keys(n.likes ?? {}).length}  💬 {n.commentsCount ?? 0}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      }
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  adminBanner: {
    backgroundColor: COLORS.warningBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  adminText: { fontSize: 13, color: COLORS.primaryDark, textAlign: 'center' },

  newsItem: {
    padding: 16,
    marginHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
  },
  newsImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: COLORS.surfaceMuted,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: { fontSize: 11, color: '#fff', fontWeight: '600', textTransform: 'uppercase' },
  newsTitle:    { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 22, marginBottom: 6 },
  newsDescription: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 8 },
  newsMeta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  newsTime:     { fontSize: 12, color: COLORS.textSoft },
  stats:        { fontSize: 12, color: COLORS.textMuted },
  sourceLabel:  { fontSize: 13, color: COLORS.text, fontWeight: '600', marginTop: 10 },
  link:         { fontSize: 12, color: COLORS.primary, textDecorationLine: 'underline', marginTop: 4, marginBottom: 4 },

  empty:     { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
});
