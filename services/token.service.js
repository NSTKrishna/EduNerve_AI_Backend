import prisma from "../db/prisma.js";
import { AppError } from "../utils/AppError.js";

/**
 * Token ledger helpers. `tx` is a Prisma transaction client so a balance change
 * and its ledger row always commit together.
 */

export async function getBalance(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } });
  if (!user) throw AppError.notFound("User not found");
  return user.tokens;
}

const insufficient = () =>
  new AppError(402, "INSUFFICIENT_TOKENS", "Not enough tokens to start an interview. Please top up your balance.");

/** Cheap read-only check, so callers can refuse before doing expensive work. */
export async function assertCanAfford(userId, amount) {
  if ((await getBalance(userId)) < amount) throw insufficient();
}

/** Atomically subtract tokens; fails (no change) if the balance is too low. */
export async function debit(tx, userId, amount) {
  const { count } = await tx.user.updateMany({
    where: { id: userId, tokens: { gte: amount } },
    data: { tokens: { decrement: amount } },
  });
  if (count === 0) throw insufficient();
  const { tokens } = await tx.user.findUnique({ where: { id: userId }, select: { tokens: true } });
  return tokens;
}

export async function credit(tx, userId, amount) {
  const { tokens } = await tx.user.update({
    where: { id: userId },
    data: { tokens: { increment: amount } },
    select: { tokens: true },
  });
  return tokens;
}

export const recordTransaction = (tx, { userId, delta, balanceAfter, reason, interviewId }) =>
  tx.tokenTransaction.create({
    data: { userId, delta, balanceAfter, reason, interviewId: interviewId ?? null },
  });

export const listTransactions = (userId, limit) =>
  prisma.tokenTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
