import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");

  const loadPending = async () => {
    try {
      setPending(await api.get("/api/notices/pending"));
    } catch (err) {
      setError(err.message);
    }
  };

  const loadAll = async () => {
    setError("");
    try {
      setStats(await api.get("/api/analytics/admin"));
      await loadPending();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const approve = async (id) => {
    try {
      await api.patch(`/api/notices/${id}/approve`);
      loadPending();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmReject = async (id) => {
    try {
      await api.patch(`/api/notices/${id}/reject`, { reason: reason || null });
      setRejectingId(null);
      setReason("");
      loadPending();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <ErrorState message={error} onRetry={loadAll} />;
  if (!stats) return <PulseLine animate />;

  const cards = [
    ["Students", stats.totalStudents],
    ["Faculty", stats.totalFaculty],
    ["Notices posted", stats.totalNotices],
    ["Events live", stats.totalEvents],
  ];

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Campus overview</h2>
          <p className="text-muted">System-wide activity across every department.</p>
        </div>
        <span className="badge badge-amber">{pending.length} pending approval{pending.length === 1 ? "" : "s"}</span>
      </div>

      <PulseLine />

      <div className="dashboard-grid">
        <div>
          <div className="section-panel" style={{ marginBottom: 24 }}>
            <h3>Pending approvals</h3>
            {pending.length === 0 ? (
              <p className="text-muted">Nothing waiting on you right now.</p>
            ) : (
              <div className="grid-cards">
                {pending.map((n) => (
                  <div className="card" key={n.id}>
                    <span className="badge">{n.category || "General"}</span>
                    <h3 style={{ marginTop: 12 }}><Link to={`/notices/${n.id}`}>{n.title}</Link></h3>
                    <p className="text-muted">{n.summary}</p>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                      Submitted {new Date(n.uploadDate).toLocaleDateString()}
                      {n.department ? ` · ${n.department}` : " · All departments"}
                    </div>

                    {rejectingId === n.id ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <input
                          placeholder="Reason (optional, shown to faculty)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="btn btn-danger" onClick={() => confirmReject(n.id)}>Confirm reject</button>
                          <button className="btn btn-ghost" onClick={() => { setRejectingId(null); setReason(""); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn btn-primary" onClick={() => approve(n.id)}>Approve</button>
                        <button className="btn btn-secondary" onClick={() => setRejectingId(n.id)}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section-panel">
            <h3>Most viewed notices</h3>
            {stats.mostViewedNotices.length === 0 ? (
              <p className="text-muted">No views recorded yet.</p>
            ) : stats.mostViewedNotices.map((n, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <span>{n.title}</span>
                <span className="badge badge-amber">{n.views} views</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="dashboard-aside">
          <div className="summary-group">
            {cards.map(([label, value]) => (
              <div className="summary-card" key={label}>
                <div className="summary-label">{label}</div>
                <div className="summary-value">{value}</div>
              </div>
            ))}
          </div>

          <div className="section-panel">
            <h3>Students by department</h3>
            {stats.departmentActivity.map((d) => (
              <div key={d._id || "unassigned"} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <span>{d._id || "Unassigned"}</span>
                <span>{d.count}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
