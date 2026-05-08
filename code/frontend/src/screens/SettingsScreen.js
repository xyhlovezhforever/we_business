/**
 * 设置页面：用户账号 + 模型配置
 *
 * 模型配置保存在 AsyncStorage，createEmotionTask 读取后作为 llm_override 传给后端。
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getToken, getUsername, logout } from '../api/authApi';

export const LLM_CONFIG_KEY = 'llm_override_config';

/** 读取已保存的模型配置，返回 { endpoint, api_key, model_name } 或 null */
export async function loadLlmConfig() {
  try {
    const raw = await AsyncStorage.getItem(LLM_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUsername, setCurrentUsername] = useState(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  // 模型配置字段
  const [useCustomLlm, setUseCustomLlm] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsLoggedIn(!!getToken());
      setCurrentUsername(getUsername());
    }, [])
  );

  useEffect(() => {
    loadLlmConfig().then((cfg) => {
      if (cfg) {
        setUseCustomLlm(true);
        setEndpoint(cfg.endpoint || '');
        setApiKey(cfg.api_key || '');
        setModelName(cfg.model_name || '');
      }
    });
  }, []);

  async function handleSaveLlm() {
    if (useCustomLlm) {
      const cfg = {
        endpoint: endpoint.trim() || null,
        api_key: apiKey.trim() || null,
        model_name: modelName.trim() || null,
      };
      await AsyncStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(cfg));
    } else {
      await AsyncStorage.removeItem(LLM_CONFIG_KEY);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await logout();
    setIsLoggedIn(false);
    setConfirmingLogout(false);
    navigation.navigate('情绪分析');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>设置</Text>
        </View>

        {/* 账号区块 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>账号</Text>
          {isLoggedIn ? (
            <View style={{ gap: 10 }}>
              <View style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {currentUsername ? currentUsername.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.usernameText}>{currentUsername || '已登录'}</Text>
                  <Text style={styles.userStatusText}>账号已连接</Text>
                </View>
                {!confirmingLogout && (
                  <TouchableOpacity style={styles.dangerBtn} onPress={() => setConfirmingLogout(true)}>
                    <Text style={styles.dangerBtnText}>退出</Text>
                  </TouchableOpacity>
                )}
              </View>
              {confirmingLogout && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmText}>确定要退出账号吗？</Text>
                  <View style={styles.confirmBtns}>
                    <TouchableOpacity style={styles.cancelConfirmBtn} onPress={() => setConfirmingLogout(false)}>
                      <Text style={styles.cancelConfirmText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmLogoutBtn} onPress={handleLogout}>
                      <Text style={styles.confirmLogoutText}>确认退出</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('登录')}
            >
              <Text style={styles.primaryBtnText}>登录 / 注册</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 模型配置区块 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>模型配置</Text>
          <Text style={styles.sectionDesc}>
            不填则使用服务端默认配置（推荐）。填写后每次请求都会覆盖服务端设置。
          </Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>使用自定义模型</Text>
            <Switch
              value={useCustomLlm}
              onValueChange={setUseCustomLlm}
              trackColor={{ false: '#334155', true: '#6366f1' }}
              thumbColor={useCustomLlm ? '#a5b4fc' : '#94a3b8'}
            />
          </View>

          {useCustomLlm && (
            <View style={styles.form}>
              <Text style={styles.label}>API 端点（Endpoint）</Text>
              <TextInput
                style={styles.input}
                placeholder="例：https://your-llm-provider.example.com/..."
                placeholderTextColor="#475569"
                value={endpoint}
                onChangeText={setEndpoint}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>API Key</Text>
              <TextInput
                style={styles.input}
                placeholder="sk-..."
                placeholderTextColor="#475569"
                value={apiKey}
                onChangeText={setApiKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />

              <Text style={styles.label}>模型名称</Text>
              <TextInput
                style={styles.input}
                placeholder="例：your-model-name"
                placeholderTextColor="#475569"
                value={modelName}
                onChangeText={setModelName}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLlm}>
            <Text style={styles.saveBtnText}>{saved ? '✅ 已保存' : '保存配置'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 16, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backBtn: { paddingVertical: 8, paddingRight: 8 },
  backBtnText: { color: '#6366f1', fontSize: 14, fontWeight: '600' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  sectionDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: { fontSize: 14, color: '#cbd5e1', fontWeight: '500' },
  form: { gap: 6 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#f1f5f9',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  primaryBtnText: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#818cf8',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  usernameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  userStatusText: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 2,
  },
  dangerBtn: {
    backgroundColor: '#1a0a0a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef444444',
  },
  dangerBtnText: { color: '#f87171', fontSize: 13, fontWeight: '700' },

  confirmRow: {
    backgroundColor: '#1a0a0a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ef444433',
    gap: 10,
  },
  confirmText: { color: '#fca5a5', fontSize: 13 },
  confirmBtns: { flexDirection: 'row', gap: 8 },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelConfirmText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  confirmLogoutBtn: {
    flex: 1,
    backgroundColor: '#450a0a',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef444455',
  },
  confirmLogoutText: { color: '#f87171', fontSize: 13, fontWeight: '700' },
});
