/**
 * 实时事件流列表组件
 */
import { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { EVENT_TYPES } from '../hooks/useEmotionAgent';

const EVENT_COLORS = {
  plan: '#6366f1',
  step_start: '#0ea5e9',
  step_done: '#22c55e',
  step_fail: '#ef4444',
  eval: '#f59e0b',
  reflect: '#a855f7',
  round: '#64748b',
  llm: '#06b6d4',
  progress: '#84cc16',
  heartbeat: '#94a3b8',
  tool_select: '#f97316',
  warn: '#f59e0b',
  answer: '#6366f1',
  user: '#475569',
};

function RawDataItem({ item, opacity, color, label }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View style={[styles.eventItem, { opacity }]}>
      <View style={[styles.typeBadge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.typeText, { color }]}>{label}</Text>
      </View>
      <View style={styles.messageWrap}>
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
          <Text style={styles.rawToggle}>{expanded ? '▲ 收起数据' : '▼ 查看原始数据'}</Text>
        </TouchableOpacity>
        {expanded && (
          <ScrollView
            horizontal
            style={styles.rawScroll}
            contentContainerStyle={styles.rawContent}
            showsHorizontalScrollIndicator={true}
          >
            <Text style={styles.rawText} selectable>{item.message}</Text>
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}

function EventItem({ item }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const color = EVENT_COLORS[item.type] || '#94a3b8';
  const label = EVENT_TYPES[item.type] || item.type;
  const isAnswer = item.type === 'answer';
  const isUser = item.type === 'user';

  if (isUser) {
    return (
      <Animated.View style={[styles.userItem, { opacity }]}>
        <Text style={styles.userText}>{item.message}</Text>
      </Animated.View>
    );
  }

  if (isAnswer) {
    return (
      <Animated.View style={[styles.answerItem, { opacity }]}>
        <View style={[styles.typeBadge, { backgroundColor: color + '22', alignSelf: 'flex-start' }]}>
          <Text style={[styles.typeText, { color }]}>{label}</Text>
        </View>
        <Markdown style={answerMarkdownStyles}>{item.message}</Markdown>
      </Animated.View>
    );
  }

  if (item.type === 'heartbeat') {
    return (
      <Animated.View style={[styles.heartbeatItem, { opacity }]}>
        <Text style={styles.heartbeatText}>{item.message}</Text>
      </Animated.View>
    );
  }

  if (item.raw) {
    return <RawDataItem item={item} opacity={opacity} color={color} label={label} />;
  }

  return (
    <Animated.View style={[styles.eventItem, { opacity }]}>
      <View style={[styles.typeBadge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.typeText, { color }]}>{label}</Text>
      </View>
      <View style={styles.messageWrap}>
        <Markdown style={markdownStyles}>{item.message}</Markdown>
      </View>
    </Animated.View>
  );
}

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingWrap}>
      <View style={styles.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              {
                opacity: dot,
                transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function EventFeed({ events, style, isActive }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [events.length, isActive]);

  if (events.length === 0 && !isActive) return null;

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {events.map((ev, i) => (
        <EventItem key={`${ev.id}-${i}`} item={ev} />
      ))}
      {isActive && <TypingIndicator />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
  },
  content: {
    padding: 12,
    gap: 6,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  userItem: {
    alignSelf: 'flex-end',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 2,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  userText: {
    color: '#f1f5f9',
    fontSize: 14,
    lineHeight: 21,
  },
  answerItem: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#6366f133',
    marginTop: 4,
    flexDirection: 'column',
    gap: 8,
    overflow: 'hidden',
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 70,
    alignItems: 'center',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  messageWrap: {
    flex: 1,
    minWidth: 0,
  },
  heartbeatItem: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  heartbeatText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  rawToggle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    paddingVertical: 2,
  },
  rawScroll: {
    marginTop: 6,
    maxHeight: 160,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rawContent: {
    padding: 8,
  },
  rawText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#7dd3fc',
    lineHeight: 18,
  },
  typingWrap: {
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e1b4b',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#6366f133',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#818cf8',
  },
});

const markdownStyles = {
  body: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  strong: { color: '#f1f5f9', fontWeight: '700' },
  em: { color: '#a5b4fc', fontStyle: 'italic' },
  heading1: { color: '#6366f1', fontSize: 16, fontWeight: '700', marginVertical: 4 },
  heading2: { color: '#818cf8', fontSize: 14, fontWeight: '700', marginVertical: 2 },
  code_inline: { backgroundColor: '#1e293b', color: '#7dd3fc', borderRadius: 4, paddingHorizontal: 4 },
  fence: { backgroundColor: '#1e293b', borderRadius: 8, padding: 8 },
  code_block: { color: '#7dd3fc', fontSize: 12 },
  bullet_list: { marginVertical: 2 },
  list_item: { color: '#cbd5e1' },
};

const answerMarkdownStyles = {
  body: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  strong: { color: '#ffffff', fontWeight: '700' },
  em: { color: '#a5b4fc', fontStyle: 'italic' },
  heading1: { color: '#818cf8', fontSize: 16, fontWeight: '700', marginVertical: 4 },
  heading2: { color: '#a5b4fc', fontSize: 14, fontWeight: '700', marginVertical: 2 },
  code_inline: { backgroundColor: '#0f172a', color: '#7dd3fc', borderRadius: 4, paddingHorizontal: 4 },
  fence: { backgroundColor: '#0f172a', borderRadius: 8, padding: 8 },
  code_block: { color: '#7dd3fc', fontSize: 12 },
  bullet_list: { marginVertical: 4 },
  list_item: { color: '#e2e8f0' },
};
