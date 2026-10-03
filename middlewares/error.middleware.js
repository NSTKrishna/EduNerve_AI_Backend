import { logger } from "../utils/logger.js";
import config from "../config/config.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let code = err.code && typeof err.code === "string" && status < 500 ? err.code : "INTERNAL_ERROR";
  let message = err.message;

  if (err.type === "entity.too.large") {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request body is too large";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Request body is not valid JSON";
  } else if (err.name === "PrismaClientKnownRequestError") {
    if (err.code === "P2002") {
      status = 409;
      code = "CONFLICT";
      message = "A record with these values already exists";
    } else if (err.code === "P2025") {
      status = 404;
      code = "NOT_FOUND";
      message = "Record not found";
    }
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, err);
    code = "INTERNAL_ERROR";
    if (config.isProduction) message = "Internal server error";
  }

  res.status(status).json({
    success: false,
    code,
    error: message || "Request failed",
    ...(err.details && { details: err.details }),
    ...(!config.isProduction && status >= 500 && { stack: err.stack }),
  });
};
