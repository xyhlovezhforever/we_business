/**
 * 后端任务 API 封装
 */
import { API_BASE } from './config';
import { authHeaders } from './authApi';
import { loadLlmConfig } from '../screens/SettingsScreen';

/**
 * 提交情绪分析任务，返回 { task_id }
 */
export async function createEmotionTask(userInput, sessionId = null) {
  const llmOverride = await loadLlmConfig();
  const body = {
    task_description: userInput,
    metadata: { source: 'your-app' },
    ...(sessionId ? { session_id: sessionId } : {}),
    ...(llmOverride ? { llm_override: llmOverride } : {}),
  };

  const res = await fetch(`${API_BASE}/api/v1/tasks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`创建任务失败: ${res.status} ${text}`);
  }

  return res.json(); // { task_id, task_description, ... }
}

/**
 * 获取 SSE 流 URL
 */
export function getSseUrl(taskId, token) {
  const t = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE}/api/v1/tasks/${taskId}/stream${t}`;
}

/**
 * 获取指定 session 的完整对话历史
 * 返回 { session_id, total_turns, turns: [{ round, user_input, assistant_output, score, is_success }] }
 */
export async function getSessionHistory(sessionId) {
  const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/history`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`获取历史失败: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * 列出所有 session
 * 返回 { total, sessions: [{ session_id, updated_at, total_turns, last_input_preview }] }
 */
export async function listSessions() {
  const res = await fetch(`${API_BASE}/api/v1/sessions`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`获取 session 列表失败: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * 直接调用指定工具（同步，绕过 AI 编排）
 * @param {string} toolId  工具 ID，例如 'emotion_diary', 'emotion_detect'
 * @param {object} params  工具参数对象
 * @returns {{ tool_id, success, result, error, execution_time_ms }}
 */
export async function invokeTool(toolId, params = {}) {
  const res = await fetch(`${API_BASE}/api/v1/tools/${encodeURIComponent(toolId)}/invoke`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`工具调用失败: ${res.status} ${text}`);
  }
  return res.json();
}

// ==================== 情绪日记 REST API ====================

/** 获取日记列表 GET /api/v1/diary?limit=N */
export async function listDiary(limit = 50) {
  const res = await fetch(`${API_BASE}/api/v1/diary?limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`获取日记失败: ${res.status} ${text}`);
  }
  return res.json(); // { user_id, count, entries: [...] }
}

/** 删除单条日记 DELETE /api/v1/diary/:id */
export async function deleteDiaryItem(id) {
  const res = await fetch(`${API_BASE}/api/v1/diary/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`删除日记失败: ${res.status} ${text}`);
  }
  return res.json(); // { success, id }
}

/** 清空所有日记 DELETE /api/v1/diary */
export async function clearDiary() {
  const res = await fetch(`${API_BASE}/api/v1/diary`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`清空日记失败: ${res.status} ${text}`);
  }
  return res.json(); // { success, deleted }
}

/**
 * 单步调用大模型（不走任务编排，直接返回结果）
 * @param {string} user       用户消息
 * @param {string} [system]   系统提示词（可选）
 * @returns {{ content, success, error }}
 */
export async function llmChat(user, system = '') {
  const body = { user, ...(system ? { system } : {}) };
  const res = await fetch(`${API_BASE}/api/v1/llm/chat`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM 调用失败: ${res.status} ${text}`);
  }
  return res.json(); // { content, success, error }
}

/**
 * 删除指定 session
 */
export async function deleteSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`删除失败: ${res.status} ${text}`);
  }
  return res.json();
}
