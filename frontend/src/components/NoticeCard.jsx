import { Link } from "react-router-dom";

export default function NoticeCard({ notice, onBookmark, bookmarked }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <span className="badge">{notice.category || "General"}</span>
        {onBookmark && (
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={() => onBookmark(notice.id)}>
            {bookmarked ? "★ Saved" : "☆ Save"}
          </button>
        )}
      </div>
      <h3 style={{ marginTop: 10 }}><Link to={`/notices/${notice.id}`}>{notice.title}</Link></h3>
      <p className="text-muted">{notice.summary || notice.description?.slice(0, 140)}</p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--paper-200)", marginTop: 10 }}>
        {notice.venue && <span>📍 {notice.venue}</span>}
        {notice.deadline && <span>⏰ {new Date(notice.deadline).toLocaleDateString()}</span>}
        {notice.eligibility && <span>🎓 {notice.eligibility}</span>}
      </div>
    </div>
  );
}
