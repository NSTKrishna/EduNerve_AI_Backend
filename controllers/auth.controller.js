import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db/config.js";
import config from "../config/config.js";


export async function register(req, res, next) {
  try {
    const { email, password, name, role, experience, skills } = req.body;


    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: "Email, password, and name are required"
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || null,
        experience: experience || null,
        skills: skills || []
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        experience: true,
        skills: true,
        createdAt: true
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
      token
    });
  } catch (error) {
    console.error("Error in register:", error);
    next(error);
  }
}


export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        experience: user.experience,
        skills: user.skills
      },
      token
    });
  } catch (error) {
    console.error("Error in login:", error);
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        experience: true,
        skills: true,
        createdAt: true,
        interviews: {
          select: {
            id: true,
            role: true,
            interviewType: true,
            status: true,
            overallScore: true,
            startedAt: true,
            completedAt: true
          },
          orderBy: {
            startedAt: 'desc'
          },
          take: 10
        },
        quizResults: {
          select: {
            id: true,
            category: true,
            score: true,
            total: true,
            percentage: true,
            level: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const { name, role, experience, skills } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(experience && { experience }),
        ...(skills && { skills })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        experience: true,
        skills: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    next(error);
  }
}
