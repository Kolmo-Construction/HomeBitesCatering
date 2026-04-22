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
  Brain,
} from "lucide-react";
import { useLocation } from "wouter";
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
  "What do you remember about our regulars?",
  "Show me vegan recipes",
  "Check recipe 12 for ingredient gaps",
];

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
        className="text-[#8B7355] underline decoration-[#c9b089]/60 hover:text-[#E28C0A] hover:decoration-[#E28C0A]/60 underline-offset-2"
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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [memoryFlash, setMemoryFlash] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);

  const speechSupported = getSpeechRecognitionCtor() !== null;

  // Load persistent server-side history when the widget first opens.
  useEffect(() => {
    if (!user || !open || historyLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat-agent/history", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const rows: ChatMessage[] = (data.messages ?? [])
          .filter(
            (m: any) => m.role === "user" || m.role === "assistant",
          )
          .map((m: any) => ({ role: m.role, content: m.content }));
        setMessages(rows);
      } catch {
        // best-effort; widget still works with empty history
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, open, historyLoaded]);

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
    // Optimistically render the user turn + an empty assistant bubble.
    setMessages((prev) => [
      ...prev,
      userMsg,
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);
    setLastTools(null);
    setMemoryFlash(null);

    try {
      // Server is the source of truth for conversation history — only the
      // new user turn needs to be sent.
      const res = await fetch("/api/chat-agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: trimmed,
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
            // Surface memory writes immediately as a small chip.
            if (ev.data.name === "remember_fact") {
              const f = ev.data.args?.fact;
              if (f) setMemoryFlash(`Remembered: ${f}`);
            } else if (ev.data.name === "forget_fact") {
              setMemoryFlash("Forgot a fact");
            }
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

  const clear = async () => {
    setMessages([]);
    setLastTools(null);
    setMemoryFlash(null);
    try {
      await fetch("/api/chat-agent/history", {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}
  };

  return (
    <>
      {!open && (
        <button
          aria-label="Open kitchen assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#8B7355] via-[#a67c5a] to-[#E28C0A] text-white pl-4 pr-5 py-3 shadow-[0_8px_24px_-8px_rgba(139,115,85,0.55)] hover:shadow-[0_12px_28px_-6px_rgba(226,140,10,0.5)] hover:scale-[1.02] transition-all duration-300 ring-1 ring-white/20"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span
            className="text-sm font-medium tracking-wide"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Ask the kitchen
          </span>
          <span className="sr-only">Open kitchen assistant</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[640px] max-h-[88vh] w-[420px] max-w-[95vw] flex-col rounded-[28px] bg-[#fbf6ea] shadow-[0_24px_64px_-16px_rgba(45,24,16,0.35)] ring-1 ring-[#e0d0b3] overflow-hidden backdrop-blur-sm">
          {/* Header — cream + brand accents, serif display */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#fbf6ea] via-[#fdf8ec] to-[#f7efda] border-b border-[#e8ddc8] px-5 py-4">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-[#E28C0A]/10 to-transparent blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E28C0A] to-[#8B7355] text-white shadow-sm shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div
                    className="text-base font-semibold text-stone-900 leading-tight truncate"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    Kitchen Assistant
                  </div>
                  <div className="text-[11px] text-[#8B7355] tracking-wide flex items-center gap-1.5">
                    <Brain className="h-3 w-3 opacity-70" />
                    {messages.length > 0
                      ? `${messages.length} message${messages.length === 1 ? "" : "s"} · memory on`
                      : "Persistent memory · ask me anything"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={clear}
                  className="p-1.5 rounded-full text-[#8B7355] hover:bg-[#e8ddc8]/60 transition"
                  title="Clear conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full text-[#8B7355] hover:bg-[#e8ddc8]/60 transition"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scroll area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-[#fbf6ea] to-[#fdfaf1]"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-[#e8ddc8] p-4 text-sm text-stone-700 leading-relaxed shadow-sm">
                  <span
                    className="block text-[11px] uppercase tracking-[0.2em] text-[#8B7355] font-semibold mb-1.5"
                  >
                    Chef's helper
                  </span>
                  Hi chef — I can look up events, menus, ingredients, recipes,
                  generate shopping lists, flag ingredient gaps, and create new
                  items. Here are a few things to try:
                </div>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => void send(p)}
                      className="text-left text-xs px-4 py-2.5 rounded-full bg-white/70 border border-[#e8ddc8] text-stone-700 hover:bg-[#E28C0A]/10 hover:border-[#E28C0A]/40 hover:text-stone-900 transition shadow-sm"
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
                  className={`max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-[#8B7355] to-[#a67c5a] text-white rounded-[22px] rounded-br-md"
                      : "bg-white/90 border border-[#e8ddc8] text-stone-800 rounded-[22px] rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant"
                    ? m.content
                      ? renderMarkdown(m.content)
                      : streaming && i === messages.length - 1
                        ? (
                          <span className="inline-flex items-center gap-2 text-[#8B7355]/70">
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
              <details className="text-[11px] text-[#8B7355]/80 px-1">
                <summary className="cursor-pointer hover:text-[#8B7355]">
                  {lastTools.length} tool call
                  {lastTools.length === 1 ? "" : "s"} used
                </summary>
                <ul className="mt-1.5 space-y-1">
                  {lastTools.map((t, i) => (
                    <li
                      key={i}
                      className="bg-white/80 border border-[#e8ddc8] rounded-xl px-2.5 py-1.5 font-mono"
                    >
                      <div className="font-semibold text-stone-700">{t.name}</div>
                      {Object.keys(t.args || {}).length > 0 && (
                        <div className="text-[#8B7355]/80 truncate">
                          {JSON.stringify(t.args)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {memoryFlash && (
            <div className="px-4 pb-1 pt-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E28C0A]/10 border border-[#E28C0A]/30 text-[11px] text-[#8B5A0A] px-2.5 py-1">
                <Brain className="h-3 w-3" />
                {memoryFlash}
              </div>
            </div>
          )}

          {/* Input — pill-shaped */}
          <form
            onSubmit={onSubmit}
            className="border-t border-[#e8ddc8] bg-[#fbf6ea]/90 backdrop-blur-sm p-3 flex items-center gap-2"
          >
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={streaming}
                title={listening ? "Stop listening" : "Voice input"}
                className={`h-10 w-10 flex items-center justify-center rounded-full border transition shrink-0 ${
                  listening
                    ? "bg-red-500 text-white border-red-500 animate-pulse shadow-md"
                    : "bg-white text-[#8B7355] border-[#e0d0b3] hover:bg-[#E28C0A]/10 hover:border-[#E28C0A]/40"
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
              className="flex-1 rounded-full border border-[#e0d0b3] bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-[#8B7355]/50 focus:outline-none focus:ring-2 focus:ring-[#E28C0A]/30 focus:border-[#E28C0A]/60 disabled:opacity-50 transition"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-[#8B7355] to-[#E28C0A] text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
