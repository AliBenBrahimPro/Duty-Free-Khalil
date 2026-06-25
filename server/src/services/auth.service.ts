import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class AuthService {
  // Register is buyer-only
  static async register(data: {
    firstName: string;
    lastName: string;
    username: string;
    pin: string;
    profileImage?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existing) {
      throw new Error("Username already taken");
    }

    const hashedPin = await bcrypt.hash(data.pin, 10);
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        pin: hashedPin,
        profileImage: data.profileImage,
        role: "BUYER",
      },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
      },
      token,
    };
  }

  // Login works for both buyer and seller
  static async login(username: string, pin: string) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profileImage: user.profileImage,
        role: user.role,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        profileImage: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new Error("User not found");
    return user;
  }

  static async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.profileImage !== undefined && { profileImage: data.profileImage }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        profileImage: true,
        role: true,
      },
    });
    return user;
  }

  static async changePin(userId: string, currentPin: string, newPin: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const valid = await bcrypt.compare(currentPin, user.pin);
    if (!valid) throw new Error("Current PIN is incorrect");

    const hashedPin = await bcrypt.hash(newPin, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin },
    });

    return { success: true };
  }
}
