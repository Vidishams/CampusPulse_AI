import { useEffect, useState } from "react";
import { api } from "../services/api";
import PulseLine from "../components/PulseLine";
import ErrorState from "../components/ErrorState";

export default function AdminRoster() {
  const [tab, setTab] = useState("students");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [studentForm, setStudentForm] = useState({ srn: "", name: "", department: "", semester: "" });
  const [facultyForm, setFacultyForm] = useState({ employeeId: "", name: "", department: "" });

  const load = async () => {
    setError("");
    try {
      setRows(await api.get(tab === "students" ? "/api/roster/students" : "/api/roster/faculty"));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { setRows(null); load(); }, [tab]);

  const addStudent = async (e) => {
    e.preventDefault();
    setActionMessage("");
    try {
      await api.post("/api/roster/students", { ...studentForm, semester: Number(studentForm.semester) });
      setStudentForm({ srn: "", name: "", department: "", semester: "" });
      load();
    } catch (err) {
      setActionMessage(err.message);
    }
  };

  const addFaculty = async (e) => {
    e.preventDefault();
    setActionMessage("");
    try {
      await api.post("/api/roster/faculty", facultyForm);
      setFacultyForm({ employeeId: "", name: "", department: "" });
      load();
    } catch (err) {
      setActionMessage(err.message);
    }
  };

  const uploadCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setActionMessage("Uploading…");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.postForm(
        tab === "students" ? "/api/roster/students/bulk" : "/api/roster/faculty/bulk",
        formData
      );
      setActionMessage(`Added ${res.added}, skipped ${res.skipped_existing} already on roster.`);
      load();
    } catch (err) {
      setActionMessage(err.message);
    }
    e.target.value = "";
  };

  const removeEntry = async (key) => {
    if (!confirm("Remove this roster entry? Anyone who already registered with it keeps their account.")) return;
    try {
      await api.del(tab === "students" ? `/api/roster/students/${key}` : `/api/roster/faculty/${key}`);
      load();
    } catch (err) {
      setActionMessage(err.message);
    }
  };

  return (
    <div>
      <h2>Enrollment roster</h2>
      <p className="text-muted">
        Pre-load valid SRNs / Employee IDs here so registration can be checked against your college's real
        records — nobody can self-register into a department or semester that isn't on this list.
      </p>
      <PulseLine />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className={`btn ${tab === "students" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("students")}>Students</button>
        <button className={`btn ${tab === "faculty" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("faculty")}>Faculty</button>
      </div>

      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3>Add one {tab === "students" ? "student" : "faculty member"}</h3>
          {tab === "students" ? (
            <form onSubmit={addStudent} className="form-stack">
              <label>SRN<input required pattern="[A-Z]\d{2}[A-Z]{2}\d{3}" title="Format: R23EQ113" value={studentForm.srn} onChange={(e) => setStudentForm({ ...studentForm, srn: e.target.value.toUpperCase() })} /></label>
              <label>Name<input required value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} /></label>
              <label>Department<input required value={studentForm.department} onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })} /></label>
              <label>Semester<input required type="number" min={1} max={8} value={studentForm.semester} onChange={(e) => setStudentForm({ ...studentForm, semester: e.target.value })} /></label>
              <button className="btn btn-primary">Add to roster</button>
            </form>
          ) : (
            <form onSubmit={addFaculty} className="form-stack">
              <label>Employee ID<input required pattern="[A-Z]\d{2}[A-Z]{2}\d{3}" title="Format: R23EQ113" value={facultyForm.employeeId} onChange={(e) => setFacultyForm({ ...facultyForm, employeeId: e.target.value.toUpperCase() })} /></label>
              <label>Name<input required value={facultyForm.name} onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })} /></label>
              <label>Department<input required value={facultyForm.department} onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })} /></label>
              <button className="btn btn-primary">Add to roster</button>
            </form>
          )}
        </div>

        <div className="card">
          <h3>Bulk upload (CSV)</h3>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Columns: {tab === "students" ? "srn, name, department, semester" : "employeeId, name, department"}
          </p>
          <input type="file" accept=".csv" onChange={uploadCsv} />
        </div>
      </div>

      {actionMessage && <p className="text-muted" style={{ marginBottom: 16 }}>{actionMessage}</p>}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows ? (
        <PulseLine animate />
      ) : rows.length === 0 ? (
        <p className="text-muted">No {tab} on the roster yet — add one above or upload a CSV.</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {rows.map((r) => (
            <div key={r.srn || r.employeeId} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 20px", borderBottom: "1px solid var(--ink-700)", gap: 12, flexWrap: "wrap",
            }}>
              <div>
                <div>{r.name} <span className="text-muted">— {r.srn || r.employeeId}</span></div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {r.department}{r.semester ? ` · Sem ${r.semester}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className={r.claimed ? "badge badge-amber" : "badge"}>
                  {r.claimed ? "Registered" : "Not yet registered"}
                </span>
                <button className="btn btn-danger" onClick={() => removeEntry(r.srn || r.employeeId)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
