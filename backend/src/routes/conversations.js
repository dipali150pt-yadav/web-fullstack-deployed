import express from "express";
import { v4 as uuidv4 } from "uuid";
import {
  getConversationsByUser,
  getConversationById,
  saveConversation,
  deleteConversation,
} from "../db.js";

const router = express.Router();

// GET /api/conversations - list all saved chats for user
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id || "guest";
    const convs = await getConversationsByUser(userId);
    return res.json({ conversations: convs });
  } catch (err) {
    console.error("Fetch conversations error:", err);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// GET /api/conversations/:id - get full conversation with messages
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user?.id || "guest";
    const conv = await getConversationById(req.params.id, userId);
    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    let messages = [];
    try {
      messages = JSON.parse(conv.messages_json);
    } catch {
      messages = [];
    }
    return res.json({ conversation: { ...conv, messages } });
  } catch (err) {
    console.error("Get conversation error:", err);
    return res.status(500).json({ error: "Failed to get conversation" });
  }
});

// POST /api/conversations - save or update conversation
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.id || "guest";
    const { id, title, messages } = req.body;

    const convId = id || `conv-${uuidv4()}`;
    const convTitle = title || (messages && messages[1]?.content?.slice(0, 40)) || "New Support Chat";

    const saved = await saveConversation({
      id: convId,
      userId,
      title: convTitle,
      messages,
    });

    return res.json({ conversation: saved });
  } catch (err) {
    console.error("Save conversation error:", err);
    return res.status(500).json({ error: "Failed to save conversation" });
  }
});

// DELETE /api/conversations/:id - delete a conversation
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.id || "guest";
    await deleteConversation(req.params.id, userId);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete conversation error:", err);
    return res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
