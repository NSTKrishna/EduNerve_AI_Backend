import { asyncHandler } from "../utils/asyncHandler.js";
import * as tokens from "../services/token.service.js";

export const getTokenBalance = asyncHandler(async (req, res) => {
  res.json({ success: true, tokensRemaining: await tokens.getBalance(req.user.userId) });
});

export const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await tokens.listTransactions(req.user.userId, req.validatedQuery.limit);
  res.json({ success: true, transactions });
});
