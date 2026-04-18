import { useState, useRef, useEffect, FormEvent } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/contexts/AuthContext";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ToolCallLog = {
  name: string;
  args: any;
  resultPreview: string;
};

const QUICK_PROMPTS = [
  "What events do we have this week?",
  "Shopping list for my next event",
  "Prep sheet for the next event",
  "What recipes use chicken?",
  "Show me vegan recipes",
  "What does recipe 12 cost per serving?",
];

const STORAGE_KEY = "chatAgentHistory.v1";

// Tiny markdown renderer — only supports [text](path) links and newlines.
// Safe: only renders internal paths (starting with "/") as anchors; everything
// else is treated as plain text.
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\((\/[^\s)]*)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const [, label, href] = match;
    parts.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        className="text-purple-700 underline hover:text-purple-900"
      >
        {label}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function ChatAgentWidget() {
  const { user } = useAuthContext();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastTools, setLastTools] = useState<ToolCallLog[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  if (!user) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setLastTools(null);
    try {
      const res = await apiRequest("POST", "/api/chat-agent", {
        messages: nextHistory,
        context: { currentPath: location },
      });
      const data = await res.json();
      const reply = data.reply || "(no response)";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (Array.isArray(data.toolCalls)) setLastTools(data.toolCalls);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry — I hit an error: ${err?.message || String(err)}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const clear = () => {
    setMessages([]);
    setLastTools(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <>
      {!open && (
        <button
          aria-label="Open kitchen assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-lg hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Open kitchen assistant</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[600px] max-h-[85vh] w-[400px] max-w-[95vw] flex-col rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-700 to-purple-900 text-white px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <div className="text-sm font-semibold">Kitchen Assistant</div>
                <div className="text-xs text-purple-200">DeepSeek-powered · {messages.length} msgs</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clear}
                className="p-1.5 rounded hover:bg-white/10"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-white/10"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-white border border-gray-200 p-3 text-sm text-gray-700">
                  Hi chef — I can look up events, menus, ingredients, recipes, and
                  also create new menus, menu items, and ingredients. Try one of
                  these:
                </div>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => void send(p)}
                      className="text-left text-xs px-3 py-2 rounded-md bg-white border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}

            {lastTools && lastTools.length > 0 && !loading && (
              <details className="text-xs text-gray-500 px-1">
                <summary className="cursor-pointer hover:text-gray-700">
                  {lastTools.length} tool call{lastTools.length === 1 ? "" : "s"} used
                </summary>
                <ul className="mt-1 space-y-1">
                  {lastTools.map((t, i) => (
                    <li key={i} className="bg-white border border-gray-200 rounded px-2 py-1 font-mono">
                      <div className="font-semibold text-gray-700">{t.name}</div>
                      {Object.keys(t.args || {}).length > 0 && (
                        <div className="text-gray-500">{JSON.stringify(t.args)}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-gray-200 bg-white p-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about events, menus, ingredients…"
              disabled={loading}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
