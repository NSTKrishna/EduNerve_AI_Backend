import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { Token } from "../controllers/token.controller.js";

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    console.log("Auth middleware:", {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader?.substring(0, 30) + "...",
      path: req.path,
    });

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No valid auth header");
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please provide a valid token.",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const decoded = jwt.verify(token, config.jwtSecret || "your-secret-key");
      req.user = decoded; // Add user info to request
      next();
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token has expired. Please login again.",
        });
      }
      return res.status(401).json({
        success: false,
        error: "Invalid token. Please login again.",
      });
    }
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
}

// Optional authentication - doesn't fail if no token
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(
          token,
          config.jwtSecret || "your-secret-key",
        );
        req.user = decoded;
      } catch (jwtError) {
        // Token is invalid but we don't fail, just continue without user
        req.user = null;
      }
    }
    next();
  } catch (error) {
    console.error("Error in optional auth middleware:", error);
    next();
  }
}
