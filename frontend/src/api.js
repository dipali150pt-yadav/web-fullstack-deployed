import { getStoredToken } from "./auth.js";

const API_BASE = "/api";

/**
 * Wrapper around fetch that automatically attaches the JWT Bearer token.
 * All protected API calls go through here.
 */
async function authFetch(url, options = {}) {
  const token = getStoredToken();

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });
  return res;
}

export async function sendChatMessage({
  question,
  history = [],
  activeProduct = null,
  activeVersion = null,
  visualInfo = "",
}) {
  const res = await authFetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      history,
      activeProduct,
      activeVersion,
      visualInfo,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  return await res.json();
}

export async function fetchDevices() {
  const res = await authFetch(`${API_BASE}/devices`);
  if (!res.ok) throw new Error("Failed to fetch devices");
  return await res.json();
}

export async function submitFeedback({ interactionId, helpful, feedbackText = "" }) {
  const res = await authFetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interactionId, helpful, feedbackText }),
  });
  if (!res.ok) throw new Error("Failed to submit feedback");
  return await res.json();
}

export async function inspectHardwareImage({ imageBase64, mimeType, prompt }) {
  const res = await authFetch(`${API_BASE}/vision/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType, prompt }),
  });
  if (!res.ok) throw new Error("Failed to inspect image");
  return await res.json();
}

export async function fetchStats() {
  const res = await authFetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return await res.json();
}

export async function uploadDocument(formData) {
  // Note: do NOT set Content-Type here — browser sets it with the correct boundary for multipart
  const res = await authFetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchDocuments() {
  const res = await authFetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return await res.json();
}

export async function fetchConversations() {
  const res = await authFetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return await res.json();
}

export async function fetchConversation(id) {
  const res = await authFetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return await res.json();
}

export async function saveConversationApi({ id, title, messages }) {
  const res = await authFetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title, messages }),
  });
  if (!res.ok) throw new Error("Failed to save conversation");
  return await res.json();
}

export async function deleteConversationApi(id) {
  const res = await authFetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
  return await res.json();
}
