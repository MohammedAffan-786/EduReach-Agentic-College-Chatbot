import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import app from "./app.ts";
import connectDB from "./config/database.config.ts";
import { initializeKnowledgeBase } from "./services/rag.service.ts";

const PORT = process.env.PORT || 5000;

const start = async (): Promise<void> => {
  try {
    // 1. Connect Mongoose (for users collection)
    try {
      await connectDB();
      console.log("Database connection established.");
    } catch (dbErr: any) {
      console.warn("MongoDB Atlas connection notice:", dbErr.message);
      console.warn("(Continuing server startup with resilient local fallback for knowledge base)");
    }

    // 2. Index / load knowledge base
    try {
      await initializeKnowledgeBase();
    } catch (ragErr: any) {
      console.warn("Knowledge base init notice:", ragErr.message);
    }

    // 3. Start Express
    app.listen(PORT, () => {
      console.log(` EduReach Server is running!`);
      console.log(` URL: http://localhost:${PORT}`);
      console.log(` Node: ${process.version}`);
      console.log(` Press Ctrl+C to stop`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
