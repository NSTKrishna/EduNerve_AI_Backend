import app from "./app.js";
import config from "./config/config.js";
import prisma from "./db/prisma.js";
import { logger } from "./utils/logger.js";

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} (${config.nodeEnv})`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received: closing HTTP server`);

  // Don't hang forever on keep-alive connections.
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
