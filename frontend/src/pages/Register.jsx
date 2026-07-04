import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "student",
    srn: "", employeeId: "", interests: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        ...form,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-panel">
        <div className="auth-header">
          <h2>Start your CampusPulse experience</h2>
          <p>Sign up and get a notice feed tailored to your role, department, and schedule.</p>
        </div>

        <label>
          Full name
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>

        <label>
          Email address
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>

        <label>
          Password
          <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>

        <label>
          I am a
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>
        </label>

        <div className="text-muted" style={{ fontSize: 13 }}>
          Admin accounts aren't self-service — they're set up by your college's IT team.
        </div>

        {form.role === "student" ? (
          <label>
            SRN (Student Registration Number)
            <input required pattern="[A-Z]\d{2}[A-Z]{2}\d{3}" title="Format: R23EQ113" value={form.srn} onChange={(e) => setForm({ ...form, srn: e.target.value.toUpperCase() })} placeholder="e.g. R23EQ113" />
            <span className="text-muted" style={{ fontSize: 13 }}>
              Format: R23EQ113. Your department and semester are pulled from your college's records.
            </span>
          </label>
        ) : (
          <label>
            Employee ID
            <input required pattern="[A-Z]\d{2}[A-Z]{2}\d{3}" title="Format: R23EQ113" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value.toUpperCase() })} placeholder="e.g. R23EQ113" />
            <span className="text-muted" style={{ fontSize: 13 }}>
              Format: R23EQ113. Your department is pulled from your college's records.
            </span>
          </label>
        )}

        {form.role === "student" && (
          <label>
            Interests (comma separated)
            <input placeholder="AI, Robotics, Web Dev" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
          </label>
        )}

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>

        <div className="auth-footer">
          <p className="text-muted">By creating an account you agree to the <Link to="/terms">Terms & Privacy</Link>.</p>
          <p className="text-muted">Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </form>
    </div>
  );
}
