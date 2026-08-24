# 🚀 Intelligent Product Support Assistant (Fullstack Web Edition)

A high-performance, version-aware, multimodal AI technical product support assistant built with **React + Vite** and **Node.js Express** featuring built-in glassmorphic authentication.

---

## 📁 Project Structure

```
web-fullstack/
├── backend/                  # Node.js Express REST API & Vector Store
│   ├── data/                 # Indexed manuals, product documents & SQLite DB
│   ├── src/
│   │   ├── server.js         # Express server entry point (Port 5000)
│   │   ├── chatService.js    # Multi-tier domain routing & grounded generation
│   │   ├── vectorStore.js    # 768-D dense hashed embedding vector search
│   │   ├── llm.js            # LLM API caller & vision diagnostics
│   │   └── routes/           # Auth, Chat, documents, devices, feedback routes
│   ├── .env                  # API keys and JWT secret
│   └── package.json
│
├── frontend/                 # React + Vite Glassmorphic Dashboard
│   ├── src/
│   │   ├── App.jsx           # Main state orchestrator
│   │   ├── auth.js           # JWT session manager & auth client
│   │   ├── components/       # LoginPage, Sidebar, ChatMessage, Modals, UserProfile
│   │   └── index.css         # Dark obsidian glassmorphic theme
│   └── package.json
│
├── start.bat                 # 1-Click launcher for Windows
└── package.json
```

---

## ⚡ How to Run

### Option 1: 1-Click on Windows
Double-click **`start.bat`**.

### Option 2: Manual Terminal Commands

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
   *Runs on `http://localhost:5000`*

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Runs on `http://localhost:5173`*

---

## 🔐 Authentication Credentials

The app features built-in authentication with pre-configured demo roles and new user registration:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Support Admin** | `admin@support.ai` | `admin123` | Full administrative & diagnostics |
| **Client / User** | `user@support.ai` | `user123` | Standard customer support |

*You can also click the **"1-Click Instant Demo"** buttons on the login screen or register a new account.*
