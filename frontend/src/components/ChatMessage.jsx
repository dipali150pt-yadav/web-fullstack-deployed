import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, ShieldCheck, ExternalLink, AlertTriangle, CheckCircle2, Copy, Check, FileText } from "lucide-react";

export function ChatMessage({ message, onSelectCitation }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`message-wrapper ${isUser ? "user" : "bot"}`}>
      <div className={`avatar ${isUser ? "user" : "bot"}`}>
        {isUser ? <User size={14} /> : <ShieldCheck size={14} />}
      </div>

      <div className="message-content">
        <div className={`message-bubble ${isUser ? "user" : "bot"}`}>
          {/* Attached Visual Hardware Preview Badge */}
          {message.visualInfo && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                marginBottom: "10px",
                borderRadius: "var(--radius-xs)",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border)",
                fontSize: "0.76rem",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              <span>Hardware Diagnostic Photo Attached</span>
            </div>
          )}

          {/* Markdown Rendered Content */}
          <div style={{ wordBreak: "break-word" }}>
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          </div>

          {/* Escalation Alert */}
          {message.escalated && (
            <div
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--warning-bg)",
                border: "1px solid #FCD34D",
                color: "#92400E",
                fontSize: "0.78rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>This inquiry requires Tier-2 escalation to prevent misconfiguration.</span>
            </div>
          )}

          {/* Citations List */}
          {message.citations && message.citations.length > 0 && (
            <div className="citations-box">
              <span className="citations-label">Source Document:</span>
              {message.citations.map((cite, idx) => (
                <a
                  key={idx}
                  href={cite.url || "#"}
                  target={cite.url ? "_blank" : "_self"}
                  rel="noreferrer"
                  className="citation-pill"
                  onClick={(e) => {
                    if (!cite.url && onSelectCitation) {
                      e.preventDefault();
                      onSelectCitation(cite);
                    }
                  }}
                >
                  <FileText size={12} color="var(--primary-light)" />
                  <span>{cite.title}</span>
                  {cite.section && cite.section.length <= 25 && !cite.section.includes("...") && !/[.,;]/.test(cite.section) && (
                    <span style={{ opacity: 0.7 }}>· {cite.section}</span>
                  )}
                  {cite.url && <ExternalLink size={10} />}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Action Row for Bot: Verified Badge & Copy Button */}
        {!isUser && (
          <div className="message-footer">
            <div className="rag-verified-badge">
              <CheckCircle2 size={12} color="#059669" />
              <span>Verified Documentation Response</span>
            </div>

            <button
              onClick={handleCopy}
              title="Copy response"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 6px",
                borderRadius: "var(--radius-xs)",
              }}
            >
              {copied ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
