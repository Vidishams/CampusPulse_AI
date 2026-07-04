import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function Clubs() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    setError("");
    try {
      setClubs(await api.get("/api/clubs"));
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await api.post("/api/clubs", form);
      setShowForm(false);
      setForm({ name: "", description: "" });
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const join = async (clubId) => {
    try {
      await api.post(`/api/clubs/${clubId}/join`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Clubs</h2>
        {(user.role === "faculty" || user.role === "admin") && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New club"}
          </button>
        )}
      </div>
      <PulseLine />

      {showForm && (
        <form onSubmit={handleCreate} className="card form-stack" style={{ marginBottom: 24 }}>
          <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          {formError && <p className="error-text">{formError}</p>}
          <button className="btn btn-primary">Create club</button>
        </form>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : clubs === null ? (
        <PulseLine animate />
      ) : clubs.length === 0 ? (
        <p className="text-muted">No clubs yet. {user.role !== "student" ? "Create the first one above." : "Check back soon."}</p>
      ) : (
        <div className="grid-cards">
          {clubs.map((c) => (
            <div className="card" key={c.id}>
              <h3>{c.name}</h3>
              <p className="text-muted">{c.description}</p>
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>{c.members.length} members</div>
              {user.role === "student" && !c.members.includes(user.id) && (
                <button className="btn btn-secondary" onClick={() => join(c.id)}>Join club</button>
              )}
              {user.role === "student" && c.members.includes(user.id) && (
                <span className="badge badge-amber">Member</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
