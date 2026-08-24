import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Camera,
  Loader2,
  FileUp,
  X,
  Activity,
  FileText,
  Cpu,
  Sliders,
  Wrench,
  ShieldCheck,
  Sun,
  Moon,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { ChatMessage } from "./components/ChatMessage";
import { VisionModal } from "./components/VisionModal";
import { DocumentUploadModal } from "./components/DocumentUploadModal";
import { StatsModal } from "./components/StatsModal";
import { UserProfile } from "./components/UserProfile";
import {
  fetchDevices,
  sendChatMessage,
  fetchConversations,
  fetchConversation,
  saveConversationApi,
  deleteConversationApi,
} from "./api";

const STARTER_PROMPTS = [
  {
    icon: Cpu,
    title: "Product Specifications",
    desc: "Examine processor, memory, storage, and graphics configuration",
    prompt: "What are the core technical specifications of this device?",
  },
  {
    icon: Sliders,
    title: "Connectivity & I/O Ports",
    desc: "List available USB ports, display outputs, and networking options",
    prompt: "What ports, display outputs, and network interfaces are available?",
  },
  {
    icon: Wrench,
    title: "Diagnostics & Troubleshooting",
    desc: "Troubleshoot connectivity drops, power issues, and alert indicators",
    prompt: "What are the troubleshooting steps if network connection drops?",
  },
  {
    icon: ShieldCheck,
    title: "Warranty & Service Entitlement",
    desc: "Review hardware coverage terms and service claim procedures",
    prompt: "What is the warranty policy and how do I verify coverage?",
  },
];

