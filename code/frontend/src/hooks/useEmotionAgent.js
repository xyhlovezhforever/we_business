/**
 * useStartupAgent
 *
 * 核心 hook：提交任务 → 通过 SSE 实时接收智能体执行事件 → 汇总结果
 * 全民创业智能体专用
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventSource from 'react-native-sse';
import { createEmotionTask, getSseUrl, getSessionHistory } from '../api/taskApi';
import { getToken } from '../api/authApi';
import { navigationRef } from '../navigation/navigationRef';

const SESSION_KEY = 'startup_agent_session_id';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const EVENT_TYPES = {
  plan: '📋 规划',
  step_start: '▶️ 步骤',
  step_done: '✅ 完成',
  step_fail: '❌ 失败',
  eval: '📊 评估',
  reflect: '🔄 反思',
  round: '🔁 轮次',
  llm: '🤖 LLM',
  progress: '📌 进度',
  heartbeat: '💓',
  tool_select: '🔧 工具',
  warn: '⚠️ 警告',
  navigate: '🧭 导航',
  answer: '💬 回复',
  user: '创兄',
};

// Tab 名称别名映射
const TAB_ALIASES = {
  home: '全民创业',
  '全民创业': '全民创业',
  idea: '想法增强',
  '想法增强': '想法增强',
  post: '创业广场',
  '创业广场': '创业广场',
  company: '临时公司',
  '临时公司': '临时公司',
};

function resolveTabName(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  return TAB_ALIASES[trimmed] ?? TAB_ALIASES[trimmed.toLowerCase()] ?? null;
}

// 本地导航意图识别（不走后端，直接跳转）
const NAV_PATTERNS = [
  { regex: /想法|增强|点子/, tab: '想法增强' },
  { regex: /帖子|广场|社区|发帖/, tab: '创业广场' },
  { regex: /公司|团队|合伙/, tab: '临时公司' },
  { regex: /首页|主页|创业/, tab: '全民创业' },
];

function detectNavIntent(text) {
  if (!/打开|去|跳转|切换|进入|到.*页/.test(text)) return null;
  for (const { regex, tab } of NAV_PATTERNS) {
    if (regex.test(text)) return tab;
  }
  return null;
}

export function useEmotionAgent() {
  const [status, setStatus] = useState('idle'); // idle | loading | streaming | done | error
  const [events, setEvents] = useState([]);
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState(null);
  const [taskId, setTaskId] = useState(null);

  const esRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY).then((stored) => {
      if (stored) {
        sessionIdRef.current = stored;
      } else {
        const newId = generateId();
        sessionIdRef.current = newId;
        AsyncStorage.setItem(SESSION_KEY, newId);
      }
    });
  }, []);

  const appendEvent = useCallback((ev) => {
    setEvents((prev) => [...prev, ev]);
  }, []);

  const reset = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus('idle');
    setEvents([]);
    setFinalResult(null);
    setError(null);
    setTaskId(null);
  }, []);

  const newSession = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    const newId = generateId();
    sessionIdRef.current = newId;
    AsyncStorage.setItem(SESSION_KEY, newId);
    setStatus('idle');
    setEvents([]);
    setFinalResult(null);
    setError(null);
    setTaskId(null);
  }, []);

  const submit = useCallback(
    async (userInput) => {
      if (!userInput?.trim()) return;

      const token = getToken();
      if (!token) {
        if (navigationRef.isReady()) navigationRef.navigate('登录');
        return;
      }

      const navTarget = detectNavIntent(userInput);
      if (navTarget && navigationRef.isReady()) {
        navigationRef.navigate(navTarget);
        return;
      }

      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setError(null);
      setTaskId(null);
      appendEvent({
        id: Date.now(),
        type: 'user',
        message: userInput.trim(),
        timestamp: new Date().toISOString(),
      });
      setStatus('loading');

      try {
        const task = await createEmotionTask(userInput.trim(), sessionIdRef.current);
        const tid = task.task_id;
        sessionIdRef.current = task.session_id;
        setTaskId(tid);
        setStatus('streaming');

        const url = getSseUrl(tid, token);
        const es = new EventSource(url);
        esRef.current = es;

        const allEventTypes = [
          'plan', 'step_start', 'step_done', 'step_fail',
          'eval', 'reflect', 'round', 'llm', 'progress',
          'heartbeat', 'tool_select', 'warn', 'navigate',
          'answer', 'done', 'cancelled',
        ];

        const VISIBLE_TYPES = new Set(['step_fail', 'warn']);

        allEventTypes.forEach((evType) => {
          es.addEventListener(evType, (e) => {
            try {
              const data = JSON.parse(e.data);

              if (evType === 'done' || evType === 'cancelled') {
                setStatus('done');
                es.close();
                esRef.current = null;
                return;
              }

              if (evType === 'navigate') {
                const tabName = resolveTabName(data.message);
                if (tabName && navigationRef.isReady()) {
                  navigationRef.navigate(tabName);
                }
                return;
              }

              if (evType === 'answer') {
                const msg = data.message;
                if (msg && msg.trim()) {
                  appendEvent({
                    id: data.seq ?? Date.now(),
                    type: 'answer',
                    message: msg,
                    timestamp: data.timestamp,
                  });
                }
                return;
              }

              if (!VISIBLE_TYPES.has(evType)) return;

              const message = data.message;
              appendEvent({
                id: data.seq ?? Date.now(),
                type: evType,
                message,
                timestamp: data.timestamp,
              });
            } catch (_) {}
          });
        });

        es.addEventListener('error', (e) => {
          if (e.type === 'error') {
            setError('连接断开，请重试');
            setStatus('error');
            es.close();
            esRef.current = null;
          }
        });
      } catch (err) {
        setError(err.message || '未知错误');
        setStatus('error');
      }
    },
    [reset, appendEvent]
  );

  const cancel = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus('idle');
  }, []);

  const loadSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus('loading');
    setError(null);
    setTaskId(null);
    setFinalResult(null);
    try {
      const data = await getSessionHistory(sessionId);
      const turns = data.turns || [];
      const restored = [];
      turns.forEach((turn) => {
        if (turn.user_input) {
          restored.push({
            id: `h-u-${turn.round}`,
            type: 'user',
            message: turn.user_input,
            timestamp: null,
          });
        }
        if (turn.assistant_output) {
          restored.push({
            id: `h-a-${turn.round}`,
            type: 'answer',
            message: turn.assistant_output,
            timestamp: null,
          });
        }
      });
      sessionIdRef.current = sessionId;
      await AsyncStorage.setItem(SESSION_KEY, sessionId);
      setEvents(restored);
      setStatus('done');
    } catch (err) {
      setError(err.message || '加载历史失败');
      setStatus('error');
    }
  }, []);

  return {
    status,
    events,
    finalResult,
    error,
    taskId,
    sessionId: sessionIdRef,
    submit,
    cancel,
    reset,
    newSession,
    loadSession,
  };
}
