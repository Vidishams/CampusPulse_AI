import { useState } from "react";
import { api } from "../services/api";

export default function VerifyBanner() {
  const [state, setState] = useState("idle"); // idle | sending | sent | dismissed
  const [devPath, setDevPath] = useState(null);

  if (state === "dismissed") return null;

  const resend = async () => {
    setState("sending");
    try {
      const res = await api.post("/api/auth/resend-verification");
      setDevPath(res.devVerifyPath || null);
      setState("sent");
    } catch {
      setState("idle");
    }
  };

  return (
    <div style={{
      background: "var(--amber-dim)", color: "var(--amber)", padding: "10px 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, flexWrap: "wrap", gap: 8,
    }}>
      <span>Your email isn't verified yet. {state === "sent" && "Check the link below."}</span>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {devPath && (
          <a href={devPath} style={{ color: "var(--amber)", textDecoration: "underline" }}>Open verification link (dev mode)</a>
        )}
        {state !== "sent" && (
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={resend} disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Resend verification"}
          </button>
        )}
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setState("dismissed")}>Dismiss</button>
      </div>
    </div>
  );
}
