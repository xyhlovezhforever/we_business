/**
 * 创业广场 - 帖子列表、发帖、支持、提建议
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { invokeTool } from '../api/taskApi';
import { getToken, getUsername } from '../api/authApi';
import Markdown from 'react-native-markdown-display';

// ─── 解析帖子列表（后端返回 JSON，经 invokeTool 已反序列化为 JS 对象）──
function parsePosts(raw) {
  if (!raw) return [];
  // invokeTool 的 res.result：后端返回合法 JSON 时已被解析为 JS 对象
  // 后端返回普通文字时仍是 string
  const arr = Array.isArray(raw) ? raw
    : typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })()
    : [];
  return arr.filter(p => p && p.id > 0);
}

// ─── 解析"我的帖子"文本 ──────────────────────────────────────────────
function parseMyPosts(text) {
  if (!text) return [];
  const lines = text.split('\n').filter(Boolean);
  const posts = [];
  for (const line of lines) {
    const postMatch = line.match(/📌\s*#(\d+)\s+(.+)/);
    if (postMatch) {
      posts.push({ id: parseInt(postMatch[1]), title: postMatch[2].trim() });
    }
  }
  return posts;
}

export default function PostSquareScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('square'); // 'square' | 'mine'

  // 广场数据
  const [posts, setPosts] = useState([]);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 我的帖子
  const [myPosts, setMyPosts] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  // 发帖弹窗
  const [showPublish, setShowPublish] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [neededRoles, setNeededRoles] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  // 帖子详情弹窗（含建议区）
  const [detailPost, setDetailPost] = useState(null);
  const [detailText, setDetailText] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  // 支持数乐观更新
  const [supportingId, setSupportingId] = useState(null);

  const loadSquare = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await invokeTool('startup_post', { action: 'list' });
      // 有帖子时 res.result 是已解析的 JS 数组；无帖子时是普通文字字符串
      const parsed = parsePosts(res.result);
      setRawText(parsed.length === 0 && typeof res.result === 'string' ? res.result : '');
      setPosts(parsed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMyPosts = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setMyLoading(true);
    try {
      const username = getUsername() || 'default';
      const res = await invokeTool('startup_post', { action: 'my_posts', user_id: username });
      const text = typeof res.result === 'string' ? res.result : '';
      setMyPosts(parseMyPosts(text));
    } catch (e) {
      console.error(e);
    } finally {
      setMyLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadSquare();
    loadMyPosts();
  }, [loadSquare, loadMyPosts]));

  const handlePublish = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    const token = getToken();
    if (!token) { navigation.navigate('登录'); return; }
    setPosting(true);
    setPostError(null);
    try {
      const username = getUsername() || 'default';
      const res = await invokeTool('startup_post', {
        action: 'publish',
        title: title.trim(),
        content: content.trim(),
        needed_roles: neededRoles.trim(),
        user_id: username,
      });
      if (res.success) {
        setShowPublish(false);
        setTitle(''); setContent(''); setNeededRoles('');
        loadSquare(true);
        loadMyPosts();
      } else {
        setPostError(typeof res.error === 'string' ? res.error : '发帖失败');
      }
    } catch (e) {
      setPostError(e.message || '网络错误');
    } finally {
      setPosting(false);
    }
  }, [title, content, neededRoles, navigation, loadSquare, loadMyPosts]);

  // 支持/取消支持切换
  const handleSupport = useCallback(async (post) => {
    const token = getToken();
    if (!token) { navigation.navigate('登录'); return; }
    setSupportingId(post.id);
    const cancelling = post.mySupport;
    // 乐观更新
    setPosts(prev => prev.map(p =>
      p.id === post.id
        ? { ...p, supportCount: p.supportCount + (cancelling ? -1 : 1), mySupport: !cancelling }
        : p
    ));
    try {
      const username = getUsername() || 'default';
      const res = await invokeTool('startup_post', {
        action: cancelling ? 'unsupport' : 'support',
        post_id: String(post.id),
        user_id: username,
      });
      const data = (typeof res.result === 'object' && res.result !== null)
        ? res.result
        : (() => { try { return JSON.parse(res.result); } catch { return {}; } })();
      const realCount = data?.supportCount ?? null;
      setPosts(prev => prev.map(p =>
        p.id !== post.id ? p : {
          ...p,
          supportCount: realCount !== null ? realCount : p.supportCount,
          mySupport: !cancelling,
        }
      ));
    } catch {
      // 失败回滚
      setPosts(prev => prev.map(p =>
        p.id === post.id
          ? { ...p, supportCount: p.supportCount + (cancelling ? 1 : -1), mySupport: cancelling }
          : p
      ));
    } finally {
      setSupportingId(null);
    }
  }, [navigation]);

  // 查看详情（含建议列表）
  const handleViewDetail = useCallback(async (post) => {
    setDetailPost(post);
    setDetailText('');
    setDetailLoading(true);
    setCommentText('');
    try {
      const username = getUsername() || 'default';
      const res = await invokeTool('startup_post', {
        action: 'detail',
        post_id: String(post.id),
        user_id: username,
      });
      setDetailText(typeof res.result === 'string' ? res.result : '加载失败');
    } catch (e) {
      setDetailText('加载失败：' + e.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 提交建议
  const handleComment = useCallback(async () => {
    if (!detailPost || !commentText.trim()) return;
    const token = getToken();
    if (!token) { navigation.navigate('登录'); return; }
    setCommenting(true);
    try {
      const username = getUsername() || 'default';
      const res = await invokeTool('startup_post', {
        action: 'comment',
        post_id: String(detailPost.id),
        user_id: username,
        comment: commentText.trim(),
      });
      const msg = typeof res.result === 'string' ? res.result : '建议已提交';
      Alert.alert('', msg);
      setCommentText('');
      // 刷新详情，显示新建议
      handleViewDetail(detailPost);
    } catch (e) {
      Alert.alert('失败', e.message || '提交失败，请重试');
    } finally {
      setCommenting(false);
    }
  }, [detailPost, commentText, navigation, handleViewDetail]);

  const handleDeletePost = useCallback(async (postId) => {
    try {
      const username = getUsername() || 'default';
      await invokeTool('startup_post', {
        action: 'delete',
        post_id: String(postId),
        user_id: username,
      });
      loadMyPosts();
      loadSquare(true);
    } catch (e) {
      Alert.alert('删除失败', e.message || '请重试');
    }
  }, [loadMyPosts, loadSquare]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 顶部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📢 创业广场</Text>
        <TouchableOpacity style={styles.publishBtn} onPress={() => {
          const token = getToken();
          if (!token) { navigation.navigate('登录'); return; }
          setShowPublish(true);
        }}>
          <Text style={styles.publishBtnText}>+ 发帖</Text>
        </TouchableOpacity>
      </View>

      {/* Tab 切换 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'square' && styles.tabActive]}
          onPress={() => setTab('square')}
        >
          <Text style={[styles.tabText, tab === 'square' && styles.tabTextActive]}>广场</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'mine' && styles.tabActive]}
          onPress={() => setTab('mine')}
        >
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>我的帖子</Text>
        </TouchableOpacity>
      </View>

      {/* 广场 Tab */}
      {tab === 'square' && (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#f59e0b" size="large" />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadSquare(true)} tintColor="#f59e0b" />
            }
          >
            {posts.length === 0 ? (
              <Text style={styles.emptyText}>{rawText || '暂无帖子，快来发第一帖！'}</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {posts.map((post) => (
                  <View key={post.id} style={styles.postCard}>
                    <View style={styles.postCardHeader}>
                      <Text style={styles.postIdBadge}>#{post.id}</Text>
                      <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
                    </View>
                    {post.roles && post.roles !== '不限' ? (
                      <Text style={styles.postInfo}>🤝 需要：{post.roles}</Text>
                    ) : null}
                    <View style={styles.postActions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleViewDetail(post)}>
                        <Text style={styles.actionBtnText}>💬 查看 / 提建议</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.supportBtn,
                          post.mySupport && styles.supportBtnDone,
                          supportingId === post.id && styles.supportBtnActive,
                        ]}
                        onPress={() => handleSupport(post)}
                        disabled={supportingId === post.id}
                      >
                        <Text style={[styles.supportBtnText, post.mySupport && styles.supportBtnTextDone]}>
                          {post.mySupport ? '❤️ 已支持' : '🤍'} {post.supportCount}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      )}

      {/* 我的帖子 Tab */}
      {tab === 'mine' && (
        myLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#f59e0b" size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={loadMyPosts} tintColor="#f59e0b" />
            }
          >
            {myPosts.length === 0 ? (
              <Text style={styles.emptyText}>创兄还没有发布过帖子</Text>
            ) : (
              <View style={{ gap: 16 }}>
                {myPosts.map((post) => (
                  <MyPostCard
                    key={post.id}
                    post={post}
                    onDelete={handleDeletePost}
                    onView={handleViewDetail}
                  />
                ))}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      )}

      {/* 发帖弹窗 */}
      <Modal visible={showPublish} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📝 发布创业帖子</Text>
              <TouchableOpacity onPress={() => setShowPublish(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>帖子标题 *</Text>
              <TextInput
                style={styles.input}
                placeholder="简洁描述你的创业项目..."
                placeholderTextColor="#475569"
                value={title}
                onChangeText={setTitle}
              />
              <Text style={styles.fieldLabel}>项目详情 *</Text>
              <TextInput
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                placeholder="详细介绍项目背景、进展、需要什么方向的支持..."
                placeholderTextColor="#475569"
                multiline
                value={content}
                onChangeText={setContent}
              />
              <Text style={styles.fieldLabel}>需要的角色（选填，逗号分隔）</Text>
              <TextInput
                style={styles.input}
                placeholder="如：后端开发, UI设计, 市场推广"
                placeholderTextColor="#475569"
                value={neededRoles}
                onChangeText={setNeededRoles}
              />
              {postError ? <Text style={styles.errorText}>⚠️ {postError}</Text> : null}
              <TouchableOpacity
                style={[styles.submitBtn, (!title.trim() || !content.trim() || posting) && styles.submitBtnDisabled]}
                onPress={handlePublish}
                disabled={!title.trim() || !content.trim() || posting}
              >
                {posting ? <ActivityIndicator color="#0a0f1e" /> : <Text style={styles.submitBtnText}>🚀 发布帖子</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 帖子详情 + 建议区弹窗 */}
      <Modal visible={!!detailPost} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                #{detailPost?.id} {detailPost?.title}
              </Text>
              <TouchableOpacity onPress={() => setDetailPost(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {detailLoading ? (
                <ActivityIndicator color="#f59e0b" style={{ marginVertical: 40 }} />
              ) : (
                <Markdown style={mdStyles}>{detailText}</Markdown>
              )}
              <View style={styles.divider} />
              <Text style={styles.fieldLabel}>💡 给创兄提个建议</Text>
              <TextInput
                style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
                placeholder="分享你对这个项目的看法或建议..."
                placeholderTextColor="#475569"
                multiline
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                style={[styles.commentBtn, (!commentText.trim() || commenting) && styles.submitBtnDisabled]}
                onPress={handleComment}
                disabled={!commentText.trim() || commenting}
              >
                {commenting
                  ? <ActivityIndicator color="#0a0f1e" />
                  : <Text style={styles.commentBtnText}>📨 提交建议</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MyPostCard({ post, onDelete, onView }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.myPostCard}>
      <View style={styles.myPostHeader}>
        <Text style={styles.myPostTitle} numberOfLines={2}>
          📌 #{post.id} {post.title}
        </Text>
        {confirming ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={styles.cancelConfirmBtn} onPress={() => setConfirming(false)}>
              <Text style={styles.cancelConfirmText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmDeleteBtn}
              onPress={() => { setConfirming(false); onDelete(post.id); }}
            >
              <Text style={styles.confirmDeleteText}>确认删除</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={styles.viewPostBtn} onPress={() => onView(post)}>
              <Text style={styles.viewPostBtnText}>💬 建议</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deletePostBtn} onPress={() => setConfirming(true)}>
              <Text style={styles.deletePostBtnText}>🗑 删除</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  backBtn: { paddingRight: 12 },
  backText: { color: '#60a5fa', fontSize: 14 },
  headerTitle: { flex: 1, color: '#f1f5f9', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  publishBtn: {
    backgroundColor: '#f59e0b', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  publishBtnText: { color: '#0a0f1e', fontSize: 13, fontWeight: '800' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#f59e0b' },
  tabText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#f59e0b', fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 60, fontSize: 14, lineHeight: 22 },
  postCard: {
    backgroundColor: '#0f1f38', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1e3a5f', gap: 10,
  },
  postCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  postIdBadge: {
    backgroundColor: '#1e3a5f', color: '#60a5fa',
    fontSize: 11, fontWeight: '800',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  postTitle: { flex: 1, color: '#f1f5f9', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  postInfo: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  postActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  actionBtnText: { color: '#94a3b8', fontSize: 13 },
  supportBtn: {
    backgroundColor: '#2d1515', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#7f1d1d',
  },
  supportBtnActive: { opacity: 0.6 },
  supportBtnDone: { backgroundColor: '#1a1a2e', borderColor: '#f87171' },
  supportBtnTextDone: { color: '#f87171' },
  supportBtnText: { color: '#f87171', fontSize: 14, fontWeight: '800' },
  // 我的帖子
  myPostCard: {
    backgroundColor: '#0f1f38', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1e3a5f',
  },
  myPostHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  myPostTitle: { flex: 1, color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  viewPostBtn: {
    backgroundColor: '#0f2a4a', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#3b82f6',
  },
  viewPostBtnText: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },
  deletePostBtn: {
    backgroundColor: '#450a0a', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#7f1d1d',
  },
  deletePostBtnText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  cancelConfirmBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#1e293b', borderRadius: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  cancelConfirmText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  confirmDeleteBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#450a0a', borderRadius: 8,
    borderWidth: 1, borderColor: '#ef444455',
  },
  confirmDeleteText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '88%',
    borderWidth: 1, borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { flex: 1, color: '#f1f5f9', fontSize: 16, fontWeight: '800', marginRight: 8 },
  closeBtn: { color: '#64748b', fontSize: 20, padding: 4 },
  fieldLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#0a0f1e', borderRadius: 12, padding: 12,
    color: '#f1f5f9', fontSize: 14, borderWidth: 1, borderColor: '#1e3a5f',
  },
  errorText: { color: '#f87171', fontSize: 13, marginVertical: 8 },
  submitBtn: {
    backgroundColor: '#f59e0b', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16, marginBottom: 8,
  },
  submitBtnDisabled: { backgroundColor: '#1e293b' },
  submitBtnText: { color: '#0a0f1e', fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#1e293b', marginVertical: 16 },
  commentBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#3b82f6',
  },
  commentBtnText: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
});

const mdStyles = {
  body: { color: '#cbd5e1', fontSize: 14, lineHeight: 22 },
  heading1: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginVertical: 8 },
  heading2: { color: '#f59e0b', fontSize: 15, fontWeight: '700', marginVertical: 6 },
  heading3: { color: '#94a3b8', fontSize: 14, fontWeight: '700', marginVertical: 4 },
  strong: { color: '#f1f5f9', fontWeight: '700' },
  bullet_list: { marginVertical: 4 },
  list_item: { color: '#cbd5e1', marginVertical: 2 },
  hr: { backgroundColor: '#1e293b', height: 1, marginVertical: 12 },
  code_inline: { backgroundColor: '#0a0f1e', color: '#7dd3fc', borderRadius: 4 },
  fence: { backgroundColor: '#0a0f1e', borderRadius: 8, padding: 8 },
  code_block: { color: '#7dd3fc', fontSize: 12 },
};