export function App({ user, onLogout }) {
  const [devices, setDevices] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeProduct, setActiveProduct] = useState("");
  const [activeVersion, setActiveVersion] = useState("");
  const [queryMode, setQueryMode] = useState("document"); // "document" | "faq"

  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [visualInspection, setVisualInspection] = useState("");
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [isDocUploadOpen, setIsDocUploadOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Theme Switcher State (persisted in localStorage)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("support_portal_theme") || "dark";
  });

  const messagesEndRef = useRef(null);

  // Sync theme with html root attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("support_portal_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Load devices and saved conversations on mount
  useEffect(() => {
    fetchDevices()
      .then((data) => setDevices(data.devices || []))
      .catch((err) => console.error("Could not load devices:", err));

    loadSavedConversations();
  }, []);

  const loadSavedConversations = async () => {
    try {
      const data = await fetchConversations();
      const list = data.conversations || [];
      setConversations(list);

      // Auto-load most recent conversation if available
      if (list.length > 0) {
        const first = list[0];
        setActiveConversationId(first.id);
        const convData = await fetchConversation(first.id);
        if (convData.conversation?.messages?.length > 0) {
          setMessages(convData.conversation.messages);
        }
      }
    } catch (err) {
      console.warn("Could not load conversations:", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSelectConversation = async (convId) => {
    if (convId === activeConversationId) return;
    try {
      setLoading(true);
      setActiveConversationId(convId);
      const data = await fetchConversation(convId);
      if (data.conversation?.messages) {
        setMessages(data.conversation.messages);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setVisualInspection("");
    setInputPrompt("");
    setMessages([]);
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await deleteConversationApi(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const executeSend = async (queryText) => {
    const query = (queryText || inputPrompt).trim();
    if (!query || loading) return;

    const userMsg = {
      role: "user",
      content: query,
      visualInfo: visualInspection,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt("");
    const attachedVisual = visualInspection;
    setVisualInspection("");
    setLoading(true);

    let convId = activeConversationId;
    if (!convId) {
      convId = `conv-${Date.now()}`;
      setActiveConversationId(convId);
    }

    const title = query.length > 35 ? query.slice(0, 35) + "…" : query;

    try {
      const historyContext = newMessages
        .filter((m) => m.role === "user" || m.role === "bot")
        .slice(-6)
        .map((m) => ({
          role: m.role === "bot" ? "assistant" : "user",
          content: m.content,
        }));

      // If user is in FAQ query mode, don't pass active product so it targets the 686 FAQs directly
      const targetProduct = queryMode === "faq" ? null : (activeProduct || null);

      const res = await sendChatMessage({
        question: query,
        history: historyContext,
        activeProduct: targetProduct,
        activeVersion: activeVersion || null,
        visualInfo: attachedVisual,
      });

      const botMsg = {
        role: "bot",
        content: res.answer,
        citations: res.citations || [],
        escalated: res.escalated || false,
        interactionId: res.interactionId || null,
      };

      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);

      // Only update active product if it's a real device/document and NOT a generic FAQ string
      if (
        res.productName &&
        !activeProduct &&
        res.productName !== "Support Knowledge Base" &&
        res.productName !== "Support FAQ" &&
        res.productName !== "faq" &&
        res.productName !== "unknown"
      ) {
        setActiveProduct(res.productName);
      }
      if (res.hardwareVersion && !activeVersion) {
        setActiveVersion(res.hardwareVersion);
      }

      await saveConversationApi({
        id: convId,
        title,
        activeProduct: activeProduct || null,
        activeVersion: activeVersion || null,
        messages: finalMessages,
      });

      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === convId);
        const item = {
          id: convId,
          title,
          updated_at: new Date().toISOString(),
          active_product: activeProduct || null,
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = item;
          return updated;
        }
        return [item, ...prev];
      });
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg = {
        role: "bot",
        content: "An unexpected error occurred while communicating with the support engine. Please retry.",
        citations: [],
        escalated: true,
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeSend();
    }
  };

  const handleDocumentUploaded = (docResult) => {
    setActiveProduct(docResult.productId);
    setActiveVersion(docResult.hardwareVersion || "V1.0");
    setQueryMode("document");

    const sysMsg = {
      role: "bot",
      content: `### 📄 Documentation Active: **${docResult.productName || docResult.productId}**\n\n- **File Name**: \`${docResult.filename}\`\n\nYou may now ask questions regarding hardware specifications, connectivity, troubleshooting, or setup procedures.`,
      citations: [
        {
          title: docResult.filename,
          url: "",
          source_type: "document",
          score: 1.0,
        },
      ],
    };
    setMessages((prev) => [...prev, sysMsg]);
  };

  const handleVisionDetected = (det) => {
    const info = `Identified Device: ${det.detected_product || "Hardware"} | Version: ${det.detected_version || "Standard"}\nObservations: ${det.analysis}`;
    setVisualInspection(info);
    if (det.detected_product) {
      setActiveProduct(det.detected_product);
    }
    if (det.detected_version) {
      setActiveVersion(det.detected_version);
    }
    setIsVisionOpen(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onOpenDocUpload={() => setIsDocUploadOpen(true)}
      />

      {/* Main Workspace */}
      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            {activeProduct ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Active Document Tag */}
                <div className="active-doc-tag">
                  <FileText size={13} color="var(--primary-light)" />
                  <span>Document: <strong>{activeProduct} {activeVersion ? `(${activeVersion})` : ""}</strong></span>
                  <button
                    className="btn-dismiss-doc"
                    onClick={() => {
                      setActiveProduct("");
                      setActiveVersion("");
                    }}
                    title="Clear active document"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Mode Selector */}
                <div style={{ display: "flex", background: "var(--input)", padding: "2px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setQueryMode("document")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: queryMode === "document" ? "var(--primary)" : "transparent",
                      color: queryMode === "document" ? "#F8FAFC" : "var(--text-secondary)",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <BookOpen size={11} />
                    <span>PDF Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueryMode("faq")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: queryMode === "faq" ? "var(--primary)" : "transparent",
                      color: queryMode === "faq" ? "#F8FAFC" : "var(--text-secondary)",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <HelpCircle size={11} />
                    <span>General FAQ (686)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  <FileText size={13} color="var(--text-muted)" />
                  <span>Technical Support Knowledge Base</span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-header-actions">
            {/* Dark / Light Mode Switcher */}
            <button
              className="btn-theme-toggle"
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <button
              className="btn-secondary"
              onClick={() => setIsDocUploadOpen(true)}
              title="Upload PDF Document"
            >
              <FileUp size={13} />
              <span>Upload Document</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => setIsStatsOpen(true)}
              title="System Metrics"
            >
              <Activity size={13} />
              <span>Metrics</span>
            </button>

            <UserProfile user={user} onLogout={onLogout} />
          </div>
        </header>

        {/* Message Feed / Welcome Screen */}
        <div className="chat-messages-container">
          {messages.length === 0 ? (
            <div className="starter-container">
              <h2 className="starter-title">Technical Support & Documentation Portal</h2>
              <p className="starter-subtitle">
                Query verified support FAQs, analyze uploaded PDF documentation, or inspect hardware specifications.
              </p>

              <div className="starter-grid">
                {STARTER_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="starter-card"
                      onClick={() => executeSend(item.prompt)}
                    >
                      <div className="starter-card-title">
                        <span>{item.title}</span>
                        <Icon size={14} color="var(--primary-light)" />
                      </div>
                      <div className="starter-card-desc">{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                message={msg}
                onSelectCitation={(cite) => executeSend(`Tell me more about ${cite.title}`)}
              />
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="message-wrapper bot">
              <div className="avatar bot">
                <Loader2 size={14} className="animate-spin" />
              </div>
              <div className="message-bubble" style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                Retrieving documentation and synthesizing response...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Console */}
        <div className="chat-input-wrapper">
          {/* Quick FAQ Suggestion Bar if active */}
          {queryMode === "faq" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", overflowX: "auto", paddingBottom: "4px" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>General FAQs:</span>
              {[
                "What is your return policy?",
                "What payment methods do you accept?",
                "What should I do if my package is lost or damaged?",
                "How can I track my order?",
              ].map((faqText, idx) => (
                <button
                  key={idx}
                  onClick={() => executeSend(faqText)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary-bright)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  {faqText}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-box">
            <textarea
              className="chat-textarea"
              rows={1}
              placeholder={
                queryMode === "faq"
                  ? "Ask any general support question (orders, shipping, payments, returns, warranties)..."
                  : activeProduct
                  ? `Ask a technical question about ${activeProduct} (specifications, ports, diagnostics)...`
                  : "Search manual, query support database, or ask a technical question..."
              }
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <div className="chat-input-actions">
              <button
                className="btn-input-icon"
                onClick={() => setIsDocUploadOpen(true)}
                title="Upload PDF Document"
              >
                <FileUp size={15} />
              </button>

              <button
                className="btn-send"
                onClick={() => executeSend()}
                disabled={loading || !inputPrompt.trim()}
                title="Submit (Enter)"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          <div className="input-helper-text">
            {queryMode === "faq"
              ? "Querying 686 Verified Support Knowledge Base Entries"
              : activeProduct
              ? `Grounded with RAG Vector Retrieval for: ${activeProduct}`
              : "Press Enter to send · Shift + Enter for new line · Grounded with RAG Vector Retrieval"}
          </div>
        </div>
      </main>

      {/* Modals */}
      {isDocUploadOpen && (
        <DocumentUploadModal
          onClose={() => setIsDocUploadOpen(false)}
          onUploadSuccess={handleDocumentUploaded}
        />
      )}

      {isVisionOpen && (
        <VisionModal
          onClose={() => setIsVisionOpen(false)}
          onDetected={handleVisionDetected}
        />
      )}

      {isStatsOpen && <StatsModal onClose={() => setIsStatsOpen(false)} />}
    </div>
  );
}

export default App;
