import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ title: "", venue: "", date: "", department: "", tags: "" });

  const load = async () => {
    setError("");
    try {
      const all = await api.get("/api/events");
      setEvents(all);
      if (user.role === "student") setRecommended(await api.get("/api/events/recommended"));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, [user.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await api.post("/api/events", {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        department: form.department || null,
      });
      setShowForm(false);
      setForm({ title: "", venue: "", date: "", department: "", tags: "" });
      load();
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Events</h2>
        {(user.role === "faculty" || user.role === "admin") && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Create event"}
          </button>
        )}
      </div>
      <PulseLine />

      {showForm && (
        <form onSubmit={handleCreate} className="card form-stack" style={{ marginBottom: 24 }}>
          <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>Venue<input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
          <label>Date & time<input type="datetime-local" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label>Department (optional)<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <label>Tags (comma separated)<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
          {formError && <p className="error-text">{formError}</p>}
          <button className="btn btn-primary">Publish event</button>
        </form>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : events === null ? (
        <PulseLine animate />
      ) : (
        <>
          {user.role === "student" && recommended.length > 0 && (
            <>
              <h3>Recommended for you</h3>
              <div className="grid-cards" style={{ marginBottom: 32 }}>
                {recommended.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            </>
          )}

          <h3>All events</h3>
          {events.length === 0 ? (
            <p className="text-muted">No events posted yet. {user.role !== "student" ? "Create the first one above." : "Check back soon."}</p>
          ) : (
            <div className="grid-cards">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event }) {
  return (
    <div className="card">
      <h3>{event.title}</h3>
      <p className="text-muted">{event.description}</p>
      <div style={{ fontSize: 13, color: "var(--paper-200)" }}>
        📍 {event.venue} · {new Date(event.date).toLocaleString()}
      </div>
      {event.registrationLink && (
        <a href={event.registrationLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: 10 }}>
          Register
        </a>
      )}
    </div>
  );
}
