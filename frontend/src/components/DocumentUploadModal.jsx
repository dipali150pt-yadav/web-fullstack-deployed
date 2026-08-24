import React, { useState } from "react";
import { X, FileText, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadDocument } from "../api.js";

export function DocumentUploadModal({ isOpen, onClose, onUploadSuccess, devices = [] }) {
  const [file, setFile] = useState(null);
  const [productName, setProductName] = useState("");
  const [selectedExistingId, setSelectedExistingId] = useState("");
  const [manufacturer, setManufacturer] = useState("General");
  const [hardwareVersion, setHardwareVersion] = useState("V1.0");
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (isOpen === false) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setSelectedExistingId("");
      const cleanName = selected.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setProductName(cleanName);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const selected = e.dataTransfer.files?.[0];
    if (selected) {
      setFile(selected);
      setSelectedExistingId("");
      const cleanName = selected.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setProductName(cleanName);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Please select a PDF or text document file.");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (selectedExistingId) {
        formData.append("productId", selectedExistingId);
      } else {
        formData.append("productName", productName || file.name.replace(/\.[^/.]+$/, ""));
      }

      formData.append("manufacturer", manufacturer || "General");
      formData.append("hardwareVersion", hardwareVersion || "V1.0");

      const data = await uploadDocument(formData);
      setSuccessMsg(`Document indexed (${data.chunksCount || 1} chunks stored in Vector Engine)`);

      setTimeout(() => {
        if (onUploadSuccess) {
          onUploadSuccess({
            productId: data.productId,
            productName: data.productName || productName || selectedExistingId,
            hardwareVersion: data.hardwareVersion || hardwareVersion,
            filename: file.name,
            chunksCount: data.chunksCount,
          });
        }
        if (onClose) onClose();
      }, 1000);
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg(err.message || "Failed to parse and index document.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={16} color="var(--primary)" />
            <h3 className="modal-title">Upload Technical Documentation</h3>
          </div>
          <button className="btn-action-icon" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "20px" }}>
          {/* Dropzone */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 16px",
              border: `2px dashed ${isDragOver ? "var(--primary)" : "var(--border-strong)"}`,
              borderRadius: "var(--radius-md)",
              background: isDragOver ? "var(--primary-light)" : "var(--bg)",
              cursor: "pointer",
              textAlign: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <input
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Upload size={18} />
            </div>
            <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {file ? `Selected: ${file.name}` : "Click or drag PDF / Markdown document here"}
            </span>
            <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
              Supports PDF, Markdown (.md), Text (.txt) up to 25MB
            </span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                Target Product ID
              </label>
              <select
                className="select-control"
                value={selectedExistingId}
                onChange={(e) => setSelectedExistingId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "var(--radius-sm)",
                  color: "#0F172A",
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              >
                <option value="">+ New Product Slug</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                Hardware Version
              </label>
              <input
                type="text"
                placeholder="e.g. V1.0 or V2.0"
                value={hardwareVersion}
                onChange={(e) => setHardwareVersion(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "var(--radius-sm)",
                  color: "#0F172A",
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {!selectedExistingId && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dell OptiPlex 7090"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "var(--radius-sm)",
                    color: "#0F172A",
                    fontSize: "0.82rem",
                    outline: "none",
                  }}
                  required={!selectedExistingId}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Manufacturer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dell, TP-Link"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "var(--radius-sm)",
                    color: "#0F172A",
                    fontSize: "0.82rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ color: "#DC2626", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", background: "#FEF2F2", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid #FECACA" }}>
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ color: "#047857", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", background: "#ECFDF5", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid #A7F3D0" }}>
              <CheckCircle2 size={14} /> {successMsg}
            </div>
          )}

          <div className="modal-footer" style={{ margin: "0 -20px -20px", padding: "12px 20px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={uploading || !file}
            >
              {uploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Indexing Document...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Index Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DocumentUploadModal;
