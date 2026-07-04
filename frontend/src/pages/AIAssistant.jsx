import { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";

const SUGGESTIONS = ["When is my next exam?", "What events are coming up?", "Show placement drives", "What deadlines do I have?"];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Ask me about your exams, deadlines, events, or placement drives — I only answer from what's actually posted." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (question) => {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/api/chat", { question });
      setMessages((prev) => [...prev, { role: "assistant", text: res.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong reaching the assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h2>AI Campus Assistant</h2>
      <PulseLine />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} className="btn btn-ghost" onClick={() => send(s)}>{s}</button>
        ))}
      </div>

      <div className="card" style={{ minHeight: 320, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <div style={{
              background: m.role === "user" ? "var(--amber-dim)" : "var(--ink-800)",
              color: m.role === "user" ? "var(--amber)" : "var(--paper-100)",
              padding: "10px 14px", borderRadius: 12, whiteSpace: "pre-wrap", fontSize: 14,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <PulseLine animate />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input style={{ flex: 1 }} placeholder="Ask something…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary" disabled={loading}>Send</button>
      </form>
    </div>
  );
}
