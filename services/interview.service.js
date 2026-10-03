import prisma from "../db/prisma.js";
import config from "../config/config.js";
import { AppError } from "../utils/AppError.js";
import { INTERVIEW_TYPES, MAX_TECHNOLOGIES, ROLE_TECHNOLOGIES } from "../config/interviewOptions.js";
import { buildAssistantConfig, buildInterviewConfig } from "../utils/interview.utils.js";
import { generateInterviewPrompt } from "./prompt.service.js";
import { generateInterviewFeedback } from "./feedback.service.js";
import * as tokens from "./token.service.js";

const { interviewCost } = config.tokens;

// Everything except the (large) transcript and analysis blobs.
const summarySelect = {
  id: true,
  role: true,
  interviewType: true,
  technologies: true,
  status: true,
  duration: true,
  startedAt: true,
  completedAt: true,
  feedback: true,
  strengths: true,
  weakAreas: true,
  technicalScore: true,
  communicationScore: true,
  problemSolvingScore: true,
  overallScore: true,
};

const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

export const getOptions = () => ({
  roles: ROLE_TECHNOLOGIES,
  interviewTypes: INTERVIEW_TYPES,
  maxTechnologies: MAX_TECHNOLOGIES,
  tokenCost: interviewCost,
  durationMinutes: config.interview.durationMinutes,
});

export async function startInterview(userId, { role, interviewType, technologies }) {
  // Cheap pre-check so a user without tokens doesn't trigger an LLM call.
  await tokens.assertCanAfford(userId, interviewCost);

  const systemPrompt = await generateInterviewPrompt({ role, interviewType, technologies });

  // Charge + create atomically; nothing is charged if anything above failed.
  const { interview, tokensRemaining } = await prisma.$transaction(async (tx) => {
    const balanceAfter = await tokens.debit(tx, userId, interviewCost);
    const created = await tx.interview.create({
      data: { userId, role, interviewType, technologies, tokensCharged: interviewCost },
    });
    await tokens.recordTransaction(tx, {
      userId,
      delta: -interviewCost,
      balanceAfter,
      reason: "INTERVIEW_START",
      interviewId: created.id,
    });
    return { interview: created, tokensRemaining: balanceAfter };
  });

  return {
    interviewId: interview.id,
    publicKey: config.vapiPublicKey,
    role,
    interviewType,
    technologies,
    systemPrompt,
    interviewConfig: buildInterviewConfig(interviewType),
    assistantConfig: buildAssistantConfig({ role, systemPrompt }),
    tokensRemaining,
  };
}

const isCandidateTurn = (turn) => turn.speaker !== "Interviewer";

export async function completeInterview(userId, { interviewId, transcript, duration }) {
  const interview = await prisma.interview.findFirst({ where: { id: interviewId, userId } });
  if (!interview) throw AppError.notFound("Interview not found");
  if (interview.status !== "in_progress") {
    throw AppError.conflict("ALREADY_FINISHED", "This interview has already been submitted");
  }

  const seconds = duration ?? Math.round((Date.now() - interview.startedAt.getTime()) / 1000);
  const claim = { id: interviewId, userId, status: "in_progress" };

  // The candidate never spoke: nothing to evaluate, so give the tokens back.
  if (!transcript.some(isCandidateTurn)) {
    const tokensRemaining = await prisma.$transaction(async (tx) => {
      const { count } = await tx.interview.updateMany({
        where: claim,
        data: { status: "abandoned", completedAt: new Date(), duration: seconds, transcript },
      });
      if (count === 0) throw AppError.conflict("ALREADY_FINISHED", "This interview has already been submitted");

      const balanceAfter = await tokens.credit(tx, userId, interview.tokensCharged);
      await tokens.recordTransaction(tx, {
        userId,
        delta: interview.tokensCharged,
        balanceAfter,
        reason: "INTERVIEW_REFUND",
        interviewId,
      });
      return balanceAfter;
    });

    return {
      interview: await prisma.interview.findUnique({ where: { id: interviewId } }),
      feedback: null,
      feedbackStatus: "none",
      refunded: interview.tokensCharged,
      tokensRemaining,
    };
  }

  const feedback = await generateInterviewFeedback({
    role: interview.role,
    interviewType: interview.interviewType,
    technologies: interview.technologies,
    transcript,
  });

  const { count } = await prisma.interview.updateMany({
    where: claim,
    data: {
      status: "completed",
      completedAt: new Date(),
      duration: seconds,
      transcript,
      aiAnalysis: feedback.detailedAnalysis,
      feedback: feedback.feedback,
      technicalScore: feedback.technicalScore,
      communicationScore: feedback.communicationScore,
      problemSolvingScore: feedback.problemSolvingScore,
      overallScore: feedback.overallScore,
      weakAreas: feedback.weakAreas,
      strengths: feedback.strengths,
    },
  });
  if (count === 0) throw AppError.conflict("ALREADY_FINISHED", "This interview has already been submitted");

  return {
    interview: await prisma.interview.findUnique({ where: { id: interviewId } }),
    feedback,
    feedbackStatus: feedback.source,
    refunded: 0,
    tokensRemaining: await tokens.getBalance(userId),
  };
}

/** Only the owner can read an interview. Other users get 404, not 403, to avoid leaking IDs. */
export async function getInterview(userId, interviewId) {
  const interview = await prisma.interview.findFirst({ where: { id: interviewId, userId } });
  if (!interview) throw AppError.notFound("Interview not found");
  return interview;
}

export async function listInterviews(userId, { limit, cursor, status, interviewType, role }) {
  const where = {
    userId,
    ...(status && { status }),
    ...(interviewType && { interviewType }),
    ...(role && { role }),
  };

  const [rows, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      select: summarySelect,
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    prisma.interview.count({ where }),
  ]);

  const hasMore = rows.length > limit;
  const interviews = hasMore ? rows.slice(0, limit) : rows;
  return { interviews, total, nextCursor: hasMore ? interviews[interviews.length - 1].id : null };
}

export async function getDashboardStats(userId) {
  const completed = { userId, status: "completed" };

  const [user, sessions, aggregate, recent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { tokens: true, skills: true } }),
    prisma.interview.count({ where: { userId } }),
    prisma.interview.aggregate({
      where: completed,
      _count: { _all: true },
      _avg: {
        overallScore: true,
        technicalScore: true,
        communicationScore: true,
        problemSolvingScore: true,
      },
    }),
    prisma.interview.findMany({
      where: { ...completed, overallScore: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        completedAt: true,
        overallScore: true,
        technicalScore: true,
        communicationScore: true,
        problemSolvingScore: true,
      },
    }),
  ]);
  if (!user) throw AppError.notFound("User not found");

  return {
    tokens: user.tokens,
    skillsTracked: user.skills.length,
    interviewSessions: sessions,
    completedInterviews: aggregate._count._all,
    avgScore: round1(aggregate._avg.overallScore),
    avgScores: {
      technical: round1(aggregate._avg.technicalScore),
      communication: round1(aggregate._avg.communicationScore),
      problemSolving: round1(aggregate._avg.problemSolvingScore),
    },
    // Oldest first so charts can plot it directly.
    scoreTrend: recent.reverse().map((i) => ({
      id: i.id,
      date: i.completedAt,
      overall: i.overallScore,
      technical: i.technicalScore,
      communication: i.communicationScore,
      problemSolving: i.problemSolvingScore,
    })),
  };
}
