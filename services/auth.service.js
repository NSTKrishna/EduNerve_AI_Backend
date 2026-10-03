import bcrypt from "bcryptjs";
import prisma from "../db/prisma.js";
import config from "../config/config.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../middlewares/auth.middleware.js";

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown so login timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  experience: true,
  skills: true,
  tokens: true,
  createdAt: true,
};

const toPublicUser = (user) =>
  Object.fromEntries(Object.keys(publicUserSelect).map((key) => [key, user[key]]));

export async function register({ email, password, name, role, experience, skills }) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw AppError.conflict("EMAIL_TAKEN", "User with this email already exists");

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: role ?? null,
      experience: experience ?? null,
      skills: skills ?? [],
      tokens: config.tokens.signupGrant,
      transactions: {
        create: {
          delta: config.tokens.signupGrant,
          balanceAfter: config.tokens.signupGrant,
          reason: "SIGNUP_GRANT",
        },
      },
    },
    select: publicUserSelect,
  });

  return { user, token: signToken(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw AppError.notFound("User not found");
  return user;
}

export async function updateProfile(userId, changes) {
  const data = {};
  if (changes.name !== undefined) data.name = changes.name;
  if (changes.role !== undefined) data.role = changes.role || null;
  if (changes.experience !== undefined) data.experience = changes.experience || null;
  if (changes.skills !== undefined) data.skills = changes.skills;

  return prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });
}

async function assertPassword(userId, password) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user) throw AppError.notFound("User not found");
  if (!(await bcrypt.compare(password, user.password))) {
    throw new AppError(403, "INVALID_PASSWORD", "Current password is incorrect");
  }
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  await assertPassword(userId, currentPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  });
}

/** Interviews and token history are removed by the cascading foreign keys. */
export async function deleteAccount(userId, { password }) {
  await assertPassword(userId, password);
  await prisma.user.delete({ where: { id: userId } });
}
