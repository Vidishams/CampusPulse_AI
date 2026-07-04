import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

const STATUS_STYLE = {
  pending: { label: "Pending review", className: "badge badge-amber" },
  approved: { label: "Live", className: "badge" },
  rejected: { label: "Rejected", className: "badge" },
};

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // /mine returns every status (pending/approved/rejected) for this
      // uploader -- the public /notices endpoint only ever returns approved
      // ones, so faculty need their own view to see what's awaiting review.
      setNotices(await api.get("/api/notices/mine"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user.id]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this notice?")) return;
    try {
      await api.del(`/api/notices/${id}`);
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Your notices</h2>
          <p className="text-muted">Everything you've posted, with reach at a glance.</p>
        </div>
        <Link to="/upload" className="btn btn-primary">+ New notice</Link>
      </div>

      <PulseLine />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? <PulseLine animate /> : notices.length === 0 ? (
        <p className="text-muted">You haven't posted anything yet. Upload a PDF, image, or type one in directly.</p>
      ) : (
        <div className="grid-cards">
          {notices.map((n) => (
            <div key={n.id} className="card">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge">{n.category || "General"}</span>
                <span className={STATUS_STYLE[n.status]?.className || "badge"}>
                  {STATUS_STYLE[n.status]?.label || n.status}
                </span>
              </div>
              <h3 style={{ marginTop: 12 }}>{n.title}</h3>
              <p className="text-muted">{n.summary}</p>
              {n.status === "rejected" && n.rejectionReason && (
                <p className="error-text">Reason: {n.rejectionReason}</p>
              )}
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                Posted {new Date(n.uploadDate).toLocaleDateString()}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to={`/notices/${n.id}`} className="btn btn-secondary">View</Link>
                <button className="btn btn-danger" onClick={() => handleDelete(n.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
