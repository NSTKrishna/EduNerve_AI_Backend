import { PrismaClient } from "@prisma/client";
import config from "../config/config.js";

const prisma = new PrismaClient({
  log: config.isProduction ? ["error"] : ["warn", "error"],
});

export default prisma;
