import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function NoticeDetails() {
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setNotice(await api.get(`/api/notices/${id}`));
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, [id]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!notice) return <PulseLine animate />;

  return (
    <div style={{ maxWidth: 700 }}>
      <span className="badge badge-amber">{notice.category}</span>
      <h1>{notice.title}</h1>
      <div className="text-muted" style={{ marginBottom: 20 }}>
        Posted {new Date(notice.uploadDate).toLocaleString()}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Summary</h3>
        <p>{notice.summary}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, fontSize: 14 }}>
          {notice.venue && <div><strong>Venue</strong><div className="text-muted">{notice.venue}</div></div>}
          {notice.eligibility && <div><strong>Eligibility</strong><div className="text-muted">{notice.eligibility}</div></div>}
          {notice.deadline && <div><strong>Deadline</strong><div className="text-muted">{new Date(notice.deadline).toLocaleDateString()}</div></div>}
          {notice.actionRequired && <div><strong>Action required</strong><div className="text-muted">{notice.actionRequired}</div></div>}
        </div>
      </div>

      <PulseLine />
      <h3>Full text</h3>
      <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{notice.description}</p>
    </div>
  );
}
