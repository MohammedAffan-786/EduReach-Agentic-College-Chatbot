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

// Fast verified college knowledge fallback
const getInstantAnswer = (question: string): string => {
  const q = question.toLowerCase();

  if (/courses|programs|branches|btech|mtech|mba/i.test(q)) {
    return `EduReach College offers B.Tech programs in CSE (180 seats), AI & DS (60 seats), ECE (120 seats), IT (120 seats), ME (60 seats), and CE (60 seats). We also offer M.Tech in CS, VLSI Design, and Structural Engineering, along with a 2-year MBA with 60 seats. All B.Tech programs include mandatory internships in the 6th and 7th semesters.`;
  }

  if (/fee|fees|cost|tuition|hostel fee|emi/i.test(q)) {
    return `For 2024–2025, B.Tech tuition is ₹1,50,000/year, with lab and exam fees of ₹20,000 (Day Scholar total: ₹1,70,000/year). Hostel and mess is ₹80,000/year (Hosteller total: ₹2,50,000/year). M.Tech tuition is ₹1,00,000/year and MBA is ₹2,00,000/year. Fees can be paid in 2 installments, with loan tie-ups via SBI, HDFC, and ICICI.`;
  }

  if (/admission|apply|eligibility|eamcet|cutoff|dates/i.test(q)) {
    return `B.Tech admissions are 70% through TS/AP EAMCET counseling and 30% via Management Quota. Eligibility requires 10+2 with PCM minimum 60% aggregate (JEE Main rank holders preferred). Applications open March 1st, management quota deadline is July 15th, and classes commence August 1st.`;
  }

  if (/placement|package|salary|lpa|highest|companies|recruiters/i.test(q)) {
    return `EduReach College achieved a 92% placement rate for 2023–2024 with 850+ offers! The highest package was ₹42 LPA offered by Google. Average packages: AI&DS ₹11.5 LPA (100% placed), CSE ₹10.2 LPA (95% placed), IT ₹8.8 LPA, and MBA ₹8.0 LPA. Top recruiters include Google, Microsoft, Amazon, Flipkart, Deloitte, TCS, Infosys, and Razorpay.`;
  }

  if (/hostel|facilities|campus|labs|library|sports|gym/i.test(q)) {
    return `Our 25-acre Hyderabad campus features 12 advanced laboratories (including AI, IoT, and Robotics labs with 500+ computers), a central library with 50,000+ books, high-speed Wi-Fi, separate boys' and girls' hostels (AC and non-AC rooms with mess and gym), and a sports complex with cricket, football, basketball, and indoor gaming courts.`;
  }

  if (/scholarship|financial aid|waiver/i.test(q)) {
    return `We offer Merit Scholarships (50% tuition waiver for top 10 entrance rankers), need-based support up to 100%, and a 25% sports waiver for state/national athletes. Eligible SC/ST/OBC students can avail full Telangana state fee reimbursement.`;
  }

  if (/contact|phone|email|address|location|hours/i.test(q)) {
    return `EduReach College is located in Hyderabad, Telangana. You can reach admissions at +91 9876543210 or email admissions@edureach.edu.in. Office hours are Monday to Saturday, 9:00 AM – 5:00 PM (open Sundays during admission season).`;
  }

  return `EduReach College (Hyderabad, Telangana) is a premier JNTU-H affiliated engineering institution with a 92% placement rate, ₹42 LPA top package, and comprehensive programs in CSE, AI&DS, ECE, IT, ME, and MBA. For admissions assistance, call +91 9876543210 or email admissions@edureach.edu.in.`;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

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
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Ollama chat failed with status ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { message?: { content: string } };
  return data.message?.content || getInstantAnswer(userMessage);
};

// Stream response token-by-token from Ollama
export const streamOllamaResponse = async (
  systemPrompt: string,
  userMessage: string,
  onToken: (token: string) => void
): Promise<string> => {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2:1b";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

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
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

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
    const trimmed = question.trim();
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|hola|namaste|greetings)[\s!.]*$/i.test(trimmed)) {
      return "Hello! I'm EduReach Bot, your AI counselor. How can I help you today with admissions, courses, fees, or placements at EduReach College?";
    }

    // Check Gemini API key first if available (cloud speeds)
    if (process.env.GOOGLE_API_KEY) {
      try {
        const context = await getFastContext(trimmed);
        const systemPrompt = getSystemPrompt(context);
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(`${systemPrompt}\n\nQuestion: ${trimmed}`);
        return result.response.text();
      } catch (geminiErr) {
        console.warn("Gemini call failed, falling back to local engine:", geminiErr);
      }
    }

    // Fast optimized Ollama inference with safe fallback
    try {
      const context = await getFastContext(trimmed);
      const systemPrompt = getSystemPrompt(context);
      return await generateOllamaResponse(systemPrompt, trimmed);
    } catch (ollamaErr) {
      console.warn("Ollama unavailable, delivering instant verified answer:", ollamaErr);
      return getInstantAnswer(trimmed);
    }
  } catch (error: any) {
    console.error("FULL RAG ERROR:", error);
    return getInstantAnswer(question);
  }
};

// Stream RAG Response with bulletproof fallback
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

  try {
    const context = await getFastContext(trimmed);
    const systemPrompt = getSystemPrompt(context);
    return await streamOllamaResponse(systemPrompt, trimmed, onToken);
  } catch (err) {
    console.warn("Ollama stream failed, streaming instant verified college answer:", err);
    const instant = getInstantAnswer(trimmed);
    const words = instant.split(/(\s+)/);
    for (const w of words) {
      onToken(w);
      await new Promise((r) => setTimeout(r, 10));
    }
    return instant;
  }
};
