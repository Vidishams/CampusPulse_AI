import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card form-stack" style={{ width: 380 }}>
        <h2>Set a new password</h2>
        {!token ? (
          <p className="error-text">This link is missing its token. Request a new one from the <Link to="/forgot-password">forgot password</Link> page.</p>
        ) : done ? (
          <p>Password updated. Taking you to login…</p>
        ) : (
          <form onSubmit={handleSubmit} className="form-stack">
            <label>New password
              <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" disabled={loading}>{loading ? "Saving…" : "Update password"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
