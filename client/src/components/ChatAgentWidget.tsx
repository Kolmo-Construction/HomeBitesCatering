import { useState, useRef, useEffect, FormEvent, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  Mic,
  MicOff,
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
  "What recipes use chicken?",
  "Show me vegan recipes",
  "Check recipe 12 for ingredient gaps",
];

const STORAGE_KEY = "chatAgentHistory.v1";

// Only internal path links ([text](/path)) become anchors.
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\((\/[^\s)]*)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
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

// Parse an SSE frame ("event: X\ndata: Y\n\n") given a buffer of raw text.
// Returns parsed events and the leftover buffer.
function parseSseFrames(buffer: string): {
  events: Array<{ event: string; data: any }>;
  remainder: string;
} {
  const out: Array<{ event: string; data: any }> = [];
  const frames = buffer.split("\n\n");
  const remainder = frames.pop() ?? "";
  for (const frame of frames) {
    if (!frame.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) continue;
    let data: any;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      data = dataLines.join("\n");
    }
    out.push({ event, data });
  }
  return { events: out, remainder };
}

// Minimal wrapper over Web Speech API. Typed loosely since lib.dom types
// don't ship `SpeechRecognition` in every TS version.
type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechCtor = new () => SpeechRec;
function getSpeechRecognitionCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function ChatAgentWidget() {
  const { user } = useAuthContext();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [lastTools, setLastTools] = useState<ToolCallLog[] | null>(null);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);

  const speechSupported = getSpeechRecognitionCtor() !== null;

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
  }, [messages, streaming, open]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      stopListening();
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setInput(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [listening, stopListening]);

  if (!user) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (listening) stopListening();
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const historyForServer = [...messages, userMsg];
    // Seed an empty assistant bubble we'll append chunks into.
    setMessages([...historyForServer, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setLastTools(null);

    try {
      const res = await fetch("/api/chat-agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: historyForServer,
          context: { currentPath: location },
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      const toolLog: ToolCallLog[] = [];
      const pendingToolArgs: Record<string, any> = {};

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = parseSseFrames(buffer);
        buffer = remainder;

        for (const ev of events) {
          if (ev.event === "chunk" && typeof ev.data?.text === "string") {
            assistantText += ev.data.text;
            setMessages((prev) => {
              const next = [...prev];
              // Update the last assistant bubble
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === "assistant") {
                  next[i] = { ...next[i], content: assistantText };
                  break;
                }
              }
              return next;
            });
          } else if (ev.event === "tool_call") {
            pendingToolArgs[ev.data.name] = ev.data.args;
          } else if (ev.event === "tool_result") {
            toolLog.push({
              name: ev.data.name,
              args: pendingToolArgs[ev.data.name] ?? {},
              resultPreview: ev.data.resultPreview,
            });
            setLastTools([...toolLog]);
          } else if (ev.event === "error") {
            throw new Error(ev.data?.message || "Stream error");
          } else if (ev.event === "done") {
            // nothing to do — the loop will exit when the server closes the stream
          }
        }
      }

      if (!assistantText) {
        setMessages((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === "assistant" && !next[i].content) {
              next[i] = { ...next[i], content: "(no response)" };
              break;
            }
          }
          return next;
        });
      }
    } catch (err: any) {
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === "assistant") {
            next[i] = {
              ...next[i],
              content:
                (next[i].content ? next[i].content + "\n\n" : "") +
                `Sorry — I hit an error: ${err?.message || String(err)}`,
            };
            break;
          }
        }
        return next;
      });
    } finally {
      setStreaming(false);
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
                <div className="text-xs text-purple-200">
                  DeepSeek-powered · {messages.length} msgs
                </div>
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

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-white border border-gray-200 p-3 text-sm text-gray-700">
                  Hi chef — I can look up events, menus, ingredients, recipes,
                  generate shopping lists, flag ingredient gaps, and create new
                  items. Try one of these:
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
                  {m.role === "assistant"
                    ? m.content
                      ? renderMarkdown(m.content)
                      : streaming && i === messages.length - 1
                        ? (
                          <span className="inline-flex items-center gap-2 text-gray-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Thinking…
                          </span>
                        )
                        : ""
                    : m.content}
                </div>
              </div>
            ))}

            {lastTools && lastTools.length > 0 && (
              <details className="text-xs text-gray-500 px-1">
                <summary className="cursor-pointer hover:text-gray-700">
                  {lastTools.length} tool call
                  {lastTools.length === 1 ? "" : "s"} used
                </summary>
                <ul className="mt-1 space-y-1">
                  {lastTools.map((t, i) => (
                    <li
                      key={i}
                      className="bg-white border border-gray-200 rounded px-2 py-1 font-mono"
                    >
                      <div className="font-semibold text-gray-700">{t.name}</div>
                      {Object.keys(t.args || {}).length > 0 && (
                        <div className="text-gray-500">
                          {JSON.stringify(t.args)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            className="border-t border-gray-200 bg-white p-2 flex gap-2"
          >
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={streaming}
                title={listening ? "Stop listening" : "Voice input"}
                className={`h-9 w-9 flex items-center justify-center rounded-md border transition ${
                  listening
                    ? "bg-red-500 text-white border-red-500 animate-pulse"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                {listening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                listening
                  ? "Listening…"
                  : "Ask about events, menus, ingredients…"
              }
              disabled={streaming}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={streaming || !input.trim()}
              size="icon"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
