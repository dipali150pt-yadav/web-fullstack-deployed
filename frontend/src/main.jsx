import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { checkSession, logout } from "./auth.js";
import "./index.css";

// Loading Screen while restoring active session
function BootScreen({ message = "Restoring session…" }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "16px",
        background: "#0b0f17",
        color: "#94a3b8",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: "0.95rem",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          border: "3px solid rgba(99, 102, 241, 0.2)",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span>{message}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Root() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const existingUser = await checkSession();
        if (existingUser) {
          setUser(existingUser);
        }
      } catch (err) {
        console.warn("Session check failed:", err);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  if (loading) {
    return <BootScreen message="Initializing Intelligent Support Assistant…" />;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <React.StrictMode>
      <App user={user} onLogout={handleLogout} />
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
