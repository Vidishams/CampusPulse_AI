import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

const DEPARTMENTS = ["", "Computer Science", "Electronics", "Mechanical", "Civil", "Electrical"];

export default function UploadNotice() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("file");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "file") {
        const formData = new FormData();
        formData.append("title", title);
        if (department) formData.append("department", department);
        if (semester) formData.append("semester", semester);
        formData.append("file", file);
        await api.postForm("/api/notices/upload", formData);
      } else {
        await api.post("/api/notices", {
          title, description,
          department: department || null,
          semester: semester ? Number(semester) : null,
        });
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <h2>Post a notice</h2>
      <p className="text-muted">
        Upload a PDF, image, or Word file and CampusPulse will OCR it, summarize it, tag its
        category, and notify every eligible student instantly. Or type one in directly.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button className={`btn ${mode === "file" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("file")}>Upload file</button>
        <button className={`btn ${mode === "text" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("text")}>Type it in</button>
      </div>

      <form onSubmit={handleSubmit} className="card form-stack">
        <label>Title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>Department (leave blank for all departments)
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d || "All departments"}</option>)}
          </select>
        </label>
        <label>Semester (leave blank for all semesters)
          <input type="number" min={1} max={8} value={semester} onChange={(e) => setSemester(e.target.value)} />
        </label>

        {mode === "file" ? (
          <label>File (PDF, DOCX, PNG, JPG)
            <input type="file" required accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} />
          </label>
        ) : (
          <label>Content
            <textarea required rows={8} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        )}

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" disabled={loading}>{loading ? "Processing…" : "Post notice"}</button>
      </form>
    </div>
  );
}
