import { z } from "zod";
import {
  INTERVIEW_TYPES,
  MAX_TECHNOLOGIES,
  ROLE_TECHNOLOGIES,
  ROLES,
} from "../config/interviewOptions.js";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8, "Password must be at least 8 characters").max(72);
const text = (max) => z.string().trim().min(1).max(max);
const skills = z.array(text(40)).max(20);

export const registerSchema = z.object({
  email,
  password,
  name: text(80),
  role: text(60).optional(),
  experience: text(40).optional(),
  skills: skills.optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});

export const updateProfileSchema = z
  .object({
    name: text(80),
    role: z.union([text(60), z.literal("")]),
    experience: z.union([text(40), z.literal("")]),
    skills,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: password,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(72),
});

export const startInterviewSchema = z
  .object({
    role: z.enum(ROLES, { message: "Unknown role" }),
    interviewType: z.enum(INTERVIEW_TYPES),
    technologies: z.array(z.string()).min(1, "Pick at least one technology").max(MAX_TECHNOLOGIES),
  })
  .superRefine((value, ctx) => {
    const allowed = ROLE_TECHNOLOGIES[value.role] || [];
    const invalid = value.technologies.filter((tech) => !allowed.includes(tech));
    if (invalid.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["technologies"],
        message: `Not valid for ${value.role}: ${invalid.join(", ")}`,
      });
    }
  });

const transcriptTurn = z.object({
  speaker: z.string().max(40),
  text: z.string().max(4000),
  timestamp: z.string().max(40).optional(),
});

export const completeInterviewSchema = z.object({
  interviewId: z.string().min(1).max(64),
  transcript: z.array(transcriptTurn).max(500).default([]),
  duration: z.number().int().min(0).max(4 * 60 * 60).optional(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(64).optional(),
  status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
  interviewType: z.enum(INTERVIEW_TYPES).optional(),
  role: z.string().max(60).optional(),
});

export const transactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
