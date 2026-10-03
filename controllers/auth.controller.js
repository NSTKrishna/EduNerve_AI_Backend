import { asyncHandler } from "../utils/asyncHandler.js";
import * as auth from "../services/auth.service.js";
import * as interviews from "../services/interview.service.js";

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await auth.register(req.body);
  res.status(201).json({ success: true, message: "User registered successfully", user, token });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await auth.login(req.body);
  res.json({ success: true, message: "Login successful", user, token });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: await auth.getProfile(req.user.userId) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await auth.updateProfile(req.user.userId, req.body);
  res.json({ success: true, message: "Profile updated successfully", user });
});

export const changePassword = asyncHandler(async (req, res) => {
  await auth.changePassword(req.user.userId, req.body);
  res.json({ success: true, message: "Password updated successfully" });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await auth.deleteAccount(req.user.userId, req.body);
  res.json({ success: true, message: "Account deleted" });
});

export const getDashboard = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await interviews.getDashboardStats(req.user.userId) });
});
