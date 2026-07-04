import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
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
          <h2>Welcome back</h2>
          <p>Log in to your CampusPulse dashboard and catch the latest notice updates.</p>
        </div>

        <label>
          Email address
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Password
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13 }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" disabled={loading}>{loading ? "Logging in…" : "Log in"}</button>

        <div className="auth-footer">
          <p className="text-muted">No account? <Link to="/register">Create one</Link></p>
        </div>
      </form>
    </div>
  );
}
