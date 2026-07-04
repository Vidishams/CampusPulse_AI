import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function Placements() {
  const { user } = useAuth();
  const [placements, setPlacements] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ company: "", role: "", package: "", eligibility: "", deadline: "", registrationLink: "" });

  const load = async () => {
    setError("");
    try {
      setPlacements(await api.get("/api/placements"));
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await api.post("/api/placements", form);
      setShowForm(false);
      setForm({ company: "", role: "", package: "", eligibility: "", deadline: "", registrationLink: "" });
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Placement drives</h2>
        {(user.role === "faculty" || user.role === "admin") && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Add drive"}
          </button>
        )}
      </div>
      <PulseLine />

      {showForm && (
        <form onSubmit={handleCreate} className="card form-stack" style={{ marginBottom: 24 }}>
          <label>Company<input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
          <label>Role<input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></label>
          <label>Package<input value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} /></label>
          <label>Eligibility<input value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} /></label>
          <label>Deadline<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
          <label>Registration link<input value={form.registrationLink} onChange={(e) => setForm({ ...form, registrationLink: e.target.value })} /></label>
          {formError && <p className="error-text">{formError}</p>}
          <button className="btn btn-primary">Publish drive</button>
        </form>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : placements === null ? (
        <PulseLine animate />
      ) : placements.length === 0 ? (
        <p className="text-muted">No placement drives posted yet. {user.role !== "student" ? "Add the first one above." : "Check back soon."}</p>
      ) : (
        <div className="grid-cards">
          {placements.map((p) => (
            <div className="card" key={p.id}>
              <h3>{p.company}</h3>
              <p className="text-muted">{p.role} {p.package && `· ${p.package}`}</p>
              {p.eligibility && <div style={{ fontSize: 13 }}>🎓 {p.eligibility}</div>}
              {p.deadline && <div style={{ fontSize: 13 }}>⏰ Apply by {new Date(p.deadline).toLocaleDateString()}</div>}
              {p.registrationLink && (
                <a href={p.registrationLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: 10 }}>Apply</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
