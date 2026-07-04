import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <Link to="/" style={{ fontSize: 13 }}>← Back home</Link>
      <h1 style={{ marginTop: 16 }}>Terms & Privacy</h1>
      <p className="text-muted">Last updated: this is a template — your college should have it reviewed before real use.</p>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>What we collect</h3>
        <p>Name, college email, department, semester, and any interests you add to your profile. If you upload a
        notice as faculty, the file and its extracted text are stored so it can be shown to students.</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>How it's used</h3>
        <p>Solely to route notices, events, and deadlines to the students they're relevant to, and to power
        the search and AI assistant features from your college's own data. Nothing is shared with third parties
        or used to train external models.</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Data retention</h3>
        <p>Notices, events, and your profile persist for as long as your account is active. Deleting your account
        removes your profile and bookmarks; notices you posted as faculty remain (with the same visibility rules)
        since they're part of the college's institutional record.</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Your choices</h3>
        <p>You can edit your interests and department at any time from your Profile page. To request full account
        deletion, contact your college's IT administrator.</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Contact</h3>
        <p>Questions about this policy should go to your college's IT/administration office, not to this
        application directly.</p>
      </div>
    </div>
  );
}
