import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/salesbot")({
  ssr: false,
  head: () => ({ meta: [{ title: "AMT Fight Wear — Assistente" }] }),
  component: SalesBotWidget,
});

type Msg = { role: "user" | "assistant"; text: string };

const VISITOR_KEY = "amt_salesbot_visitor";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `web_${crypto.randomUUID()}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `web_${Math.random().toString(36).slice(2)}`;
  }
}

function SalesBotWidget() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Olá! Sou o assistente da AMT Fight Wear. Como posso te ajudar a encontrar o produto ideal?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [visitorId] = useState<string>(() => (typeof window !== "undefined" ? getVisitorId() : "web_ssr"));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }, { role: "assistant", text: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/public/sales/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "web", external_id: visitorId, message: text }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", text: `Desculpe, tive um problema (${res.status}). ${err.slice(0, 200)}` };
          return c;
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", text: acc };
          return c;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro de conexão";
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", text: `Erro: ${msg}` };
        return c;
      });
    } finally {
      setBusy(false);
    }
  }

  function renderText(text: string) {
    // Render simple markdown: **bold** and [label](url)
    const parts: (string | { url: string; label: string })[] = [];
    let last = 0;
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      parts.push({ url: m[2], label: m[1] });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.map((p, i) =>
      typeof p === "string" ? (
        <span key={i} style={{ whiteSpace: "pre-wrap" }}>
          {p.split(/\*\*(.+?)\*\*/g).map((seg, j) => (j % 2 === 1 ? <strong key={j}>{seg}</strong> : <span key={j}>{seg}</span>))}
        </span>
      ) : (
        <a
          key={i}
          href={p.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            marginTop: 6,
            background: "#111",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {p.label} →
        </a>
      ),
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#fafafa",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: "#111",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          background: "#000",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 0.4,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: "#22c55e" }} />
        AMT Fight Wear — Assistente
      </header>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.role === "user" ? "#111" : "#fff",
              color: m.role === "user" ? "#fff" : "#111",
              border: m.role === "user" ? "none" : "1px solid #e5e5e5",
              padding: "10px 12px",
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {m.text ? renderText(m.text) : <em style={{ opacity: 0.6 }}>digitando…</em>}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #e5e5e5", background: "#fff" }}
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva sua mensagem…"
          disabled={busy}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          style={{
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: busy ? "wait" : "pointer",
            opacity: busy || !input.trim() ? 0.6 : 1,
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
