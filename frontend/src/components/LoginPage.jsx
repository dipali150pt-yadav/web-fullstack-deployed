import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
  KeyRound,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";
import { loginWithCredentials, registerWithCredentials, loginWithDemo } from "../auth";

export function LoginPage({ onLoginSuccess }) {
  const [tab, setTab] = useState("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Theme Switcher State (persisted in localStorage)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("support_portal_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("support_portal_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your email/username and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await loginWithCredentials(identifier.trim(), password);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await registerWithCredentials({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        role,
      });
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoRole) => {
    try {
      setLoading(true);
      setError("");
      const data = await loginWithDemo(demoRole);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || "Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Top Floating Theme Switcher Button */}
      <div style={styles.topBar}>
        <button
          className="btn-theme-toggle"
          onClick={toggleTheme}
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          style={styles.themeBtn}
        >
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>

      <div style={styles.loginCard}>
        {/* Header Branding */}
        <div style={styles.header}>
          <div style={styles.brandIconBox}>
            <Database size={20} color="var(--primary-light)" />
          </div>
          <h1 style={styles.title}>Enterprise Support Portal</h1>
          <p style={styles.subtitle}>Grounded Technical Knowledge Base & Diagnostics</p>
        </div>

        {/* Quick Demo Access */}
        <div style={styles.demoSection}>
          <div style={styles.demoLabel}>
            <span>Fast Sign-In</span>
          </div>
          <div style={styles.demoGrid}>
            <button
              type="button"
              style={styles.demoCard}
              onClick={() => handleQuickDemo("admin")}
              disabled={loading}
            >
              <div style={styles.demoCardHeader}>
                <span style={styles.demoTitle}>Admin Account</span>
                <span style={styles.demoBadge}>Admin</span>
              </div>
              <span style={styles.demoSubtitle}>admin@support.ai</span>
            </button>

            <button
              type="button"
              style={styles.demoCard}
              onClick={() => handleQuickDemo("user")}
              disabled={loading}
            >
              <div style={styles.demoCardHeader}>
                <span style={styles.demoTitle}>Engineer Account</span>
                <span style={styles.demoBadgeUser}>Support</span>
              </div>
              <span style={styles.demoSubtitle}>tech@client.io</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or continue with email</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Tab Switcher */}
        <div style={styles.tabContainer}>
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(tab === "signin" ? styles.tabButtonActive : {}),
            }}
            onClick={() => {
              setTab("signin");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(tab === "signup" ? styles.tabButtonActive : {}),
            }}
            onClick={() => {
              setTab("signup");
              setError("");
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Forms */}
        {tab === "signin" ? (
          <form onSubmit={handleSignIn} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email or Username</label>
              <div style={styles.inputWrapper}>
                <Mail size={15} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="admin@support.ai"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={15} style={styles.inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              <span>{loading ? "Authenticating..." : "Sign In to Portal"}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <User size={15} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={15} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={15} style={styles.inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              <span>{loading ? "Creating Account..." : "Create Account"}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* Footer info */}
        <div style={styles.trustFooter}>
          <div style={styles.trustItem}>
            <ShieldCheck size={13} color="var(--primary-light)" />
            <span>256-bit Secure Session</span>
          </div>
          <div style={styles.trustItem}>
            <KeyRound size={13} color="var(--success)" />
            <span>RAG Verified Docs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    background: "var(--bg)",
    padding: "20px",
    position: "relative",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    transition: "background-color 0.15s ease",
  },
  topBar: {
    position: "absolute",
    top: "20px",
    right: "24px",
    zIndex: 10,
  },
  themeBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "6px",
  },
  loginCard: {
    width: "100%",
    maxWidth: "440px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "34px 30px",
    boxShadow: "var(--shadow-md)",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  },
  header: {
    textAlign: "center",
    marginBottom: "22px",
  },
  brandIconBox: {
    width: "40px",
    height: "40px",
    margin: "0 auto 12px auto",
    borderRadius: "6px",
    background: "var(--primary-subtle)",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-heading)",
    letterSpacing: "-0.02em",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    margin: 0,
  },
  demoSection: {
    marginBottom: "16px",
  },
  demoLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
    marginBottom: "8px",
  },
  demoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  demoCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "10px 12px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    gap: "2px",
    transition: "all 0.15s ease",
  },
  demoCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "2px",
  },
  demoBadge: {
    fontSize: "0.62rem",
    fontWeight: 600,
    background: "var(--primary-subtle)",
    color: "var(--primary-light)",
    border: "1px solid var(--border)",
    padding: "1px 6px",
    borderRadius: "4px",
  },
  demoBadgeUser: {
    fontSize: "0.62rem",
    fontWeight: 600,
    background: "var(--success-bg)",
    color: "var(--success-light)",
    border: "1px solid var(--success-border)",
    padding: "1px 6px",
    borderRadius: "4px",
  },
  demoTitle: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text-heading)",
  },
  demoSubtitle: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "16px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "var(--border)",
  },
  dividerText: {
    fontSize: "0.74rem",
    color: "var(--text-muted)",
  },
  tabContainer: {
    display: "flex",
    background: "var(--input)",
    padding: "3px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    marginBottom: "16px",
    gap: "4px",
  },
  tabButton: {
    flex: 1,
    padding: "7px 12px",
    borderRadius: "4px",
    border: "none",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: "0.82rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabButtonActive: {
    background: "var(--surface)",
    color: "var(--text-heading)",
    fontWeight: 600,
    border: "1px solid var(--border)",
  },
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--error-bg)",
    border: "1px solid var(--error)",
    borderRadius: "6px",
    padding: "9px 12px",
    color: "var(--error)",
    fontSize: "0.8rem",
    marginBottom: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "9px 36px 9px 36px",
    background: "var(--input)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--text-heading)",
    fontSize: "0.86rem",
    outline: "none",
  },
  eyeBtn: {
    position: "absolute",
    right: "10px",
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "2px",
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "100%",
    padding: "9px",
    marginTop: "6px",
    background: "var(--primary)",
    border: "1px solid var(--primary-bright)",
    borderRadius: "6px",
    color: "#F8FAFC",
    fontSize: "0.86rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  trustFooter: {
    marginTop: "20px",
    paddingTop: "14px",
    borderTop: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "0.74rem",
    color: "var(--text-muted)",
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
};

export default LoginPage;
