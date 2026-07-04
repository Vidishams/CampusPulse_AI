import { Link } from "react-router-dom";
import PulseLine from "../components/PulseLine";

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="hero-copy">
          <span className="badge badge-amber">For students, faculty & admins</span>
          <h1>Every notice that matters, none of the ones that don't.</h1>
          <p>
            CampusPulse reads every circular, drive, and deadline your college posts, summarizes the core details,
            and delivers only the notices that matter most to your department and semester.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">Create an account</Link>
            <Link to="/login" className="btn btn-secondary">Log in</Link>
          </div>
        </div>

        <div className="hero-panel">
          <span className="hero-panel-tag">Live campus pulse</span>
          <div>
            <h2>Smart notice discovery</h2>
            <p>See the next opportunity, exam update, or club invite without sifting through long PDFs and group forwards.</p>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <strong>99%</strong>
              <span>Relevant notices surfaced</span>
            </div>
            <div className="hero-stat">
              <strong>Instant</strong>
              <span>Updates delivered the moment they're posted</span>
            </div>
          </div>

          <PulseLine animate color="var(--accent)" />
        </div>
      </div>

      <div className="grid-cards feature-grid">
        <div className="card">
          <h3>AI-powered summaries</h3>
          <p className="text-muted">Extracts deadlines, venues, eligibility, and key actions so you can act without reading every notice end to end.</p>
        </div>
        <div className="card">
          <h3>Adaptive personalization</h3>
          <p className="text-muted">Your dashboard is shaped by your role, department, semester, and interests.</p>
        </div>
        <div className="card">
          <h3>Campus-wide coordination</h3>
          <p className="text-muted">Faculties and admins share notices and drive announcements directly to the right students.</p>
        </div>
      </div>
    </div>
  );
}
