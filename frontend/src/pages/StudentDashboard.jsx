import { useEffect, useState } from "react";
import { api } from "../services/api";
import NoticeCard from "../components/NoticeCard";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function StudentDashboard() {
  const [notices, setNotices] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [feed, bookmarks] = await Promise.all([
        api.get("/api/notices/feed"),
        api.get("/api/bookmarks"),
      ]);
      setNotices(feed);
      setBookmarkedIds(new Set(bookmarks.map((b) => b.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return load();
    setLoading(true);
    setError("");
    try {
      setNotices(await api.get(`/api/search?q=${encodeURIComponent(query)}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (noticeId) => {
    try {
      if (bookmarkedIds.has(noticeId)) {
        await api.del(`/api/bookmarks/${noticeId}`);
        setBookmarkedIds((prev) => { const next = new Set(prev); next.delete(noticeId); return next; });
      } else {
        await api.post("/api/bookmarks", { noticeId });
        setBookmarkedIds((prev) => new Set(prev).add(noticeId));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const upcomingDeadlines = notices
    .filter((n) => n.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Your feed</h2>
          <p className="text-muted">Notices matched to your department, semester, and interests.</p>
        </div>
        <div className="summary-group">
          <div className="summary-card">
            <div className="summary-label">Saved notices</div>
            <div className="summary-value">{bookmarkedIds.size}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Upcoming deadlines</div>
            <div className="summary-value">{upcomingDeadlines.length}</div>
          </div>
        </div>
      </div>

      <PulseLine />

      <form onSubmit={handleSearch} className="search-bar">
        <input
          placeholder='Try "AI workshops" or "placement drives this month"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-secondary">Search</button>
      </form>

      {upcomingDeadlines.length > 0 && (
        <div className="section-panel" style={{ marginBottom: 24 }}>
          <h3>Nearest deadlines</h3>
          {upcomingDeadlines.map((n) => (
            <div key={n.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span>{n.title}</span>
              <span className="badge badge-amber">{new Date(n.deadline).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <PulseLine animate />
      ) : notices.length === 0 ? (
        <p className="text-muted">No notices match yet — check back once faculty post updates for your department.</p>
      ) : (
        <div className="grid-cards">
          {notices.map((n) => (
            <NoticeCard key={n.id} notice={n} onBookmark={toggleBookmark} bookmarked={bookmarkedIds.has(n.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
