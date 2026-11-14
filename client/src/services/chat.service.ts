import API, { API_BASE_URL } from "./api";
import { findInstantCollegeAnswer } from "./collegeKnowledge";

// Helper for smooth token-by-token streaming effect
const streamInstantTokens = async (
  fullText: string,
  onUpdate: (current: string) => void
): Promise<string> => {
  // Break into natural word/punctuation chunks
  const words = fullText.split(/(\s+)/);
  let accumulated = "";

  for (let i = 0; i < words.length; i++) {
    accumulated += words[i];
    onUpdate(accumulated);
    // 12ms delay between words for rapid, natural typing response
    await new Promise((resolve) => setTimeout(resolve, 12));
  }

  return fullText;
};

// Fast JSON response with instant fallback
export const sendMessage = async (message: string): Promise<{ message: string }> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s fast timeout

    const res = await API.post(
      "/chat/message",
      { message },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.data?.data?.message) {
      return res.data.data;
    }
  } catch (err) {
    console.warn("Backend chat unavailable or timed out, using instant local knowledge engine:", err);
  }

  // Instant accurate answer
  const answer = findInstantCollegeAnswer(message);
  return { message: answer };
};

// Real-time streaming response with instant intelligent fallback
export const streamChatMessage = async (
  message: string,
  onUpdate: (fullText: string) => void
): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s connection timeout

    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const textChunk = decoder.decode(value);
        const lines = textChunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const json = JSON.parse(line.replace("data: ", ""));
            if (json.token) {
              accumulated += json.token;
              onUpdate(accumulated);
            }
          } catch {}
        }
      }

      if (accumulated.trim().length > 0) {
        return accumulated;
      }
    }
  } catch (err) {
    console.warn("Live stream endpoint offline/unreachable, streaming from instant knowledge engine:", err);
  }

  // Instant reliable streaming fallback
  const fallbackAnswer = findInstantCollegeAnswer(message);
  return await streamInstantTokens(fallbackAnswer, onUpdate);
};
