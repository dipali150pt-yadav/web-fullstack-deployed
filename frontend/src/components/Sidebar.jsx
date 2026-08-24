import React, { useState } from "react";
import { Plus, MessageSquare, Trash2, Clock, FileText, Search, Database } from "lucide-react";

export function Sidebar({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenDocUpload,
}) {
  const [searchFilter, setSearchFilter] = useState("");

  const filteredConversations = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="brand-icon-box">
          <Database size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="sidebar-title">Support Portal</h1>
          <p className="sidebar-subtitle">
            <span className="status-indicator" />
            <span>Enterprise Knowledge Base</span>
          </p>
        </div>
      </div>

      {/* Action Button: New Session */}
      <div style={{ padding: "14px 12px 6px 12px" }}>
        <button
          className="btn-primary"
          onClick={onNewChat}
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "8px 12px",
            fontSize: "0.82rem",
          }}
        >
          <Plus size={14} />
          <span>New Support Session</span>
        </button>
      </div>

      {/* Search Filter */}
      {conversations.length > 2 && (
        <div style={{ padding: "6px 12px 4px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
            }}
          >
            <Search size={12} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.78rem",
                outline: "none",
                width: "100%",
              }}
            />
          </div>
        </div>
      )}

      {/* Chat History Section */}
      <div className="sidebar-content">
        <div className="sidebar-section-title">
          <span>Recent Sessions</span>
        </div>

        {conversations.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: "0.78rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Clock size={16} style={{ opacity: 0.4 }} />
            <span>No previous sessions</span>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`conversation-item ${isActive ? "active" : ""}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                  <MessageSquare size={13} color={isActive ? "var(--primary)" : "var(--text-muted)"} style={{ flexShrink: 0 }} />
                  <span className="conversation-title">{conv.title || "Support Inquiry"}</span>
                </div>

                <button
                  className="btn-delete-conv"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  title="Delete session"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Docs Upload in Sidebar Footer */}
      <div className="sidebar-footer">
        <button
          className="btn-secondary"
          onClick={onOpenDocUpload}
          style={{ width: "100%", fontSize: "0.78rem", padding: "7px 10px" }}
        >
          <FileText size={13} />
          <span>Upload PDF Document</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
