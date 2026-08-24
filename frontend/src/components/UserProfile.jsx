import React, { useState } from "react";
import { LogOut, User, ChevronDown, ShieldCheck } from "lucide-react";

export function UserProfile({ user, onLogout }) {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const displayName = user.name || user.username || user.email || "User";
  const email = user.email || "";
  const role = user.role || "user";
  const isAdmin = role === "admin" || (Array.isArray(user.roles) && user.roles.includes("admin"));

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{ position: "relative" }}>
      {/* Avatar trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={displayName}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "5px 10px 5px 6px",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontSize: "0.82rem",
          boxShadow: "var(--shadow-sm)",
          transition: "all 0.15s ease",
        }}
      >
        {/* Avatar square monogram */}
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: "4px",
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {initials}
        </span>
        <span
          style={{
            maxWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {displayName}
        </span>
        {isAdmin && (
          <span
            style={{
              background: "var(--primary-light)",
              color: "var(--primary)",
              fontSize: "0.62rem",
              padding: "1px 5px",
              borderRadius: "4px",
              fontWeight: 700,
            }}
          >
            Admin
          </span>
        )}
        <ChevronDown size={12} color="var(--text-dim)" />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-modal)",
              width: 220,
              zIndex: 100,
              padding: "6px",
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderBottom: "1px solid var(--border)",
                marginBottom: "4px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-primary)" }}>
                {displayName}
              </div>
              <div
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: "2px",
                }}
              >
                {email}
              </div>
            </div>

            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "var(--radius-xs)",
                color: "var(--error)",
                fontSize: "0.82rem",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--error-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default UserProfile;
