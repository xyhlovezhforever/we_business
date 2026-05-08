/**
 * 全民创业 - 主界面
 * 创兄们的创业智能助手
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import EmotionInput from '../components/EmotionInput';
import EventFeed from '../components/EventFeed';
import { useEmotionAgent } from '../hooks/useEmotionAgent';
import { getToken, getUsername } from '../api/authApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { API_BASE } from '../api/config';

export default function HomeScreen() {
  const { status, events, error, taskId, sessionId, submit, cancel, newSession, loadSession } =
    useEmotionAgent();
  const navigation = useNavigation();
  const route = useRoute();
  const [userInfo, setUserInfo] = useState({ loggedIn: false, username: null });
  const lastResumedId = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const token = getToken();
      setUserInfo({ loggedIn: !!token, username: getUsername() });

      const resumeId = route.params?.resumeSessionId;
      if (resumeId && resumeId !== lastResumedId.current) {
        lastResumedId.current = resumeId;
        loadSession(resumeId);
      }
    }, [route.params?.resumeSessionId, loadSession])
  );

  // 拉取未读通知数量
  const fetchUnread = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { fetchUnread(); }, [fetchUnread]));

  // 收到新通知时更新红点
  useWebSocket((msg) => {
    if (msg.type === 'notification') {
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [{
        id: Date.now(),
        title: msg.title,
        body: msg.body,
        isRead: false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    }
  });

  const handleOpenNotif = useCallback(async () => {
    setShowNotif(true);
    // 标记全部已读
    const token = getToken();
    if (!token) return;
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      if (n.id && typeof n.id === 'number' && n.id < 1e12) { // 排除 Date.now() 临时ID
        fetch(`${API_BASE}/api/v1/notifications/${n.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, [notifications]);

  const isActive = status === 'loading' || status === 'streaming';

  const avatarLetter = userInfo.username
    ? userInfo.username.charAt(0).toUpperCase()
    : null;

  // 快捷功能入口
  const quickActions = [
    { icon: '💡', label: '想法增强', screen: '想法增强', desc: '小想法→大方案' },
    { icon: '📢', label: '创业广场', screen: '创业广场', desc: '发帖找合伙人' },
    { icon: '🏢', label: '临时公司', screen: '临时公司', desc: '组队一起干' },
    { icon: '🕐', label: '历史', screen: '对话历史', desc: '查看历史' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.titleEmoji}>🚀</Text>
              <Text style={styles.title}>全民创业</Text>
            </View>
            <Text style={styles.subtitle}>创兄，今天要干什么大事？</Text>
          </View>

          <View style={styles.headerActions}>
            {isActive && (
              <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
                <Text style={styles.cancelBtnText}>✕ 取消</Text>
              </TouchableOpacity>
            )}
            {/* 通知铃铛 */}
            {userInfo.loggedIn && (
              <TouchableOpacity style={styles.iconBtn} onPress={handleOpenNotif}>
                <Text style={styles.iconBtnText}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={newSession}>
              <Text style={styles.iconBtnText}>✏️</Text>
            </TouchableOpacity>
            {userInfo.loggedIn ? (
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => navigation.navigate('设置')}
              >
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.navigate('登录')}
              >
                <Text style={styles.loginBtnText}>登录</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 状态栏 */}
        <AgentStatusBar status={status} taskId={taskId} eventsCount={events.length} />

        {/* 内容区 */}
        <View style={styles.content}>
          <EventFeed events={events} style={styles.feed} isActive={isActive} />

          {status === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {status === 'idle' && events.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚀</Text>
              <Text style={styles.emptyTitle}>创兄，开始你的创业之旅！</Text>
              <Text style={styles.emptyDesc}>
                告诉我你的想法，或者发帖找合伙人，一起把梦想变成现实！
              </Text>

              {/* 快速入口网格 */}
              <View style={styles.quickGrid}>
                {quickActions.map((item) => (
                  <TouchableOpacity
                    key={item.screen}
                    style={styles.quickCard}
                    onPress={() => navigation.navigate(item.screen)}
                  >
                    <Text style={styles.quickIcon}>{item.icon}</Text>
                    <Text style={styles.quickLabel}>{item.label}</Text>
                    <Text style={styles.quickDesc}>{item.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 示例提示 */}
              <View style={styles.exampleBox}>
                <Text style={styles.exampleTitle}>💬 试试说：</Text>
                <Text style={styles.exampleItem} onPress={() => submit('我想开一家网红奶茶店，帮我做一个创业方案')}>
                  "我想开一家网红奶茶店，帮我做创业方案"
                </Text>
                <Text style={styles.exampleItem} onPress={() => submit('帮我发一个帖子，寻找技术合伙人做AI产品')}>
                  "帮我发帖寻找技术合伙人"
                </Text>
                <Text style={styles.exampleItem} onPress={() => submit('帮我创建一个临时创业公司，名字叫极速AI工作室')}>
                  "帮我创建一个临时创业公司"
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 底部输入框 */}
        <EmotionInput
          onSubmit={submit}
          onStop={cancel}
          disabled={isActive}
          placeholder="创兄，说说你的创业想法..."
        />
      </View>

      {/* 通知中心 Modal */}
      <Modal visible={showNotif} animationType="slide" transparent>
        <View style={styles.notifOverlay}>
          <View style={styles.notifCard}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>🔔 通知中心</Text>
              <TouchableOpacity onPress={() => setShowNotif(false)}>
                <Text style={styles.notifClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }}>
              {notifications.length === 0 ? (
                <Text style={styles.notifEmpty}>暂无通知</Text>
              ) : notifications.map((n, i) => (
                <View key={n.id || i} style={[styles.notifItem, !n.isRead && styles.notifItemUnread]}>
                  {!n.isRead && <View style={styles.unreadDot} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifItemTitle}>{n.title}</Text>
                    <Text style={styles.notifItemBody}>{n.body}</Text>
                    <Text style={styles.notifItemTime}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AgentStatusBar({ status, taskId, eventsCount }) {
  if (status === 'idle' || status === 'done') return null;

  const statusMap = {
    loading: { text: '连接中...', color: '#f59e0b', dot: true },
    streaming: { text: `AI 正在为创兄规划 · ${eventsCount} 条事件`, color: '#22c55e', dot: true },
    error: { text: '连接出错', color: '#ef4444', dot: false },
  };

  const s = statusMap[status] || { text: status, color: '#94a3b8', dot: false };

  return (
    <View style={[styles.statusBar, { borderColor: s.color + '44' }]}>
      {s.dot && <ActivityIndicator size="small" color={s.color} />}
      <Text style={[styles.statusText, { color: s.color }]}>{s.text}</Text>
      {taskId && <Text style={styles.taskIdText}>#{taskId.slice(0, 8)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleEmoji: { fontSize: 22 },
  title: {
    fontSize: 22, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5,
  },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 16 },
  cancelBtn: {
    backgroundColor: '#450a0a', borderRadius: 18,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#ef444455',
  },
  cancelBtnText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fbbf24',
  },
  avatarLetter: { color: '#0a0f1e', fontSize: 15, fontWeight: '800' },
  loginBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: '#3b82f6',
  },
  loginBtnText: { color: '#60a5fa', fontSize: 13, fontWeight: '700' },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e293b', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  statusText: { fontSize: 13, fontWeight: '600', flex: 1 },
  taskIdText: { fontSize: 11, color: '#475569', fontFamily: 'monospace' },
  content: { flex: 1 },
  feed: { flex: 1 },
  errorBox: {
    backgroundColor: '#450a0a', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#ef444444',
  },
  errorText: { color: '#fca5a5', fontSize: 14 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 8,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: {
    fontSize: 19, fontWeight: '800', color: '#f1f5f9', textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20,
  },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginTop: 12, width: '100%', justifyContent: 'center',
  },
  quickCard: {
    width: '46%', backgroundColor: '#0f1f38',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#1e3a5f',
  },
  quickIcon: { fontSize: 26 },
  quickLabel: { fontSize: 13, color: '#f1f5f9', fontWeight: '700' },
  quickDesc: { fontSize: 11, color: '#64748b', textAlign: 'center' },
  exampleBox: {
    marginTop: 12, backgroundColor: '#0f172a',
    borderRadius: 14, padding: 14, width: '100%',
    borderWidth: 1, borderColor: '#1e293b', gap: 6,
  },
  exampleTitle: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginBottom: 4 },
  exampleItem: {
    fontSize: 13, color: '#60a5fa', lineHeight: 20,
    paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  // 铃铛红点
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#ef4444', borderRadius: 8,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  // 通知 Modal
  notifOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  notifCard: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, borderWidth: 1, borderColor: '#1e293b',
  },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  notifTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '800' },
  notifClose: { color: '#64748b', fontSize: 20, padding: 4 },
  notifEmpty: { color: '#64748b', textAlign: 'center', marginVertical: 40, fontSize: 14 },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  notifItemUnread: { backgroundColor: '#0f1f38', borderRadius: 10, paddingHorizontal: 8 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#f59e0b', marginTop: 5, flexShrink: 0,
  },
  notifItemTitle: { color: '#f1f5f9', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  notifItemBody: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
  notifItemTime: { color: '#475569', fontSize: 11, marginTop: 4 },
});
