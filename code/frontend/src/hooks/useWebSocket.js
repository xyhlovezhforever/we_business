/**
 * WebSocket Hook
 * 全局单例连接，App 根层挂载后所有页面可订阅消息
 */
import { useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../api/config';
import { getToken } from '../api/authApi';

// ws:// 替换 http://
const WS_BASE = API_BASE.replace(/^http/, 'ws');

// 全局单例
let globalWs = null;
let listeners = new Set();
let reconnectTimer = null;
let reconnectDelay = 1000;
let pendingQueue = []; // 连接中排队的消息

function notifyListeners(msg) {
  listeners.forEach(fn => {
    try { fn(msg); } catch {}
  });
}

function connect() {
  const token = getToken();
  if (!token) return;
  if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) return;

  const url = `${WS_BASE}/api/v1/ws?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);
  globalWs = ws;

  ws.onopen = () => {
    reconnectDelay = 1000; // 重置退避
    // 发送排队消息
    while (pendingQueue.length > 0) {
      const msg = pendingQueue.shift();
      try { ws.send(JSON.stringify(msg)); } catch {}
    }
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      notifyListeners(msg);
    } catch {}
  };

  ws.onclose = () => {
    globalWs = null;
    pendingQueue = []; // 断开时丢弃未发消息（避免重连后发出过期消息）
    // 指数退避重连（最大 30s）
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      connect();
    }, reconnectDelay);
  };

  ws.onerror = () => {
    ws.close();
  };
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (globalWs) {
    globalWs.onclose = null; // 阻止触发重连
    globalWs.close();
    globalWs = null;
  }
}

export function sendWsMessage(data) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify(data));
    return true;
  }
  // 未连接或正在连接：加入队列，并确保连接已启动
  pendingQueue.push(data);
  if (!globalWs || globalWs.readyState === WebSocket.CLOSED || globalWs.readyState === WebSocket.CLOSING) {
    connect();
  }
  return false;
}

export function sendChatMessage(companyId, content) {
  // company_id 作为数字传给后端，避免后端字符串解析失败
  sendWsMessage({ type: 'chat', company_id: Number(companyId), content });
}

/** 手动触发连接（登录后调用） */
export function connectWebSocket() {
  connect();
}

/**
 * 在组件中订阅 WS 消息
 * @param {(msg: object) => void} onMessage
 * @param {any[]} deps
 */
export function useWebSocket(onMessage, deps = []) {
  const cbRef = useRef(onMessage);
  useEffect(() => { cbRef.current = onMessage; });

  useEffect(() => {
    const handler = (msg) => cbRef.current(msg);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []); // eslint-disable-line
}

/**
 * 根层 Hook：登录后连接，登出后断开
 * 在 App.js 顶层调用一次
 */
export function useWebSocketRoot() {
  useEffect(() => {
    const token = getToken();
    if (token) connect();
    return () => {
      // 组件卸载时不断开（App 根层不会卸载）
    };
  }, []);

  return { connect, disconnect };
}
