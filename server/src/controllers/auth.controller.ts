import type { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import User from "../models/user.model.ts";
import { hashPassword, comparePassword } from "../utils/password.util.ts";
import { generateToken } from "../utils/jwt.util.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data");
const LOCAL_USERS_FILE = path.join(DATA_DIR, "local_users.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface LocalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  created_at: string;
}

const getLocalUsers = (): LocalUser[] => {
  try {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      const content = fs.readFileSync(LOCAL_USERS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (err) {
    console.warn("Could not read local users file:", err);
  }
  return [];
};

const saveLocalUsers = (users: LocalUser[]): void => {
  try {
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Could not write to local users file:", err);
  }
};

const isMongooseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// POST /api/auth/register — Public — Create new account
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: "Name, email, and password are required." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. If MongoDB Atlas is connected, use Mongoose
    if (isMongooseConnected()) {
      try {
        const existingUser = await User.findOne({ email: normalizedEmail }).maxTimeMS(3000);
        if (existingUser) {
          res.status(409).json({ success: false, message: "An account with this email already exists." });
          return;
        }

        const hashedPassword = await hashPassword(password);
        const user = await User.create({
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          phone: phone || null,
        });

        const token = generateToken({ userId: user._id.toString(), email: user.email });

        res.status(201).json({
          success: true,
          message: "Account created successfully.",
          data: {
            token,
            user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
          },
        });
        return;
      } catch (dbErr: any) {
        console.warn("MongoDB write failed, falling back to local user store:", dbErr.message);
      }
    }

    // 2. Resilient Fallback: Local persistent storage (runs even without MongoDB Atlas network access)
    const localUsers = getLocalUsers();
    if (localUsers.some((u) => u.email === normalizedEmail)) {
      res.status(409).json({ success: false, message: "An account with this email already exists." });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser: LocalUser = {
      id: newId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || null,
      created_at: new Date().toISOString(),
    };

    localUsers.push(newUser);
    saveLocalUsers(localUsers);

    const token = generateToken({ userId: newId, email: normalizedEmail });

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        token,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login — Public — Verify credentials, return JWT
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email and password are required." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Try MongoDB if connected
    if (isMongooseConnected()) {
      try {
        const user = await User.findOne({ email: normalizedEmail }).maxTimeMS(3000);
        if (user) {
          const isPasswordValid = await comparePassword(password, user.password);
          if (isPasswordValid) {
            const token = generateToken({ userId: user._id.toString(), email: user.email });
            res.status(200).json({
              success: true,
              message: "Login successful.",
              data: {
                token,
                user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
              },
            });
            return;
          }
        }
      } catch (dbErr: any) {
        console.warn("MongoDB read failed, checking local users:", dbErr.message);
      }
    }

    // 2. Fallback to local store
    const localUsers = getLocalUsers();
    const localUser = localUsers.find((u) => u.email === normalizedEmail);

    if (!localUser) {
      res.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    const isPasswordValid = await comparePassword(password, localUser.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: "Invalid email or password." });
      return;
    }

    const token = generateToken({ userId: localUser.id, email: localUser.email });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: { id: localUser.id, name: localUser.name, email: localUser.email, phone: localUser.phone },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me — Protected — Return current user profile
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = (req as any).user;

    if (!currentUser) {
      res.status(401).json({ success: false, message: "Not authenticated." });
      return;
    }

    if (isMongooseConnected()) {
      try {
        const user = await User.findById(currentUser.userId).select("-password").maxTimeMS(3000);
        if (user) {
          res.status(200).json({
            success: true,
            data: {
              user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                created_at: (user as any).created_at || (user as any).createdAt,
              },
            },
          });
          return;
        }
      } catch (dbErr) {
        // Fallback to local check
      }
    }

    const localUsers = getLocalUsers();
    const localUser = localUsers.find((u) => u.id === currentUser.userId || u.email === currentUser.email);

    if (!localUser) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          phone: localUser.phone,
          created_at: localUser.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
