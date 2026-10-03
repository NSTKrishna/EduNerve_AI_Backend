import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { AppError } from "../utils/AppError.js";

export function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Authentication required. Please provide a valid token."));
  }

  try {
    req.user = jwt.verify(header.slice(7), config.jwtSecret);
    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Token has expired. Please login again."
        : "Invalid token. Please login again.";
    next(new AppError(401, error.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN", message));
  }
}
