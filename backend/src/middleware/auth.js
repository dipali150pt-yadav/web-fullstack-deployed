import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

/**
 * Express middleware — validates the Bearer token in the Authorization header.
 * On success  → attaches the decoded token payload to req.user and calls next().
 * On failure  → returns 401 Unauthorized.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Attach user info to the request for downstream handlers
    req.user = {
      id: payload.id || payload.sub,
      username: payload.username || payload.preferred_username || payload.name,
      email: payload.email,
      name: payload.name || payload.username || "User",
      role: payload.role || "user",
      roles: payload.roles || (payload.role ? [payload.role] : ["user"]),
    };

    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid or unauthorized token." });
  }
}

/**
 * Optional helper — checks that the authenticated user has a specific role.
 * Returns 403 if the role is missing.
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role && !req.user?.roles?.includes(role)) {
      return res.status(403).json({ error: `Forbidden: requires role '${role}'` });
    }
    return next();
  };
}
