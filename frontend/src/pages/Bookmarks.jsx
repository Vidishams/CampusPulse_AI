import { useEffect, useState } from "react";
import { api } from "../services/api";
import NoticeCard from "../components/NoticeCard";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function Bookmarks() {
  const [notices, setNotices] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setNotices(await api.get("/api/bookmarks"));
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const removeBookmark = async (id) => {
    try {
      await api.del(`/api/bookmarks/${id}`);
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Saved notices</h2>
      <PulseLine />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !notices ? (
        <PulseLine animate />
      ) : notices.length === 0 ? (
        <p className="text-muted">Nothing saved yet. Tap the star on any notice to keep it here.</p>
      ) : (
        <div className="grid-cards">
          {notices.map((n) => <NoticeCard key={n.id} notice={n} onBookmark={removeBookmark} bookmarked />)}
        </div>
      )}
    </div>
  );
}
