// src/screens/NewsDetailScreen.tsx
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Share, TextInput, Alert, ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStore } from './useStore';
import {
  subscribeNewsItem, subscribeComments, toggleLike, addComment,
  deleteNews, type NewsItem, type Comment,
} from './newsService';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Auth } from './firebase';
import { COLORS } from './theme';

export default function NewsDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { newsId } = route.params;
  const { user } = useStore();

  const [news, setNews] = useState<NewsItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);

  const myUid = Auth.currentUser?.uid;

  useLayoutEffect(() => {
    if (!news) return;
    const isCreator = news.createdBy === myUid;
    const canEdit = user?.isAdmin || isCreator;
    const canDelete = user?.isAdmin || isCreator;
    const isPost = news.type !== 'news';

    navigation.setOptions({
      title: isPost ? 'Post Community' : 'News Ufficiale',
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 16, marginRight: 12 }}>
          {canEdit && (
            <TouchableOpacity onPress={() => navigation.navigate('AdminNews', { newsId })} activeOpacity={0.8}>
              <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '600' }}>Modifica</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(isPost ? 'Elimina post' : 'Elimina news', 'Sei sicuro?', [
                  { text: 'Annulla', style: 'cancel' },
                  {
                    text: 'Elimina', style: 'destructive', onPress: async () => {
                      await deleteNews(newsId);
                      navigation.goBack();
                    }
                  },
                ]);
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: COLORS.danger, fontSize: 14, fontWeight: '600' }}>Elimina</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, news, user, myUid, newsId]);

  useEffect(() => {
    const unsubNews = subscribeNewsItem(newsId, (item) => {
      setNews(item);
      setLoading(false);
    });
    const unsubComments = subscribeComments(newsId, (items) => {
      setComments(items);
    });
    return () => {
      unsubNews();
      unsubComments();
    };
  }, [newsId]);

  function handleLike() {
    if (!myUid) return;
    toggleLike(newsId, myUid).catch(() => {});
  }

  async function handleShare() {
    if (!news) return;
    try {
      await Share.share({
        message: `${news.title}\n${news.url}`,
      });
    } catch {}
  }

  async function handleSendComment() {
    if (!commentText.trim() || !myUid || !user) return;
    setSendingComment(true);
    try {
      await addComment(newsId, commentText, myUid, user.displayName || user.nickname);
      setCommentText('');
    } finally {
      setSendingComment(false);
    }
  }

  function openLink(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  function timeAgo(ts: number) {
    return formatDistanceToNow(new Date(ts), { locale: it, addSuffix: true });
  }

  if (loading || !news) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const liked = myUid ? news.likes?.[myUid] === true : false;
  const likeCount = Object.keys(news.likes ?? {}).length;

  const categoryColors: Record<string, string> = {
    Tech: '#4CAF50', Sport: '#2196F3', Finanza: '#FF9800',
    Musica: '#E91E63', Politica: '#9C27B0', Scienza: '#00BCD4',
    Cinema: '#F44336', Gaming: '#3F51B5', Viaggi: '#009688', Cucina: '#FF5722',
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {news.imageUrl ? <Image source={{ uri: news.imageUrl }} style={s.newsImage} /> : null}

        <View style={[s.categoryPill, { backgroundColor: categoryColors[news.category] ?? '#888' }]}>
          <Text style={s.categoryText}>{news.category}</Text>
        </View>

        <Text style={s.title}>{news.title}</Text>
        {news.description ? <Text style={s.description}>{news.description}</Text> : null}

        {news.type === 'news' ? (
          <>
            <Text style={s.sourceLabel}>Fonte: {news.source}</Text>
            <TouchableOpacity onPress={() => openLink(news.url)} activeOpacity={0.7}>
              <Text style={s.link} numberOfLines={2}>{news.url}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={s.authorLabel}>Postato da @{news.authorName || 'Utente'}</Text>
        )}

        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionBtn} onPress={handleLike} activeOpacity={0.8}>
            <Text style={[s.actionIcon, liked && s.actionIconActive]}>{liked ? '❤️' : '🤍'}</Text>
            <Text style={s.actionCount}>{likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionBtn} onPress={handleShare} activeOpacity={0.8}>
            <Text style={s.actionIcon}>🔗</Text>
            <Text style={s.actionLabel}>Condividi</Text>
          </TouchableOpacity>
        </View>

        <View style={s.commentsSection}>
          <Text style={s.commentsTitle}>Commenti ({news.commentsCount ?? 0})</Text>
          {comments.length === 0 && <Text style={s.emptyComments}>Nessun commento. Scrivi il primo!</Text>}
          {comments.map((c) => (
            <View key={c.id} style={s.comment}>
              <Text style={s.commentAuthor}>{c.authorName}</Text>
              <Text style={s.commentText}>{c.text}</Text>
              <Text style={s.commentTime}>{timeAgo(c.createdAt)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={s.commentInputBar}>
        <TextInput
          style={s.commentInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Scrivi un commento..."
          placeholderTextColor="#aaa"
          multiline
          maxLength={300}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!commentText.trim() || sendingComment) && s.sendBtnDisabled]}
          onPress={handleSendComment}
          disabled={!commentText.trim() || sendingComment}
        >
          {sendingComment ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendIcon}>➤</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 24 },

  newsImage: { width: '100%', height: 220, borderRadius: 16, marginBottom: 14, backgroundColor: COLORS.surfaceMuted },

  categoryPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  categoryText: { fontSize: 11, color: '#fff', fontWeight: '600', textTransform: 'uppercase' },

  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, lineHeight: 28, marginBottom: 10 },
  description: { fontSize: 15, color: COLORS.textMuted, lineHeight: 22, marginBottom: 14 },

  sourceLabel: { fontSize: 13, color: COLORS.text, fontWeight: '600', marginBottom: 6 },
  link: { fontSize: 13, color: COLORS.primary, textDecorationLine: 'underline', marginBottom: 18 },
  authorLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500', marginBottom: 18 },

  actionsRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 20 },
  actionIconActive: { color: COLORS.danger },
  actionCount: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  actionLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },

  commentsSection: { gap: 10 },
  commentsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  emptyComments: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },

  comment: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  commentText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  commentTime: { fontSize: 11, color: COLORS.textSoft, marginTop: 4 },

  commentInputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  commentInput: { flex: 1, backgroundColor: COLORS.surfaceMuted, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#BFDBFE' },
  sendIcon: { color: COLORS.white, fontSize: 14, marginLeft: 2 },
});
