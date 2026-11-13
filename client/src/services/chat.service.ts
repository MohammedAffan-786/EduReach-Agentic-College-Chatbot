import API, { API_BASE_URL } from "./api";

// Regular JSON POST
export const sendMessage = async (message: string) => {
  const res = await API.post("/chat/message", { message });
  return res.data.data; // { message: "answer text" }
};

// Real-time streaming response
export const streamChatMessage = async (
  message: string,
  onUpdate: (fullText: string) => void
): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to connect to chat stream");
  }

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

  return accumulated;
};
