import { useEffect, useState } from "react";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function Notifications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setItems(await api.get("/api/notifications"));
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Notifications</h2>
        <button className="btn btn-ghost" onClick={markAllRead}>Mark all read</button>
      </div>
      <PulseLine />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !items ? (
        <PulseLine animate />
      ) : items.length === 0 ? (
        <p className="text-muted">You're all caught up.</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {items.map((n) => (
            <div key={n.id} style={{
              padding: "14px 20px", borderBottom: "1px solid var(--ink-700)",
              background: n.isRead ? "transparent" : "var(--ink-800)",
            }}>
              <div>{n.message}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
