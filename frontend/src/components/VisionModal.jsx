import React, { useState } from "react";
import { X, Camera, Upload, Check, AlertCircle, Loader2, FileSearch } from "lucide-react";
import { inspectHardwareImage } from "../api.js";

export function VisionModal({ isOpen, onClose, onAttachInspection }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [inspecting, setInspecting] = useState(false);
  const [finding, setFinding] = useState("");
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setImagePreview(result);
      const b64 = result.split(",")[1];
      setBase64Data(b64);
      setFinding("");
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleInspect = async () => {
    if (!base64Data) return;
    setInspecting(true);
    setError(null);
    try {
      const res = await inspectHardwareImage({
        imageBase64: base64Data,
        mimeType,
        prompt:
          "Identify the exact device model, hardware version/revision (e.g. V1, V2), serial/MAC address, port layout, and LED indicator lights status on this product.",
      });
      setFinding(res.finding);
    } catch (err) {
      setError(err.message || "Failed to inspect image");
    } finally {
      setInspecting(false);
    }
  };

  const handleApply = () => {
    onAttachInspection(finding);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: "#fff3ec",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ea580c",
              }}
            >
              <Camera size={16} />
            </div>
            <div>
              <h2 className="modal-title">Hardware Visual Diagnostic</h2>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>Label, Port Array & LED State Analysis</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ width: "30px", height: "30px" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
            Upload a photo of your device rear label, front LED status panel, or physical port layout for automated hardware identification.
          </p>

          <label
            style={{
              border: "1px dashed var(--border-medium)",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              background: "var(--bg-surface)",
              position: "relative",
              overflow: "hidden",
              minHeight: "150px",
              justifyContent: "center",
            }}
          >
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            {imagePreview ? (
              <div style={{ width: "100%", textAlign: "center" }}>
                <img
                  src={imagePreview}
                  alt="Hardware Preview"
                  style={{
                    maxHeight: "160px",
                    maxWidth: "100%",
                    borderRadius: "8px",
                    objectFit: "contain",
                    border: "1px solid var(--border-medium)",
                  }}
                />
              </div>
            ) : (
              <>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "8px",
                    background: "#fff3ec",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ea580c",
                  }}
                >
                  <Upload size={20} />
                </div>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1c1917" }}>
                  Select device image or drop file here
                </span>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  Supports PNG, JPG, WebP
                </span>
              </>
            )}
          </label>

          {imagePreview && !finding && (
            <button
              className="btn-primary"
              onClick={handleInspect}
              disabled={inspecting}
              style={{ justifyContent: "center", padding: "10px" }}
            >
              {inspecting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Analyzing Hardware Details…</span>
                </>
              ) : (
                <>
                  <FileSearch size={15} />
                  <span>Run Hardware Diagnostic Analysis</span>
                </>
              )}
            </button>
          )}

          {error && (
            <div style={{ color: "#be123c", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px", background: "#fff1f2", padding: "10px 12px", borderRadius: "8px", border: "1px solid #fecdd3" }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {finding && (
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-medium)",
                borderRadius: "8px",
                padding: "14px",
                fontSize: "0.84rem",
                maxHeight: "160px",
                overflowY: "auto",
              }}
            >
              <div style={{ fontWeight: 700, color: "#ea580c", marginBottom: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
                Diagnostic Findings:
              </div>
              <div style={{ whiteSpace: "pre-wrap", color: "#1c1917", lineHeight: 1.5 }}>{finding}</div>
            </div>
          )}

          {finding && (
            <button className="btn-primary" onClick={handleApply} style={{ justifyContent: "center", padding: "10px" }}>
              <Check size={15} />
              <span>Attach Diagnostic to Session</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default VisionModal;


