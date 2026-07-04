import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

const ROLES = ["student", "faculty", "admin"];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("");

  const load = async () => {
    setError("");
    try {
      setUsers(await api.get("/api/users"));
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const changeRole = async (userId, role) => {
    setActionError("");
    try {
      await api.patch(`/api/users/${userId}/role`, { role });
      load();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const removeUser = async (userId) => {
    if (!confirm("Remove this user? This can't be undone.")) return;
    setActionError("");
    try {
      await api.del(`/api/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const visible = users?.filter((u) => !filter || u.role === filter) || [];

  return (
    <div>
      <h2>Manage users</h2>
      <p className="text-muted">Promote a trusted faculty member to admin, or remove an account.</p>
      <PulseLine />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["", "student", "faculty", "admin"].map((r) => (
          <button key={r || "all"} className={`btn ${filter === r ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(r)}>
            {r ? r[0].toUpperCase() + r.slice(1) : "All"}
          </button>
        ))}
      </div>

      {actionError && <p className="error-text" style={{ marginBottom: 12 }}>{actionError}</p>}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !users ? (
        <PulseLine animate />
      ) : visible.length === 0 ? (
        <p className="text-muted">No users match this filter.</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {visible.map((u) => (
            <div key={u.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 20px", borderBottom: "1px solid var(--ink-700)", gap: 12, flexWrap: "wrap",
            }}>
              <div>
                <div>{u.name} {u.id === me.id && <span className="text-muted">(you)</span>}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{u.email} · {u.department || "No department"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} disabled={u.id === me.id}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="btn btn-danger" disabled={u.id === me.id} onClick={() => removeUser(u.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
