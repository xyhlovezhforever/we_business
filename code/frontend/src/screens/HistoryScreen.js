/**
 * 对话历史页面
 *
 * 层级：
 *   Session 列表（默认视图）
 *     └─ 点击某条 → Session 详情（单条对话记录）
 *
 * 功能：
 *   - 展示所有 session，按最后更新时间降序
 *   - 当前 session 高亮（传入 currentSessionId）
 *   - 左滑 / 长按 → 删除 session
 *   - 点进去查看该 session 所有对话轮次（用户气泡 + AI 回复）
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { listSessions, deleteSession } from '../api/taskApi';
import { getToken } from '../api/authApi';

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} 天前`;
    return d.toLocaleDateString('zh-CN');
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────
// 主屏幕
// ─────────────────────────────────────────────

export default function HistoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const currentSessionId = route.params?.sessionId ?? null;

  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());

  // 每次页面聚焦时刷新登录态（从登录页返回后立即生效）
  useFocusEffect(
    useCallback(() => {
      setIsLoggedIn(!!getToken());
    }, [])
  );

  // ── List state ──
  const [listStatus, setListStatus] = useState('idle');
  const [sessions, setSessions] = useState([]);
  const [listError, setListError] = useState('');

  // ── 加载 session 列表 ──
  const loadList = useCallback(async () => {
    setListStatus('loading');
    setListError('');
    try {
      const data = await listSessions();
      setSessions(data.sessions || []);
      setListStatus('done');
    } catch (e) {
      setListError(e.message || '加载失败');
      setListStatus('error');
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadList();
  }, [loadList, isLoggedIn]);

  // 点击某条 session → 跳回首页并恢复该对话
  function openSession(session) {
    navigation.navigate('全民创业', { resumeSessionId: session.session_id });
  }

  // ── 删除 session ──
  async function doDelete(session) {
    try {
      await deleteSession(session.session_id);
      setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
    } catch (e) {
      setListError(`删除失败: ${e.message}`);
    }
  }

  // ─────────────────────────────────────────────
  // 渲染
  // ─────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.container}>

        {!isLoggedIn ? (
          <View style={styles.centered}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backBtnText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={styles.title}>对话历史</Text>
              </View>
            </View>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={styles.emptyText}>请先登录以查看对话历史</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => navigation.navigate('登录')}
            >
              <Text style={styles.retryText}>去登录</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ListView
            sessions={sessions}
            status={listStatus}
            error={listError}
            currentSessionId={currentSessionId}
            onRefresh={loadList}
            onOpen={openSession}
            onDelete={doDelete}
            onBack={() => navigation.goBack()}
          />
        )}

      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Session 列表视图
// ─────────────────────────────────────────────

function ListView({ sessions, status, error, currentSessionId, onRefresh, onOpen, onDelete, onBack }) {
  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>所有会话</Text>
          {status === 'done' && (
            <Text style={styles.subtitle}>{sessions.length} 条记录</Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshBtnText}>刷新</Text>
        </TouchableOpacity>
      </View>

      {status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'done' && sessions.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>暂无会话记录</Text>
        </View>
      )}

      {status === 'done' && sessions.length > 0 && (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.session_id}
          renderItem={({ item }) => (
            <SessionItem
              item={item}
              isCurrent={item.session_id === currentSessionId}
              onOpen={() => onOpen(item)}
              onDelete={() => onDelete(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );
}

function SessionItem({ item, isCurrent, onOpen, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  function handleDeletePress() {
    setConfirming(true);
  }

  function handleCancel() {
    setConfirming(false);
  }

  function handleConfirm() {
    setConfirming(false);
    onDelete(item);
  }

  return (
    <View style={[styles.sessionCard, isCurrent && styles.sessionCardCurrent]}>
      <TouchableOpacity
        style={styles.sessionCardLeft}
        onPress={confirming ? handleCancel : onOpen}
        activeOpacity={0.75}
      >
        <View style={styles.sessionCardTop}>
          {isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>当前</Text>
            </View>
          )}
          <Text style={styles.sessionTime}>{formatTime(item.updated_at)}</Text>
          <Text style={styles.sessionTurns}>{item.total_turns} 轮对话</Text>
        </View>
        <Text style={styles.sessionPreview} numberOfLines={2}>
          {item.last_input_preview || '（无内容）'}
        </Text>
        <Text style={styles.sessionId}>#{item.session_id.slice(0, 8)}</Text>
      </TouchableOpacity>

      {confirming ? (
        <View style={styles.confirmRow}>
          <TouchableOpacity style={styles.cancelConfirmBtn} onPress={handleCancel}>
            <Text style={styles.cancelConfirmText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmDeleteBtn} onPress={handleConfirm}>
            <Text style={styles.confirmDeleteText}>确认删除</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeletePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteBtnText}>删除</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


// ─────────────────────────────────────────────
// 样式
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, padding: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#94a3b8', fontSize: 22, fontWeight: '600', lineHeight: 28 },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 1 },
  refreshBtn: {
    backgroundColor: '#1e293b', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#334155',
  },
  refreshBtnText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
  deleteBtnHeader: {
    backgroundColor: '#450a0a', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#ef444433',
  },
  deleteBtnHeaderText: { color: '#f87171', fontSize: 13, fontWeight: '600' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#475569', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  retryText: { color: '#6366f1', fontWeight: '600', fontSize: 13 },

  // Session 列表
  listContent: { paddingBottom: 20 },
  separator: { height: 1, backgroundColor: '#1e293b', marginVertical: 2 },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4, gap: 10,
  },
  sessionCardCurrent: {
    backgroundColor: '#1e1b4b22',
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#6366f133',
  },
  sessionCardLeft: { flex: 1, gap: 4 },
  sessionCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  currentBadge: {
    backgroundColor: '#6366f122', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#6366f144',
  },
  currentBadgeText: { color: '#818cf8', fontSize: 11, fontWeight: '700' },
  sessionTime: { fontSize: 12, color: '#475569' },
  sessionTurns: { fontSize: 12, color: '#334155', marginLeft: 'auto' },
  sessionPreview: { fontSize: 14, color: '#94a3b8', lineHeight: 20 },
  sessionId: { fontSize: 11, color: '#334155', fontFamily: 'monospace' },
  deleteBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#1e293b', borderRadius: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  deleteBtnText: { color: '#f87171', fontSize: 12, fontWeight: '600' },

  confirmRow: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  cancelConfirmBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#1e293b', borderRadius: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  cancelConfirmText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  confirmDeleteBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#450a0a', borderRadius: 8,
    borderWidth: 1, borderColor: '#ef444455',
  },
  confirmDeleteText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
});

