/**
 * 创业智能体输入框 + 快捷短语
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Animated,
} from 'react-native';

const QUICK_PHRASES = [
  '帮我分析这个创业想法',
  '我想找技术合伙人',
  '帮我发一个创业帖子',
  '帮我创建一个临时公司',
  '创业遇到了困难',
  '如何低成本验证想法',
];

export default function EmotionInput({ onSubmit, onStop, disabled, placeholder }) {
  const [text, setText] = useState('');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (disabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.6, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [disabled]);

  function handleSubmit() {
    if (!text.trim() || disabled) return;
    onSubmit(text.trim());
    setText('');
  }

  return (
    <View style={styles.container}>
      {/* 快捷短语 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phrases}>
        {QUICK_PHRASES.map((p) => (
          <TouchableOpacity
            key={p}
            style={styles.phraseChip}
            onPress={() => setText(p)}
            disabled={disabled}
          >
            <Text style={styles.phraseText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 输入区 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder || '创兄，说说你的创业想法...'}
          placeholderTextColor="#475569"
          multiline
          maxLength={500}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        {disabled ? (
          <Animated.View style={{ opacity: pulse }}>
            <TouchableOpacity style={styles.stopBtn} onPress={onStop}>
              <View style={styles.stopIcon} />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSubmit}
            disabled={!text.trim()}
          >
            <Text style={styles.sendBtnText}>发送</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  phrases: { gap: 8, paddingHorizontal: 2 },
  phraseChip: {
    backgroundColor: '#0f1f38', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#1e3a5f',
  },
  phraseText: { color: '#64748b', fontSize: 12 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: {
    flex: 1, backgroundColor: '#0f1f38', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    color: '#f1f5f9', fontSize: 15, maxHeight: 120,
    borderWidth: 1, borderColor: '#1e3a5f',
  },
  sendBtn: {
    backgroundColor: '#f59e0b', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  sendBtnDisabled: { backgroundColor: '#1e293b' },
  sendBtnText: { color: '#0a0f1e', fontWeight: '800', fontSize: 15 },
  stopBtn: {
    backgroundColor: '#ef4444', borderRadius: 14,
    width: 50, height: 50, alignItems: 'center', justifyContent: 'center',
  },
  stopIcon: { width: 18, height: 18, backgroundColor: '#fff', borderRadius: 3 },
});
