import express from "express";
import * as token from "../controllers/token.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { transactionsQuerySchema } from "../schemas/index.js";

const router = express.Router();

router.use(authenticate);
router.get("/", token.getTokenBalance);
router.get("/transactions", validate(transactionsQuerySchema, "query"), token.getTransactions);

export default router;
