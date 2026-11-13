import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoClient: MongoClient | null = null;
let cachedDocs: { text: string; embedding: number[] }[] = [];

const getMongoClient = async (): Promise<MongoClient> => {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URI || "", {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();
  }
  return mongoClient;
};

// Fast Ollama Embeddings Helper
const getEmbeddingVector = async (text: string): Promise<number[]> => {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
  
  const res = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
    // @ts-ignore
    keep_alive: "1h",
  });

  if (!res.ok) {
    throw new Error(`Ollama embedding failed with status ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
};

// Cosine similarity calculation
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Fast In-Memory Document Loader
const loadDocsToCache = async (): Promise<{ text: string; embedding: number[] }[]> => {
  if (cachedDocs.length > 0) return cachedDocs;

  try {
    const client = await getMongoClient();
    const collection = client.db("edureach_db").collection("knowledge_docs");
    const docs = await collection.find({}).toArray();
    if (docs.length > 0) {
      cachedDocs = docs.map((d: any) => ({ text: d.text, embedding: d.embedding }));
      console.log(`[Cache] Loaded ${cachedDocs.length} chunks from MongoDB into memory.`);
    }
  } catch (err) {
    console.warn("Could not load docs from MongoDB, will initialize from local file:", err);
  }
  return cachedDocs;
};

// Generate response using Ollama with CPU thread and token optimizations
const generateOllamaResponse = async (systemPrompt: string, userMessage: string): Promise<string> => {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2:1b";

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: false,
      keep_alive: "1h",
      options: {
        num_thread: 6,
        num_ctx: 1024,
        num_predict: 120,
        temperature: 0.6,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama chat failed with status ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { message?: { content: string } };
  return data.message?.content || "Hello! How can I assist you with EduReach College today?";
};

// Stream response token-by-token from Ollama
export const streamOllamaResponse = async (
  systemPrompt: string,
  userMessage: string,
  onToken: (token: string) => void
): Promise<string> => {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2:1b";

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
      keep_alive: "1h",
      options: {
        num_thread: 6,
        num_ctx: 1024,
        num_predict: 140,
        temperature: 0.6,
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama streaming failed: ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullAnswer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          const content = json.message.content;
          fullAnswer += content;
          onToken(content);
        }
      } catch {}
    }
  }

  return fullAnswer;
};

// Initialize Knowledge Base with fallback to local text file
export const initializeKnowledgeBase = async (): Promise<void> => {
  try {
    let collection: any = null;
    try {
      const client = await getMongoClient();
      collection = client.db("edureach_db").collection("knowledge_docs");
      const existingDocs = await collection.countDocuments();
      if (existingDocs > 0) {
        console.log(`Knowledge base ready (${existingDocs} chunks found in MongoDB)`);
        await loadDocsToCache();
        return;
      }
    } catch (dbErr) {
      console.warn("MongoDB not reachable, using local knowledge base file directly.");
    }

    console.log("Loading and indexing knowledge base from local text file...");
    const filePath = path.join(__dirname, "../../knowledge-base/edureach-knowledge.txt");
    const loader = new TextLoader(filePath);
    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const allSplits = await splitter.splitDocuments(docs);
    console.log(`Split into ${allSplits.length} chunks. Generating embeddings...`);

    const documentsToInsert = [];
    cachedDocs = [];
    for (const split of allSplits) {
      const embedding = await getEmbeddingVector(split.pageContent);
      const item = {
        text: split.pageContent,
        embedding,
        metadata: split.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      documentsToInsert.push(item);
      cachedDocs.push({ text: item.text, embedding: item.embedding });
    }

    if (collection && documentsToInsert.length > 0) {
      try {
        await collection.insertMany(documentsToInsert);
        console.log("Knowledge base indexed successfully into MongoDB!");
      } catch (err) {
        console.warn("Could not write to MongoDB collection:", err);
      }
    }
    console.log(`[Cache] Knowledge base ready with ${cachedDocs.length} chunks in memory.`);
  } catch (error) {
    console.error("Knowledge Base Error:", error);
  }
};

// Helper to retrieve context quickly using in-memory cache
const getFastContext = async (question: string): Promise<string> => {
  let docs = cachedDocs;
  if (!docs || docs.length === 0) {
    docs = await loadDocsToCache();
  }
  if (!docs || docs.length === 0) return "";

  try {
    const queryEmbedding = await getEmbeddingVector(question);
    const scored = docs.map((doc) => ({
      text: doc.text,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 2).filter((d) => d.score > 0.35);
    return top.map((d) => d.text).join("\n\n");
  } catch (err) {
    console.warn("Fast context error:", err);
    return "";
  }
};

const getSystemPrompt = (context: string): string => {
  return `You are EduReach Bot, the friendly and concise AI counselor for EduReach College (Hyderabad, Telangana).
Guidelines:
1. When asked about EduReach College (programs: CSE, ECE, AI&DS, ME, CE; 92% placement; 42 LPA top package; fees, admissions, hostel), answer accurately and concisely in 2-3 sentences based on the context.
2. For greetings or other general questions, respond conversationally, politely, and warmly.
3. Keep answers punchy, well-structured, and helpful without unnecessary filler.

College Info:
${context || "EduReach College in Hyderabad offers B.Tech programs in CSE, ECE, AI&DS, ME, CE with 92% placements, 42 LPA highest package, modern hostel, and sports campus."}
`;
};

// Main Fast Chat Function
export const getRAGResponse = async (question: string): Promise<string> => {
  try {
    // 1. Instant greeting detection (<5ms)
    const trimmed = question.trim();
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|hola|namaste|greetings)[\s!.]*$/i.test(trimmed)) {
      return "Hello! I'm EduReach Bot, your AI counselor. How can I help you today with admissions, courses, fees, or placements at EduReach College?";
    }

    // 2. Fast in-memory context lookup
    const context = await getFastContext(trimmed);
    const systemPrompt = getSystemPrompt(context);

    // 3. Check Gemini API key first if available (cloud speeds)
    if (process.env.GOOGLE_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(`${systemPrompt}\n\nQuestion: ${trimmed}`);
        return result.response.text();
      } catch (geminiErr) {
        console.warn("Gemini call failed, falling back to Ollama:", geminiErr);
      }
    }

    // 4. Fast optimized Ollama inference
    return await generateOllamaResponse(systemPrompt, trimmed);
  } catch (error: any) {
    console.error("FULL RAG ERROR:", error);
    return `Server Error: ${error?.message || "Unknown error"}`;
  }
};

// Stream RAG Response
export const streamRAGResponse = async (
  question: string,
  onToken: (token: string) => void
): Promise<string> => {
  const trimmed = question.trim();
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|hola|namaste|greetings)[\s!.]*$/i.test(trimmed)) {
    const greeting = "Hello! I'm EduReach Bot, your AI counselor. How can I help you today with admissions, courses, fees, or placements at EduReach College?";
    onToken(greeting);
    return greeting;
  }

  const context = await getFastContext(trimmed);
  const systemPrompt = getSystemPrompt(context);

  return await streamOllamaResponse(systemPrompt, trimmed, onToken);
};
