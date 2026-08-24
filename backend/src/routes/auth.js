import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config.js";
import { findUserByIdentifier, createUser, getUserById } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Helper to hash password
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Helper to create signed JWT
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      username: user.username || user.email.split("@")[0],
      email: user.email,
      role: user.role || "user",
      roles: user.role === "admin" ? ["admin", "user"] : ["user"],
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Built-in Demo Accounts (Accessible via username OR email)
const DEMO_ACCOUNTS = [
  {
    id: "user-demo-admin-01",
    name: "Alex Vance (Support Admin)",
    username: "admin",
    email: "admin@support.ai",
    password: hashPassword("admin123"),
    role: "admin",
  },
  {
    id: "user-demo-user-02",
    name: "Sam Taylor (Client)",
    username: "user",
    email: "user@support.ai",
    password: hashPassword("user123"),
    role: "user",
  },
];

/**
 * POST /api/auth/login
 * Supports login with Username OR Email + Password
 */
router.post("/login", async (req, res) => {
  try {
    const { identifier, username, email, password } = req.body;
    const loginIdentifier = (identifier || username || email || "").trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: "Username/Email and password are required" });
    }

    const hashedPassword = hashPassword(password);

    // 1. Check built-in demo accounts by username OR email
    let user = DEMO_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === loginIdentifier || acc.email.toLowerCase() === loginIdentifier
    );

    // 2. If not in demo accounts, query database by username OR email
    if (!user) {
      const dbUser = await findUserByIdentifier(loginIdentifier);
      if (dbUser) {
        user = dbUser;
      }
    }

    if (!user || user.password !== hashedPassword) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username || user.email.split("@")[0],
        email: user.email,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to log in" });
  }
});

/**
 * POST /api/auth/register
 * Register a new user account with Name, Username (optional), Email, and Password
 */
router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = (username || email.split("@")[0]).trim().toLowerCase();

    // Check demo accounts collision
    const demoConflict = DEMO_ACCOUNTS.some(
      (acc) => acc.email.toLowerCase() === trimmedEmail || acc.username.toLowerCase() === trimmedUsername
    );
    if (demoConflict) {
      return res.status(400).json({ error: "An account with this username or email already exists" });
    }

    // Check SQLite database collision
    const existingByEmail = await findUserByIdentifier(trimmedEmail);
    const existingByUsername = await findUserByIdentifier(trimmedUsername);
    if (existingByEmail || existingByUsername) {
      return res.status(400).json({ error: "An account with this username or email already exists" });
    }

    const newUser = await createUser({
      id: `user-${uuidv4()}`,
      name: name.trim(),
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashPassword(password),
      role: role === "admin" ? "admin" : "user",
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Failed to register account" });
  }
});

/**
 * POST /api/auth/demo
 * 1-Click Instant Demo Login
 */
router.post("/demo", (req, res) => {
  try {
    const { role = "admin" } = req.body;
    const user = DEMO_ACCOUNTS.find((acc) => acc.role === role) || DEMO_ACCOUNTS[0];

    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Demo login error:", err);
    return res.status(500).json({ error: "Failed to generate demo session" });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    return res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

export default router;
