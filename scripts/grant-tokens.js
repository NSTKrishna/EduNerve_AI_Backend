// Usage: npm run tokens:grant -- user@example.com 50
import prisma from "../db/prisma.js";
import * as tokens from "../services/token.service.js";

const [email, amountArg] = process.argv.slice(2);
const amount = Number(amountArg);

if (!email || !Number.isInteger(amount) || amount === 0) {
  console.error("Usage: npm run tokens:grant -- <email> <non-zero integer amount>");
  process.exit(1);
}

try {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error(`No user with email ${email}`);

  const balance = await prisma.$transaction(async (tx) => {
    const balanceAfter =
      amount > 0 ? await tokens.credit(tx, user.id, amount) : await tokens.debit(tx, user.id, -amount);
    await tokens.recordTransaction(tx, {
      userId: user.id,
      delta: amount,
      balanceAfter,
      reason: "ADMIN_ADJUSTMENT",
    });
    return balanceAfter;
  });
  console.log(`${email}: ${amount > 0 ? "+" : ""}${amount} tokens, balance is now ${balance}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
