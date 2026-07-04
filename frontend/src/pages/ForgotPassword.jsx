import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card form-stack" style={{ width: 400 }}>
        <h2>Reset your password</h2>
        {!result ? (
          <form onSubmit={handleSubmit} className="form-stack">
            <p className="text-muted">Enter the email on your account and we'll generate a reset link.</p>
            <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
            <p className="text-muted"><Link to="/login">Back to login</Link></p>
          </form>
        ) : (
          <div>
            <p>{result.message}</p>
            {result.devResetPath && (
              <div className="card" style={{ background: "var(--ink-800)", marginTop: 12 }}>
                <p className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  Dev mode — no email service is wired up yet, so here's your link directly:
                </p>
                <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => navigate(result.devResetPath)}>
                  Open reset link
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
