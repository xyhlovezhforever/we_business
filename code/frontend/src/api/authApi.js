/**
 * 用户认证 API
 *
 * token 同时存储在内存变量（同步读取）和 localStorage（Web 刷新后恢复）中。
 * 在真机/模拟器环境 localStorage 不可用时自动降级为纯内存存储。
 */
import { API_BASE } from './config';

const STORAGE_KEY = 'auth_token';
const USERNAME_KEY = 'auth_username';

function storageSave(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

function storageLoad(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function storageRemove(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

// 启动时从 localStorage 恢复（Web 刷新后保持登录态）
let _token = storageLoad(STORAGE_KEY);
let _username = storageLoad(USERNAME_KEY);

export function getToken() {
  return _token;
}

export function setToken(t) {
  _token = t;
  if (t) storageSave(STORAGE_KEY, t);
  else storageRemove(STORAGE_KEY);
}

export function clearToken() {
  _token = null;
  _username = null;
  storageRemove(STORAGE_KEY);
  storageRemove(USERNAME_KEY);
}

export function getUsername() {
  return _username;
}

export function setUsername(u) {
  _username = u;
  if (u) storageSave(USERNAME_KEY, u);
  else storageRemove(USERNAME_KEY);
}

/** 构建带 token 的通用 headers */
export function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Bearer ${_token}`;
  return h;
}

/**
 * 注册
 * @returns {{ user_id: string }}
 */
export async function register(username, password) {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '注册失败');
  return data;
}

/**
 * 登录
 * 成功后自动保存 token，后续请求通过 authHeaders() 携带
 * @returns {{ token: string }}
 */
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '登录失败');
  setToken(data.token);
  setUsername(username);
  return data;
}

/**
 * 退出登录
 */
export async function logout() {
  if (!_token) return;
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } finally {
    clearToken();
  }
}
