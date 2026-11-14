import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Minus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { sendMessage, streamChatMessage } from "../services/chat.service";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const quickQuestions = [
  "What courses do you offer?",
  "Tell me about placements",
  "What is the fee structure?",
  "How to apply for admissions?",
  "Tell me about hostel facilities",
];

export default function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm EduReach Bot, your AI college counselor. Ask me anything about our courses, fees, admissions, placements, or campus life.`,
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || sending) return;

    const userMsg: Message = { id: Date.now(), text: messageText, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setIsTyping(true);

    const botMsgId = Date.now() + 1;
    let hasCreatedBotMsg = false;

    try {
      await streamChatMessage(messageText, (chunkText) => {
        setIsTyping(false);
        if (!hasCreatedBotMsg) {
          hasCreatedBotMsg = true;
          setMessages((prev) => [...prev, { id: botMsgId, text: chunkText, sender: "bot" }]);
        } else {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === botMsgId ? { ...msg, text: chunkText } : msg))
          );
        }
      });
    } catch (err) {
      console.warn("Stream error, falling back:", err);
      try {
        const data = await sendMessage(messageText);
        setIsTyping(false);
        if (!hasCreatedBotMsg) {
          setMessages((prev) => [...prev, { id: botMsgId, text: data.message, sender: "bot" }]);
        } else {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === botMsgId ? { ...msg, text: data.message } : msg))
          );
        }
      } catch (fallbackErr) {
        console.error("Chat error:", fallbackErr);
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            text: "EduReach College offers B.Tech (CSE, ECE, AI&DS, IT, ME, CE), M.Tech, and MBA with a 92% placement rate (₹42 LPA top package). For inquiries, call +91 9876543210 or email admissions@edureach.edu.in.",
            sender: "bot",
          },
        ]);
      }
    } finally {
      setIsTyping(false);
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-maroon-dark to-maroon px-4 py-3.5 flex items-center justify-between text-white shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">EduReach Bot</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-white/80 text-xs">AI Counselor &bull; Instant Answers</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/70">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <div className="w-6 h-6 bg-maroon rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-xs ${
                msg.sender === "user"
                  ? "bg-maroon text-white rounded-br-xs"
                  : "bg-white text-gray-800 border border-gray-100 rounded-bl-xs"
              }`}
            >
              {msg.text}
            </div>
            {msg.sender === "user" && (
              <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-maroon-dark" />
              </div>
            )}
          </div>
        ))}

        {/* Real-time Typing Bubble */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-6 h-6 bg-maroon rounded-full flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-xs shadow-xs">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Question Chips */}
      {messages.length <= 2 && (
        <div className="px-3 py-2 bg-white border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Suggested queries:</p>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-xs px-2.5 py-1 bg-gray-50 border border-maroon/15 text-maroon rounded-full hover:bg-maroon hover:text-white transition-all cursor-pointer font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Field */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about EduReach..."
            disabled={sending}
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon text-sm disabled:opacity-50 transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-maroon text-white rounded-xl flex items-center justify-center hover:bg-maroon-dark disabled:opacity-40 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
