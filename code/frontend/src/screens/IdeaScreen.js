/**
 * 想法增强页面
 * 创兄输入小想法，AI 生成完整创业方案
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { llmChat } from '../api/taskApi';
import { getToken } from '../api/authApi';
import Markdown from 'react-native-markdown-display';

const CATEGORIES = ['通用', '科技', '餐饮', '教育', '电商', '服务', '制造'];
const BUDGETS = ['1万以内', '1-5万', '5-10万', '10-50万', '50万以上', '不限'];

export default function IdeaScreen() {
  const navigation = useNavigation();
  const [idea, setIdea] = useState('');
  const [category, setCategory] = useState('通用');
  const [budget, setBudget] = useState('不限');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleEnhance = useCallback(async () => {
    if (!idea.trim()) return;
    const token = getToken();
    if (!token) {
      navigation.navigate('登录');
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const prompt = '';

      const system = '';
      const res = await llmChat(prompt, system);
      if (res.success) {
        setResult(res.content);
      } else {
        setError(res.error || '增强失败，请重试');
      }
    } catch (e) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, [idea, category, budget, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 顶部栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← 返回</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>💡 想法增强</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* 输入区 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>创兄，说说你的想法</Text>
            <TextInput
              style={styles.ideaInput}
              placeholder="比如：开一家专门给程序员送餐的外卖店，注重营养和效率..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={4}
              value={idea}
              onChangeText={setIdea}
              textAlignVertical="top"
            />
          </View>

          {/* 类别选择 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>创业类别</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, category === c && styles.chipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* 预算选择 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>启动预算</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {BUDGETS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.chip, budget === b && styles.chipActive]}
                    onPress={() => setBudget(b)}
                  >
                    <Text style={[styles.chipText, budget === b && styles.chipTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* 增强按钮 */}
          <TouchableOpacity
            style={[styles.enhanceBtn, (!idea.trim() || loading) && styles.enhanceBtnDisabled]}
            onPress={handleEnhance}
            disabled={!idea.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#0a0f1e" />
            ) : (
              <Text style={styles.enhanceBtnText}>🚀 AI 生成完整创业方案</Text>
            )}
          </TouchableOpacity>

          {/* 错误提示 */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* 结果展示 */}
          {result && (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>✨ 创业方案已生成</Text>
              <Markdown style={mdStyles}>{result}</Markdown>

              <TouchableOpacity
                style={styles.postBtn}
                onPress={() => navigation.navigate('创业广场')}
              >
                <Text style={styles.postBtnText}>📢 发帖招募合伙人</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  backText: { color: '#60a5fa', fontSize: 14 },
  headerTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  ideaInput: {
    backgroundColor: '#0f1f38', borderRadius: 14, padding: 14,
    color: '#f1f5f9', fontSize: 15, lineHeight: 22,
    minHeight: 110, borderWidth: 1, borderColor: '#1e3a5f',
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#0f1f38',
    borderWidth: 1, borderColor: '#1e3a5f',
  },
  chipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  chipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#0a0f1e', fontWeight: '800' },
  enhanceBtn: {
    backgroundColor: '#f59e0b', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#f59e0b', shadowOpacity: 0.3, shadowRadius: 12,
  },
  enhanceBtnDisabled: { backgroundColor: '#1e293b', shadowOpacity: 0 },
  enhanceBtnText: { color: '#0a0f1e', fontSize: 16, fontWeight: '800' },
  errorBox: {
    backgroundColor: '#450a0a', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#ef444444',
  },
  errorText: { color: '#fca5a5', fontSize: 14 },
  resultBox: {
    backgroundColor: '#0f1f38', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1e3a5f', gap: 14,
  },
  resultTitle: { color: '#f59e0b', fontSize: 15, fontWeight: '800' },
  postBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#3b82f6',
  },
  postBtnText: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
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
};
