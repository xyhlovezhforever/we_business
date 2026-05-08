/**
 * 任务结果卡片（显示最终情绪分析输出）
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';

export default function ResultCard({ result, taskId }) {
  if (!result) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>分析结果</Text>
      <Text style={styles.taskIdText}>任务 #{taskId?.slice(0, 8)}</Text>
      <ScrollView style={styles.rawScroll} showsVerticalScrollIndicator={false}>
        <Markdown style={markdownStyles}>{result}</Markdown>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6366f133',
    gap: 10,
  },
  title: {
    color: '#6366f1',
    fontWeight: '700',
    fontSize: 16,
  },
  taskIdText: {
    color: '#475569',
    fontSize: 11,
  },
  parsed: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  key: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    minWidth: 80,
  },
  value: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 13,
    textAlign: 'right',
  },
  rawScroll: {
    flex: 1,
  },
});

const markdownStyles = {
  body: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  strong: { color: '#f1f5f9', fontWeight: '700' },
  em: { color: '#a5b4fc', fontStyle: 'italic' },
  heading1: { color: '#6366f1', fontSize: 16, fontWeight: '700', marginVertical: 4 },
  heading2: { color: '#818cf8', fontSize: 14, fontWeight: '700', marginVertical: 2 },
  code_inline: { backgroundColor: '#0f172a', color: '#7dd3fc', borderRadius: 4, paddingHorizontal: 4 },
  fence: { backgroundColor: '#0f172a', borderRadius: 8, padding: 8 },
  code_block: { color: '#7dd3fc', fontSize: 12 },
  bullet_list: { marginVertical: 2 },
  list_item: { color: '#cbd5e1' },
};
