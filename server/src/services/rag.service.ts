import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

import {
  GoogleGenerativeAI,
} from "@google/generative-ai";

import {
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";

import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";

import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB client
let mongoClient: MongoClient | null = null;

const getMongoClient = async (): Promise<MongoClient> => {

  if (!mongoClient) {

    mongoClient = new MongoClient(
      process.env.MONGODB_URI || ""
    );

    await mongoClient.connect();
  }

  return mongoClient;
};

// Embeddings
const getEmbeddings = () => {

  if (!process.env.GOOGLE_API_KEY) {
    throw new Error(
      "GOOGLE_API_KEY missing in .env"
    );
  }

  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-embedding-001",
  });
};

// Vector Store
const getVectorStore = async () => {

  const client = await getMongoClient();

  const collection = client
    .db("edureach_db")
    .collection("knowledge_docs");

  return new MongoDBAtlasVectorSearch(
    getEmbeddings(),
    {
      collection: collection as any,
      indexName: "edureach_vector_index",
      textKey: "text",
      embeddingKey: "embedding",
    }
  );
};

// Initialize Knowledge Base
export const initializeKnowledgeBase =
  async (): Promise<void> => {

    try {

      const client =
        await getMongoClient();

      const collection = client
        .db("edureach_db")
        .collection("knowledge_docs");

      const existingDocs =
        await collection.countDocuments();

      if (existingDocs > 0) {

        console.log(
          `Knowledge base ready (${existingDocs} chunks found)`
        );

        return;
      }

      console.log(
        "Indexing knowledge base..."
      );

      const embeddings =
        getEmbeddings();

      const filePath = path.join(
        __dirname,
        "../../knowledge-base/edureach-knowledge.txt"
      );

      const loader =
        new TextLoader(filePath);

      const docs =
        await loader.load();

      const splitter =
        new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });

      const allSplits =
        await splitter.splitDocuments(
          docs
        );

      console.log(
        `Split into ${allSplits.length} chunks`
      );

      const vectorStore =
        new MongoDBAtlasVectorSearch(
          embeddings,
          {
            collection:
              collection as any,
            indexName:
              "edureach_vector_index",
            textKey: "text",
            embeddingKey:
              "embedding",
          }
        );

      await vectorStore.addDocuments(
        allSplits
      );

      console.log(
        "Knowledge base indexed successfully"
      );

    } catch (error) {

      console.error(
        "Knowledge Base Error:",
        error
      );

      throw error;
    }
  };

// Main Chat Function
export const getRAGResponse = async (
  question: string
): Promise<string> => {

  try {

    console.log(
      "User Question:",
      question
    );

    const vectorStore =
      await getVectorStore();

    console.log(
      "Vector store ready"
    );

    // Retrieve docs
    const retrievedDocs =
      await vectorStore.similaritySearch(
        question,
        3
      );

    console.log(
      `Retrieved ${retrievedDocs.length} documents`
    );

    // No docs found
    if (!retrievedDocs.length) {

      return "I could not find relevant information right now.";
    }

    // Build context
    const context =
      retrievedDocs
        .map(
          (doc) => doc.pageContent
        )
        .join("\n\n");

    // Google Gemini SDK
    const genAI =
      new GoogleGenerativeAI(
        process.env.GOOGLE_API_KEY!
      );

    const model =
      genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

    console.log(
      "Gemini model initialized"
    );

    // Prompt
    const prompt = `
You are EduReach Bot, a helpful AI counselor for EduReach College Hyderabad.

Answer ONLY using the provided context.

If the answer is not available in context, say:
"I don't have that information right now."

Context:
${context}

Question:
${question}
`;

    console.log(
      "Sending prompt to Gemini"
    );

    // Generate response
    const result =
      await model.generateContent(
        prompt
      );

    const response =
      result.response.text();

    console.log(
      "Gemini response received"
    );

    return response;

  } catch (error: any) {

    console.error(
      "FULL RAG ERROR:"
    );

    console.error(error);

    return `Server Error: ${
      error?.message ||
      "Unknown error"
    }`;
  }
};