import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    interests: (user.interests || []).join(", "),
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const updated = await api.put("/api/users/me", {
        ...form,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Your profile</h2>
      <form onSubmit={handleSubmit} className="card form-stack">
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input disabled value={user.email} /></label>
        <label>Role<input disabled value={user.role} /></label>
        <label>Department<input disabled value={user.department || "—"} /></label>

        {user.role === "student" && (
          <label>Semester<input disabled value={user.semester ?? "—"} /></label>
        )}
        {user.role === "student" && (
          <label>SRN<input disabled value={user.srn || "—"} /></label>
        )}
        {user.role === "faculty" && (
          <label>Employee ID<input disabled value={user.employeeId || "—"} /></label>
        )}

        <p className="text-muted" style={{ fontSize: 12 }}>
          Department{user.role === "student" ? ", semester, and SRN" : " and Employee ID"} come from your
          college's official roster and can't be edited here — contact your admin if any of it is wrong.
        </p>

        {user.role === "student" && (
          <label>Interests<input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} /></label>
        )}

        <button className="btn btn-primary">Save changes</button>
        {error && <p className="error-text">{error}</p>}
        {saved && <p style={{ color: "var(--cyan)" }}>Saved.</p>}
      </form>
    </div>
  );
}
