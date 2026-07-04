import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications";
import VerifyBanner from "./VerifyBanner";

const LINKS_BY_ROLE = {
  student: [
    ["/dashboard", "Dashboard"],
    ["/events", "Events"],
    ["/placements", "Placements"],
    ["/bookmarks", "Bookmarks"],
    ["/assistant", "AI Assistant"],
    ["/clubs", "Clubs"],
    ["/profile", "Profile"],
  ],
  faculty: [
    ["/dashboard", "Dashboard"],
    ["/upload", "Upload Notice"],
    ["/events", "Events"],
    ["/clubs", "Clubs"],
    ["/profile", "Profile"],
  ],
  admin: [
    ["/dashboard", "Dashboard"],
    ["/analytics", "Analytics"],
    ["/users", "Manage Users"],
    ["/roster", "Enrollment Roster"],
    ["/upload", "Upload Notice"],
    ["/events", "Events"],
    ["/clubs", "Clubs"],
    ["/profile", "Profile"],
  ],
};

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const liveNotifications = useRealtimeNotifications();
  const links = LINKS_BY_ROLE[user?.role] || [];
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar${navOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div>
            <strong>CampusPulse</strong>
            <div className="sidebar-meta">{user?.role} view</div>
          </div>
          <button className="btn btn-ghost mobile-nav-close" onClick={() => setNavOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setNavOpen(false)} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => { logout(); navigate("/login"); }}>
            Log out
          </button>
        </div>
      </aside>

      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}

      <div>
        {user && !user.isVerified && <VerifyBanner />}
        <div className="topbar">
          <button className="btn btn-ghost mobile-nav-toggle" onClick={() => setNavOpen(true)}>☰ Menu</button>
          <div className="topbar-title">CampusPulse</div>
          <NavLink to="/notifications" className="sidebar-link" style={{ position: "relative", width: "fit-content" }}>
            🔔 Notifications
            {liveNotifications.length > 0 && (
              <span className="badge badge-amber" style={{ marginLeft: 10 }}>{liveNotifications.length} new</span>
            )}
          </NavLink>
        </div>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
