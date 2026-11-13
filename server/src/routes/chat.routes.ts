import { Router } from "express";
import { sendMessage, streamMessage } from "../controllers/chat.controller.ts";

const router = Router();

router.post("/message", sendMessage);
router.post("/stream", streamMessage);

export default router;
