/**
 * 临时公司页面 - 创建和管理临时创业公司
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, RefreshControl, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { invokeTool } from '../api/taskApi';
import { getToken, getUsername } from '../api/authApi';
import { useWebSocket, sendChatMessage } from '../hooks/useWebSocket';
import Markdown from 'react-native-markdown-display';
import { API_BASE } from '../api/config';

export default function CompanyScreen() {
  const navigation = useNavigation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailData, setDetailData] = useState(null); // 已解析的 JSON 对象
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 群聊
  const [chatCompanyId, setChatCompanyId] = useState(null);
  const [chatCompanyName, setChatCompanyName] = useState('');
  const [showChat, setShowChat] = useState(false);

  // 创建公司表单
  const [companyName, setCompanyName] = useState('');
  const [companyDesc, setCompanyDesc] = useState('');
  const [duration, setDuration] = useState('90');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const DURATION_OPTIONS = [
    { label: '30天', value: '30' },
    { label: '60天', value: '60' },
    { label: '90天', value: '90' },
    { label: '180天', value: '180' },
  ];

  const loadCompanies = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await invokeTool('startup_company', { action: 'list' });
      if (res.success) {
        setCompanies([{ id: 'raw', raw: res.result }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadCompanies(); }, [loadCompanies]));

  const handleCreate = useCallback(async () => {
    if (!companyName.trim()) return;
    const token = getToken();
    if (!token) { navigation.navigate('登录'); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const username = getUsername() || 'default';
      const res = await invokeTool('startup_company', {
        action: 'create',
        name: companyName.trim(),
        description: companyDesc.trim() || '全民创业，共同奋斗！',
        duration_days: parseInt(duration),
        user_id: username,
      });
      if (res.success) {
        setShowModal(false);
        setCompanyName('');
        setCompanyDesc('');
        loadCompanies(true);
      } else {
        setCreateError(res.error || '创建失败');
      }
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }, [companyName, companyDesc, duration, navigation, loadCompanies]);

  const loadDetail = useCallback(async (companyId) => {
    setDetailLoading(true);
    try {
      const username = getUsername() || 'default';
      const res = await invokeTool('startup_company', {
        action: 'detail',
        company_id: String(companyId),
        user_id: username,
      });
      const data = (typeof res.result === 'object' && res.result !== null)
        ? res.result
        : (() => { try { return JSON.parse(res.result); } catch { return null; } })();
      setDetailData(data);
    } catch (e) {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleViewDetail = useCallback(async (companyId) => {
    setShowDetail(companyId);
    setDetailData(null);
    loadDetail(companyId);
  }, [loadDetail]);

  const handleDissolve = useCallback(async (companyId) => {
    const username = getUsername() || 'default';
    setActionLoading(true);
    try {
      await invokeTool('startup_company', {
        action: 'dissolve',
        company_id: String(companyId),
        user_id: username,
      });
      setShowDetail(null);
      loadCompanies(true);
    } catch (e) {}
    finally { setActionLoading(false); }
  }, [loadCompanies]);

  const handleApplyJoin = useCallback(async (companyId) => {
    const token = getToken();
    if (!token) { navigation.navigate('登录'); return; }
    const username = getUsername() || 'default';
    setActionLoading(true);
    try {
      await invokeTool('startup_company', {
        action: 'apply_join',
        company_id: String(companyId),
        user_id: username,
      });
      loadDetail(companyId);
    } catch (e) {}
    finally { setActionLoading(false); }
  }, [navigation, loadDetail]);

  const handleLeave = useCallback(async (companyId) => {
    const username = getUsername() || 'default';
    setActionLoading(true);
    try {
      await invokeTool('startup_company', {
        action: 'leave',
        company_id: String(companyId),
        user_id: username,
      });
      loadDetail(companyId);
      loadCompanies(true);
    } catch (e) {}
    finally { setActionLoading(false); }
  }, [loadDetail, loadCompanies]);

  const handleOpenChat = useCallback((companyId, companyName) => {
    setChatCompanyId(companyId);
    setChatCompanyName(companyName || '群聊');
    setShowChat(true);
  }, []);

  const handleApprove = useCallback(async (companyId, targetUserId) => {
    const username = getUsername() || 'default';
    setActionLoading(true);
    try {
      await invokeTool('startup_company', {
        action: 'approve_join',
        company_id: String(companyId),
        target_user_id: targetUserId,
        user_id: username,
      });
      loadDetail(companyId);
    } catch (e) {}
    finally { setActionLoading(false); }
  }, [loadDetail]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏢 临时公司</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => {
          const token = getToken();
          if (!token) { navigation.navigate('登录'); return; }
          setShowModal(true);
        }}>
          <Text style={styles.createBtnText}>+ 创建</Text>
        </TouchableOpacity>
      </View>

      {/* 介绍横幅 */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          🤝 与创兄们组建临时公司，短暂合作验证创业项目，随时解散不留遗憾！
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#f59e0b" size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCompanies(true)} tintColor="#f59e0b" />}
        >
          <RawCompanyList raw={companies[0]?.raw} onDetail={handleViewDetail} />
        </ScrollView>
      )}

      {/* 创建公司弹窗 */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏢 创建临时公司</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.fieldLabel}>公司名称 *</Text>
              <TextInput
                style={styles.input}
                placeholder="如：极速AI工作室、平民创业联合体..."
                placeholderTextColor="#475569"
                value={companyName}
                onChangeText={setCompanyName}
              />

              <Text style={styles.fieldLabel}>公司简介（选填）</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="描述公司目标、项目方向..."
                placeholderTextColor="#475569"
                multiline
                value={companyDesc}
                onChangeText={setCompanyDesc}
              />

              <Text style={styles.fieldLabel}>运营期限</Text>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.durationBtn, duration === opt.value && styles.durationBtnActive]}
                    onPress={() => setDuration(opt.value)}
                  >
                    <Text style={[styles.durationBtnText, duration === opt.value && styles.durationBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {createError && <Text style={styles.errorText}>⚠️ {createError}</Text>}

              <TouchableOpacity
                style={[styles.submitBtn, (!companyName.trim() || creating) && styles.submitBtnDisabled]}
                onPress={handleCreate}
                disabled={!companyName.trim() || creating}
              >
                {creating ? <ActivityIndicator color="#0a0f1e" /> : <Text style={styles.submitBtnText}>🎉 正式成立！</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 群聊弹窗 */}
      {showChat && (
        <ChatModal
          companyId={chatCompanyId}
          companyName={chatCompanyName}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* 公司详情弹窗 */}
      <Modal visible={!!showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏢 {detailData?.name || '公司详情'}</Text>
              <TouchableOpacity onPress={() => setShowDetail(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {detailLoading ? (
                <ActivityIndicator color="#f59e0b" style={{ marginVertical: 40 }} />
              ) : detailData ? (
                <CompanyDetailContent
                  data={detailData}
                  companyId={showDetail}
                  actionLoading={actionLoading}
                  onDissolve={handleDissolve}
                  onApplyJoin={handleApplyJoin}
                  onLeave={handleLeave}
                  onApprove={handleApprove}
                  onChat={handleOpenChat}
                />
              ) : (
                <Text style={styles.emptyText}>加载失败，请重试</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CompanyDetailContent({ data, companyId, actionLoading, onDissolve, onApplyJoin, onLeave, onApprove, onChat }) {
  const statusLabel = { active: '🟢 运营中', paused: '🟡 暂停', completed: '✅ 已完成', dissolved: '⚫ 已解散' };
  const canChat = data.isFounder || data.isMember;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.detailSection}>
        <Text style={styles.detailMeta}>{statusLabel[data.status] || data.status}  ·  {data.durationDays} 天  ·  创始人：{data.founderId}</Text>
        {!!data.description && <Text style={styles.detailDesc}>{data.description}</Text>}
      </View>

      {/* 成员列表 */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>团队成员（{data.members?.length || 0} 人）</Text>
        {(data.members || []).map((m, i) => (
          <Text key={i} style={styles.memberItem}>👤 {m.userId}  <Text style={styles.memberRole}>{m.role}</Text></Text>
        ))}
      </View>

      {/* 群聊入口（成员/创始人可见） */}
      {canChat && (
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => onChat(companyId, data.name)}
        >
          <Text style={styles.chatBtnText}>💬 公司群聊</Text>
        </TouchableOpacity>
      )}

      {/* 创始人：审核申请 + 解散 */}
      {data.isFounder && (
        <>
          {data.joinRequests?.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>待审核申请（{data.joinRequests.length}）</Text>
              {data.joinRequests.map((uid, i) => (
                <View key={i} style={styles.requestRow}>
                  <Text style={styles.requestUser}>👤 {uid}</Text>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    disabled={actionLoading}
                    onPress={() => onApprove(companyId, uid)}
                  >
                    <Text style={styles.approveBtnText}>✅ 通过</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={[styles.dissolveBtn, actionLoading && styles.btnDisabled]}
            disabled={actionLoading}
            onPress={() => onDissolve(companyId)}
          >
            {actionLoading
              ? <ActivityIndicator color="#f87171" />
              : <Text style={styles.dissolveBtnText}>🔚 解散公司</Text>}
          </TouchableOpacity>
        </>
      )}

      {/* 非创始人：加入 / 退出 */}
      {!data.isFounder && (
        data.isMember ? (
          <TouchableOpacity
            style={[styles.leaveBtn, actionLoading && styles.btnDisabled]}
            disabled={actionLoading}
            onPress={() => onLeave(companyId)}
          >
            {actionLoading
              ? <ActivityIndicator color="#f87171" />
              : <Text style={styles.leaveBtnText}>🚪 退出公司</Text>}
          </TouchableOpacity>
        ) : data.hasPendingRequest ? (
          <View style={styles.pendingBtn}>
            <Text style={styles.pendingBtnText}>⏳ 申请审核中…</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinBtn, actionLoading && styles.btnDisabled]}
            disabled={actionLoading}
            onPress={() => onApplyJoin(companyId)}
          >
            {actionLoading
              ? <ActivityIndicator color="#0a0f1e" />
              : <Text style={styles.joinBtnText}>🤝 申请加入</Text>}
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

function ChatModal({ companyId, companyName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const flatListRef = useRef(null);
  const myUsername = getUsername() || 'default';

  // 加载历史消息
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoadingHistory(true);
    fetch(`${API_BASE}/api/v1/company/${companyId}/messages?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data.reverse());
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [companyId]);

  // 订阅实时消息，新消息自动滚底
  useWebSocket((msg) => {
    if (msg.type === 'chat_message' && String(msg.company_id) === String(companyId)) {
      setMessages(prev => [...prev, {
        id: msg.msg_id || Date.now(),
        userId: msg.from_user,
        content: msg.content,
        createdAt: msg.created_at || new Date().toISOString(),
      }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  });

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendChatMessage(String(companyId), text);
  }, [inputText, companyId]);

  // 取用户名首字母作头像文字
  const avatarChar = (uid) => (uid || '?')[0].toUpperCase();

  const renderItem = useCallback(({ item, index }) => {
    const isMine = item.userId === myUsername;
    const prevItem = index > 0 ? messages[index - 1] : null;
    const showName = !isMine && (!prevItem || prevItem.userId !== item.userId);

    const timeStr = (() => {
      try { return new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }
      catch { return ''; }
    })();

    return (
      <View style={[chatStyles.msgWrapper, isMine && chatStyles.msgWrapperMine]}>
        {/* 头像 */}
        {!isMine ? (
          <View style={chatStyles.avatar}>
            <Text style={chatStyles.avatarText}>{avatarChar(item.userId)}</Text>
          </View>
        ) : null}

        <View style={[chatStyles.msgBody, isMine && chatStyles.msgBodyMine]}>
          {showName && <Text style={chatStyles.senderName}>{item.userId}</Text>}
          <View style={[chatStyles.bubble, isMine && chatStyles.bubbleMine]}>
            {/* 气泡尖角 */}
            <View style={[chatStyles.bubbleTip, isMine && chatStyles.bubbleTipMine]} />
            <Text style={[chatStyles.bubbleText, isMine && chatStyles.bubbleTextMine]}>{item.content}</Text>
          </View>
          <Text style={[chatStyles.timeText, isMine && chatStyles.timeTextMine]}>{timeStr}</Text>
        </View>

        {isMine ? (
          <View style={chatStyles.avatarMine}>
            <Text style={chatStyles.avatarText}>{avatarChar(myUsername)}</Text>
          </View>
        ) : null}
      </View>
    );
  }, [myUsername, messages, companyId]);

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      <SafeAreaView style={chatStyles.screen} edges={['top', 'bottom']}>
        {/* 顶部导航栏 */}
        <View style={chatStyles.navbar}>
          <TouchableOpacity onPress={onClose} style={chatStyles.backBtn}>
            <Text style={chatStyles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={chatStyles.navCenter}>
            <Text style={chatStyles.navTitle}>{companyName}</Text>
            <Text style={chatStyles.navSub}>公司群聊</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* 消息列表 */}
        {loadingHistory ? (
          <View style={chatStyles.loadingWrap}>
            <ActivityIndicator color="#f59e0b" size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            style={chatStyles.list}
            contentContainerStyle={chatStyles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={chatStyles.emptyWrap}>
                <Text style={chatStyles.emptyIcon}>💬</Text>
                <Text style={chatStyles.emptyText}>暂无消息，快来打个招呼！</Text>
              </View>
            }
          />
        )}

        {/* 底部输入栏 */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={chatStyles.inputBar}>
            <TextInput
              style={chatStyles.input}
              placeholder="说点什么…"
              placeholderTextColor="#64748b"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              style={[chatStyles.sendBtn, !inputText.trim() && chatStyles.sendBtnDisabled]}
              disabled={!inputText.trim()}
              onPress={handleSend}
              activeOpacity={0.8}
            >
              <Text style={chatStyles.sendBtnText}>发送</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const chatStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d1117' },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: '#0f1f38',
    borderBottomWidth: 1, borderBottomColor: '#1e3a5f',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: '#f1f5f9', fontSize: 32, lineHeight: 36 },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '800' },
  navSub: { color: '#64748b', fontSize: 11, marginTop: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 16, gap: 4 },
  emptyWrap: { marginTop: 100, alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#475569', fontSize: 14 },
  // 消息行
  msgWrapper: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginVertical: 4, gap: 8,
  },
  msgWrapperMine: { flexDirection: 'row-reverse' },
  // 头像
  avatar: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center',
  },
  avatarMine: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#854d0e', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  // 消息体
  msgBody: { flexShrink: 1, alignItems: 'flex-start', gap: 2 },
  msgBodyMine: { alignItems: 'flex-end' },
  senderName: { color: '#64748b', fontSize: 11, marginLeft: 10, marginBottom: 2 },
  // 气泡
  bubble: {
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    maxWidth: 240, position: 'relative',
  },
  bubbleMine: { backgroundColor: '#f59e0b' },
  bubbleTip: {
    position: 'absolute', left: -5, top: 10,
    width: 0, height: 0,
    borderTopWidth: 5, borderTopColor: 'transparent',
    borderBottomWidth: 5, borderBottomColor: 'transparent',
    borderRightWidth: 6, borderRightColor: '#1e293b',
  },
  bubbleTipMine: {
    left: undefined, right: -5,
    borderRightWidth: 0, borderRightColor: 'transparent',
    borderLeftWidth: 6, borderLeftColor: '#f59e0b',
  },
  bubbleText: { color: '#f1f5f9', fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#0a0f1e' },
  timeText: { color: '#475569', fontSize: 10, marginLeft: 10 },
  timeTextMine: { marginLeft: 0, marginRight: 10 },
  // 输入栏
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#0f1f38',
    borderTopWidth: 1, borderTopColor: '#1e3a5f',
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: '#1e293b', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#f1f5f9', fontSize: 15,
  },
  sendBtn: {
    backgroundColor: '#f59e0b', borderRadius: 20,
    paddingHorizontal: 18, height: 40, justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#334155' },
  sendBtnText: { color: '#0a0f1e', fontSize: 14, fontWeight: '800' },
});

function RawCompanyList({ raw, onDetail }) {
  if (!raw) return <Text style={styles.emptyText}>暂无公司，快来创建第一家！</Text>;

  const lines = raw.split('\n').filter(Boolean);
  const companyLines = lines.filter(l => l.includes('#') && l.includes('|'));

  if (companyLines.length === 0) {
    return <Markdown style={mdStyles}>{raw}</Markdown>;
  }

  return (
    <View style={{ gap: 12 }}>
      {companyLines.map((line, index) => {
        const match = line.match(/(🟢|🟡|✅|⚪)\s*#(\d+)\s*\|\s*(.+?)\s*\|/);
        const statusEmoji = match ? match[1] : '🟢';
        const companyId = match ? parseInt(match[2]) : index + 1;
        const name = match ? match[3].trim() : line;

        const statusLabels = { '🟢': '运营中', '🟡': '暂停', '✅': '已完成', '⚪': '未知' };
        const status = statusLabels[statusEmoji] || '运营中';

        return (
          <TouchableOpacity key={companyId} style={styles.companyCard} onPress={() => onDetail(companyId)}>
            <View style={styles.companyCardHeader}>
              <View style={styles.companyStatusBadge}>
                <Text style={styles.companyStatusText}>{statusEmoji} {status}</Text>
              </View>
              <Text style={styles.companyIdText}>#{companyId}</Text>
            </View>
            <Text style={styles.companyName}>{name}</Text>
            <Text style={styles.companyMeta}>{line.replace(/.*\|/, '').trim()}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.viewDetailText}>点击查看详情 →</Text>
            </View>
          </TouchableOpacity>
        );
      })}
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
  createBtn: {
    backgroundColor: '#f59e0b', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  createBtnText: { color: '#0a0f1e', fontSize: 13, fontWeight: '800' },
  banner: {
    backgroundColor: '#0f1f38', marginHorizontal: 16, marginVertical: 10,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1e3a5f',
  },
  bannerText: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 60, fontSize: 15 },
  companyCard: {
    backgroundColor: '#0f1f38', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1e3a5f', gap: 8,
  },
  companyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  companyStatusBadge: {
    backgroundColor: '#1a2f1a', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  companyStatusText: { color: '#4ade80', fontSize: 12, fontWeight: '700' },
  companyIdText: { color: '#64748b', fontSize: 12 },
  companyName: { color: '#f1f5f9', fontSize: 16, fontWeight: '800' },
  companyMeta: { color: '#64748b', fontSize: 12 },
  cardFooter: { alignItems: 'flex-end' },
  viewDetailText: { color: '#3b82f6', fontSize: 12 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
    borderWidth: 1, borderColor: '#1e293b',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '800' },
  closeBtn: { color: '#64748b', fontSize: 20, padding: 4 },
  fieldLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#0a0f1e', borderRadius: 12, padding: 12,
    color: '#f1f5f9', fontSize: 14, borderWidth: 1, borderColor: '#1e3a5f',
  },
  durationRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  durationBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, backgroundColor: '#0a0f1e',
    borderWidth: 1, borderColor: '#1e3a5f',
  },
  durationBtnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  durationBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  durationBtnTextActive: { color: '#0a0f1e', fontWeight: '800' },
  errorText: { color: '#f87171', fontSize: 13, marginVertical: 8 },
  submitBtn: {
    backgroundColor: '#f59e0b', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  submitBtnDisabled: { backgroundColor: '#1e293b' },
  submitBtnText: { color: '#0a0f1e', fontSize: 15, fontWeight: '800' },
  detailText: { color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  detailSection: {
    backgroundColor: '#0a0f1e', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#1e3a5f', gap: 6,
  },
  detailMeta: { color: '#64748b', fontSize: 12 },
  detailDesc: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, marginTop: 4 },
  detailSectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  memberItem: { color: '#f1f5f9', fontSize: 13, paddingVertical: 3 },
  memberRole: { color: '#f59e0b', fontSize: 12 },
  requestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  requestUser: { color: '#f1f5f9', fontSize: 13 },
  approveBtn: {
    backgroundColor: '#14532d', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#16a34a',
  },
  approveBtnText: { color: '#4ade80', fontSize: 12, fontWeight: '700' },
  dissolveBtn: {
    backgroundColor: '#2d1515', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: '#ef444444',
  },
  dissolveBtnText: { color: '#f87171', fontSize: 14, fontWeight: '700' },
  leaveBtn: {
    backgroundColor: '#2d1515', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: '#ef444444',
  },
  leaveBtnText: { color: '#f87171', fontSize: 14, fontWeight: '700' },
  joinBtn: {
    backgroundColor: '#f59e0b', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  joinBtnText: { color: '#0a0f1e', fontSize: 14, fontWeight: '800' },
  pendingBtn: {
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: '#334155',
  },
  pendingBtnText: { color: '#64748b', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  chatBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: '#3b82f6',
  },
  chatBtnText: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
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
