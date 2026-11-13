import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";
import { initiateOutboundCall } from "../services/vapi.service.ts";

// POST /api/vapi/call
export const startCall = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, preferredCourse, name, email } = req.body;

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      res.status(400).json({ success: false, message: "Valid phone number (minimum 10 digits) is required." });
      return;
    }

    const currentUser = (req as any).user;
    let userName = name || "Student";
    let userEmail = email || "";

    if (currentUser?.userId) {
      try {
        const user = await User.findById(currentUser.userId).select("name email");
        if (user) {
          userName = user.name || userName;
          userEmail = user.email || userEmail;
        }
      } catch (err) {
        console.warn("Could not lookup user profile, using supplied name:", err);
      }
    }

    const result = await initiateOutboundCall({
      phoneNumber: phoneNumber.trim(),
      userName,
      preferredCourse: preferredCourse || "General Inquiry",
      userEmail,
    });

    res.status(200).json({
      success: true,
      message: result.message || "Call initiated. You will receive a call shortly.",
      data: { callId: result.id, status: result.status, demo: result.demo },
    });
  } catch (error) {
    next(error);
  }
};
