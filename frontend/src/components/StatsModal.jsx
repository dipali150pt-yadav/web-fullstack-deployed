import React, { useEffect, useState } from "react";
import { X, Database, CheckCircle, Activity, FileText } from "lucide-react";
import { fetchStats } from "../api.js";

export function StatsModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  if (isOpen === false) return null;

  useEffect(() => {
    setLoading(true);
    fetchStats()
      .then((data) => setStats(data.stats))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={16} color="var(--primary)" />
            <h3 className="modal-title">System Metrics & Ingestion State</h3>
          </div>
          <button className="btn-action-icon" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Retrieving metrics...
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div
                style={{
                  background: "var(--surface-subtle)",
                  padding: "16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600 }}>
                  <Database size={14} color="var(--primary)" /> Indexed Products
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px", color: "var(--text-primary)" }}>
                  {stats?.products || 0}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Active knowledge containers
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-subtle)",
                  padding: "16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600 }}>
                  <CheckCircle size={14} color="var(--success)" /> Resolved Queries
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px", color: "var(--text-primary)" }}>
                  {stats?.interactions || 0}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Grounded documentation queries
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-subtle)",
                  padding: "16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600 }}>
                  <FileText size={14} color="var(--primary)" /> Verified FAQs
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px", color: "var(--text-primary)" }}>
                  686
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Hugging Face support dataset
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-subtle)",
                  padding: "16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.76rem", fontWeight: 600 }}>
                  <Activity size={14} color="var(--success)" /> Vector Mode
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px", color: "var(--text-primary)" }}>
                  Pure RAG
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Cosine similarity retrieval
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatsModal;
