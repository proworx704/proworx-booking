import { useAction } from "convex/react";
import {
  Bot,
  ChevronRight,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";

// ─── Types ──────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

// ─── Suggested questions ────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "📅 Today's schedule", q: "What's on the schedule today?" },
  { label: "💰 Unpaid bookings", q: "Show me all unpaid bookings" },
  {
    label: "📊 Revenue comparison",
    q: "What's my revenue this month vs last month?",
  },
  {
    label: "👥 Inactive customers",
    q: "Which customers haven't booked in 90 days?",
  },
  { label: "🏆 Top customers", q: "Who are my top 5 customers by revenue?" },
  {
    label: "🔥 Popular services",
    q: "What are the most popular services?",
  },
  {
    label: "📈 Weekly summary",
    q: "Summarize this week's bookings and revenue",
  },
  {
    label: "🆕 New customers",
    q: "How many new customers this month?",
  },
];

// ─── Markdown-lite renderer ─────────────────────────────────────────────────

function FormattedMessage({ content }: { content: string }) {
  // Convert markdown-ish text into simple JSX
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;
    elements.push(
      <div
        key={`tbl-${elements.length}`}
        className="overflow-x-auto my-3 rounded-lg border"
      >
        <table className="w-full text-sm">
          {tableHeader.length > 0 && (
            <thead>
              <tr className="border-b bg-muted/50">
                {tableHeader.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-medium text-muted-foreground"
                  >
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri} className="border-b last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2">
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
    tableHeader = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table row detection
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .split("|")
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      // Skip separator lines (|---|---|)
      if (cells.every((c) => /^[\s-:]+$/.test(c))) {
        inTable = true;
        continue;
      }

      if (!inTable && tableHeader.length === 0) {
        tableHeader = cells;
        inTable = true;
      } else {
        tableRows.push(cells);
      }
      continue;
    }

    // If we were in a table, flush it
    if (inTable) flushTable();

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
          {line.slice(4)}
        </h4>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="font-semibold mt-3 mb-1">
          {line.slice(3)}
        </h3>,
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Inline formatting
    const format = (text: string): React.ReactNode => {
      // Bold: **text** or __text__
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, pi) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pi} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Inline code: `code`
        const codeParts = part.split(/(`[^`]+`)/g);
        return codeParts.map((cp, ci) => {
          if (cp.startsWith("`") && cp.endsWith("`")) {
            return (
              <code
                key={`${pi}-${ci}`}
                className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
              >
                {cp.slice(1, -1)}
              </code>
            );
          }
          return <span key={`${pi}-${ci}`}>{cp}</span>;
        });
      });
    };

    // Bullet point
    if (/^[\s]*[•\-\*]\s/.test(line)) {
      const text = line.replace(/^[\s]*[•\-\*]\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 pl-2 py-0.5">
          <span className="text-muted-foreground shrink-0">•</span>
          <span>{format(text)}</span>
        </div>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 pl-2 py-0.5">
            <span className="text-muted-foreground shrink-0 font-medium w-5 text-right">
              {match[1]}.
            </span>
            <span>{format(match[2])}</span>
          </div>,
        );
        continue;
      }
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="py-0.5">
        {format(line)}
      </p>,
    );
  }

  // Flush any remaining table
  if (inTable) flushTable();

  return <div className="text-sm leading-relaxed">{elements}</div>;
}

// ─── Welcome screen ─────────────────────────────────────────────────────────

function WelcomeScreen({
  onSelect,
}: {
  onSelect: (q: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
            <Sparkles className="size-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">ProWorx AI Assistant</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Ask me anything about your bookings, revenue, customers, or
            schedule. I have real-time access to your business data.
          </p>
        </div>

        {/* Suggestion chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.q}
              type="button"
              onClick={() => onSelect(s.q)}
              className="flex items-center gap-3 text-left p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
            >
              <span className="text-lg">{s.label.split(" ")[0]}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">
                  {s.label.split(" ").slice(1).join(" ")}
                </span>
                <p className="text-xs text-muted-foreground truncate">
                  {s.q}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatAction = useAction(api.aiAssistant.chat);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const response = await chatAction({ messages: history });

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: response,
            timestamp: new Date(),
          },
        ]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content:
              err?.message ||
              "Sorry, something went wrong. Please try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, isLoading, chatAction],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="size-6" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground text-sm">
            Ask questions about your bookings, revenue, customers &amp; more
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            className="gap-1.5"
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Chat Area */}
      {messages.length === 0 && !isLoading ? (
        <WelcomeScreen onSelect={sendMessage} />
      ) : (
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-4 text-white" />
                </div>
              )}
              <Card
                className={`max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card"
                }`}
              >
                <CardContent className="p-3">
                  {msg.role === "user" ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <FormattedMessage content={msg.content} />
                  )}
                </CardContent>
              </Card>
              {msg.role === "user" && (
                <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="size-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="size-4 text-white" />
              </div>
              <Card className="bg-card">
                <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing your data…
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 pt-3 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about bookings, revenue, customers, schedule…"
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="shrink-0 h-[44px] w-[44px]"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Powered by AI · Answers based on your live business data
        </p>
      </div>
    </div>
  );
}
