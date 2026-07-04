import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This link is missing its token.");
      return;
    }
    api.post("/api/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => { setStatus("error"); setError(err.message); });
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 380, textAlign: "center" }}>
        {status === "verifying" && <p>Verifying your email…</p>}
        {status === "success" && (
          <>
            <h2>Email verified</h2>
            <p className="text-muted">You're all set.</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 10 }}>Go to dashboard</Link>
          </>
        )}
        {status === "error" && (
          <>
            <h2>Couldn't verify</h2>
            <p className="error-text">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}
