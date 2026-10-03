-- Hand-written so existing rows are converted in place (Prisma's auto-diff would drop and re-add columns).

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('in_progress', 'completed', 'abandoned');
CREATE TYPE "InterviewType" AS ENUM ('technical', 'behavioral', 'mixed');
CREATE TYPE "TokenReason" AS ENUM ('SIGNUP_GRANT', 'INTERVIEW_START', 'INTERVIEW_REFUND', 'ADMIN_ADJUSTMENT');

-- Interview: string columns -> enums (values are preserved via cast)
ALTER TABLE "Interview" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Interview" ALTER COLUMN "status" TYPE "InterviewStatus" USING ("status"::"InterviewStatus");
ALTER TABLE "Interview" ALTER COLUMN "status" SET DEFAULT 'in_progress';
ALTER TABLE "Interview" ALTER COLUMN "interviewType" TYPE "InterviewType" USING ("interviewType"::"InterviewType");

-- Interview: audit column + index for history queries
ALTER TABLE "Interview" ADD COLUMN "tokensCharged" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Interview_userId_startedAt_idx" ON "Interview"("userId", "startedAt");

-- User: per-user token balance
ALTER TABLE "User" ADD COLUMN "tokens" INTEGER NOT NULL DEFAULT 100;

-- User: drop the unused Google OAuth columns; password becomes required.
-- Accounts that had no password get an unmatchable placeholder (they cannot log in).
DROP INDEX IF EXISTS "User_googleId_key";
ALTER TABLE "User" DROP COLUMN "googleId";
ALTER TABLE "User" DROP COLUMN "provider";
ALTER TABLE "User" DROP COLUMN "avatar";
UPDATE "User" SET "password" = '!' WHERE "password" IS NULL;
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "TokenReason" NOT NULL,
    "interviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TokenTransaction_userId_createdAt_idx" ON "TokenTransaction"("userId", "createdAt");

ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Give existing users a ledger entry matching their starting balance
INSERT INTO "TokenTransaction" ("id", "userId", "delta", "balanceAfter", "reason")
SELECT gen_random_uuid()::text, "id", 100, 100, 'SIGNUP_GRANT' FROM "User";
