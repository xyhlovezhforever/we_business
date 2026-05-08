/**
 * 登录 / 注册页面
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { login, register } from '../api/authApi';
import { connectWebSocket } from '../hooks/useWebSocket';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) {
      setError('用户名和密码不能为空');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'login') {
        await login(username.trim(), password.trim());
        connectWebSocket(); // 登录后立即建立 WS 连接
        navigation.goBack();
      } else {
        await register(username.trim(), password.trim());
        setSuccess('注册成功！请登录');
        setMode('login');
        setPassword('');
      }
    } catch (e) {
      setError(e.message || '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* 顶部栏 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← 返回</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.logo}>🚀</Text>
            <Text style={styles.title}>全民创业</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? '创兄，登录后开始创业之旅！' : '加入全民创业，成为创兄！'}
            </Text>

            {/* 模式切换 */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => { setMode('login'); setError(null); setSuccess(null); }}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>登录</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && styles.tabActive]}
                onPress={() => { setMode('register'); setError(null); setSuccess(null); }}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>注册</Text>
              </TouchableOpacity>
            </View>

            {/* 表单 */}
            <View style={styles.form}>
              <Text style={styles.label}>用户名</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入用户名"
                placeholderTextColor="#475569"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>密码</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入密码"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}
              {success && (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>✅ {success}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === 'login' ? '登录' : '注册'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },
  scroll: { flexGrow: 1, padding: 16 },
  header: { marginBottom: 8 },
  backBtn: { paddingVertical: 8 },
  backBtnText: { color: '#6366f1', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginTop: 24,
  },
  logo: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 24, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  form: { width: '100%', gap: 8 },
  label: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ef444433',
    marginTop: 4,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  successBox: {
    backgroundColor: '#052e16',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#16a34a33',
    marginTop: 4,
  },
  successText: { color: '#86efac', fontSize: 13 },
  submitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
