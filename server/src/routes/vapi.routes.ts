import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { startCall } from "../controllers/vapi.controller.ts";
import { verifyToken } from "../utils/jwt.util.ts";

const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      if (token) {
        req.user = verifyToken(token);
      }
    } catch {
      // Token expired or invalid - proceed gracefully
    }
  }
  next();
};

const router = Router();

router.post("/call", optionalAuth, startCall);

export default router;
