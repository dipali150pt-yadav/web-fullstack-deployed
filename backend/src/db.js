// db.js
import { createClient } from "@libsql/client";

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    initSchema();
  }
  return dbInstance;
}

export async function initSchema() {
  const db = getDb();
  const statements = [
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      manufacturer TEXT,
      model TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT,
      hardware_version TEXT,
      total_chunks INTEGER DEFAULT 0,
      status TEXT DEFAULT 'INDEXED',
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      citations_json TEXT,
      escalated INTEGER DEFAULT 0,
      used_search INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      interaction_id TEXT NOT NULL,
      rating TEXT NOT NULL,
      feedback_text TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      messages_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ];

  for (const stmt of statements) {
    try {
      await db.execute(stmt);
    } catch (err) {
      console.error("Schema init error:", err.message);
    }
  }
}

// ── Generic helpers (Promise-based, matches libsql API) ──────────────────
export async function runAsync(sql, params = []) {
  const db = getDb();
  return await db.execute({ sql, args: params });
}

export async function allAsync(sql, params = []) {
  const db = getDb();
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

export async function getAsync(sql, params = []) {
  const rows = await allAsync(sql, params);
  return rows[0] || null;
}

// ── Documents ──────────────────────────────────────────────────────────
export async function saveDocumentRecord({ id, productId, productName, filename, content, hardwareVersion, totalChunks }) {
  const now = new Date().toISOString();
  await runAsync(
    `INSERT OR IGNORE INTO products (id, name, manufacturer, model, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [productId, productName || productId, "General", "", "", now, now]
  );
  await runAsync(
    `INSERT INTO documents (id, product_id, filename, content, hardware_version, total_chunks, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'INDEXED', ?)`,
    [id, productId, filename, content, hardwareVersion || "", totalChunks, now]
  );
}

export async function getAllDocuments() {
  return await allAsync(`SELECT * FROM documents ORDER BY created_at DESC`);
}

// ── Conversations, users, interactions, ratings — same SQL as before ────
export async function getConversationsByUser(userId) {
  return await allAsync(
    "SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE user_id = ? OR user_id = 'guest' ORDER BY updated_at DESC",
    [userId]
  );
}

export async function getConversationById(id, userId) {
  return await getAsync(
    "SELECT * FROM conversations WHERE id = ? AND (user_id = ? OR user_id = 'guest')",
    [id, userId]
  );
}

export async function saveConversation({ id, userId, title, messages }) {
  const now = new Date().toISOString();
  const messagesJson = typeof messages === "string" ? messages : JSON.stringify(messages || []);
  const existing = await getAsync("SELECT id FROM conversations WHERE id = ?", [id]);

  if (existing) {
    await runAsync(
      "UPDATE conversations SET title = ?, messages_json = ?, updated_at = ? WHERE id = ?",
      [title, messagesJson, now, id]
    );
  } else {
    await runAsync(
      "INSERT INTO conversations (id, user_id, title, messages_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, userId || "guest", title, messagesJson, now, now]
    );
  }
  return { id, userId, title, updated_at: now };
}

export async function deleteConversation(id, userId) {
  await runAsync("DELETE FROM conversations WHERE id = ? AND (user_id = ? OR user_id = 'guest')", [id, userId]);
  return { success: true };
}

export async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  return await getAsync(
    "SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?",
    [clean, clean]
  );
}

export async function findUserByEmail(email) {
  return await findUserByIdentifier(email);
}

export async function getUserById(id) {
  return await getAsync("SELECT id, name, username, email, role, created_at FROM users WHERE id = ?", [id]);
}

export async function createUser({ id, name, username, email, password, role = "user" }) {
  const now = new Date().toISOString();
  const cleanUsername = (username || email.split("@")[0]).trim().toLowerCase();
  await runAsync(
    "INSERT INTO users (id, name, username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, name, cleanUsername, email.trim().toLowerCase(), password, role, now]
  );
  return { id, name, username: cleanUsername, email, role, created_at: now };
}

export async function getAllProducts() {
  return await allAsync("SELECT * FROM products ORDER BY name ASC");
}

export async function recordInteraction({ id, productId, productName, question, answer, citations, escalated, usedSearch }) {
  const now = new Date().toISOString();
  if (productId) {
    try {
      await runAsync(
        `INSERT OR IGNORE INTO products (id, name, manufacturer, model, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [productId, productName || productId, "General", "", "", now, now]
      );
    } catch {}
  }
  await runAsync(
    `INSERT OR REPLACE INTO interactions (id, product_id, product_name, question, answer, citations_json, escalated, used_search, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, productId || null, productName || null, question, answer, JSON.stringify(citations || []), escalated ? 1 : 0, usedSearch ? 1 : 0, now]
  );
}

export async function recordRating(id, interactionId, rating, feedbackText = "") {
  const now = new Date().toISOString();
  await runAsync(
    `INSERT INTO ratings (id, interaction_id, rating, feedback_text, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, interactionId, rating, feedbackText, now]
  );
}

export async function getStats() {
  const productsCount = await getAsync("SELECT COUNT(*) as count FROM products");
  const interactionsCount = await getAsync("SELECT COUNT(*) as count FROM interactions");
  const helpfulCount = await getAsync("SELECT COUNT(*) as count FROM ratings WHERE rating = 'helpful'");
  const notHelpfulCount = await getAsync("SELECT COUNT(*) as count FROM ratings WHERE rating = 'not_helpful'");
  return {
    products: productsCount?.count || 0,
    interactions: interactionsCount?.count || 0,
    helpful: helpfulCount?.count || 0,
    notHelpful: notHelpfulCount?.count || 0,
  };
}