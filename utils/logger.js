import config from "../config/config.js";

const format = (value) => (value instanceof Error ? value.stack || value.message : value);

export const logger = {
  info: (...args) => console.log(...args.map(format)),
  warn: (...args) => console.warn(...args.map(format)),
  error: (...args) => console.error(...args.map(format)),
  debug: (...args) => {
    if (!config.isProduction) console.log(...args.map(format));
  },
};

/** One line per request, no bodies or headers (they contain passwords and JWTs). */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}
