import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { auth, apiBaseUrl } from "../firebase";
import GradeResult from "../components/GradeResult";

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

export default function GradeUpload() {
  const { bookingId } = useParams();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select an image first.");
    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}/grade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResult(data.grade);
      toast.success("Grading complete!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page fade-up">
      <div className="row-between" style={{ marginBottom:"8px" }}>
        <div>
          <p className="eyebrow">AI Grading</p>
          <h2 style={{ margin:0 }}>Grade Your Produce</h2>
        </div>
        <Link className="button-ghost" to="/farmer">&#8592; Back</Link>
      </div>

      <section className="page two-column">
        <div className="card">
          <h3 style={{ marginBottom:"1rem" }}>Upload Produce Image</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div
              className={`upload-zone${dragging ? " dragging" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Produce preview"
                  style={{ width:"100%", maxHeight:"220px", objectFit:"cover", borderRadius:"12px" }}
                />
              ) : (
                <>
                  <span className="upload-zone-icon">&#128247;</span>
                  <p style={{ fontWeight:700, color:"var(--clr-ink)", margin:0 }}>
                    Drop image here or click to browse
                  </p>
                  <p style={{ fontSize:"0.8rem", color:"var(--clr-ink-muted)", margin:0 }}>
                    Supports JPG, PNG, WEBP
                  </p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display:"none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
            {file && (
              <p style={{ fontSize:"0.8rem", color:"var(--clr-ink-muted)", margin:0 }}>
                &#128196; {file.name}
              </p>
            )}
            <button
              className="button button-full"
              disabled={loading || !file}
              type="submit"
              style={{ marginTop:"4px" }}
            >
              {loading ? (
                <><span className="spinner" /> Analyzing...</>
              ) : (
                "&#129302; Grade Produce"
              )}
            </button>
          </form>
        </div>

        <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
          {result ? (
            <div className="card">
              <GradeResult result={result} />
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">&#129302;</span>
                <p className="empty-state-title">AI Grade Result</p>
                <p className="empty-state-sub">
                  Upload a produce image and submit to get an instant AI-powered quality grade.
                </p>
              </div>
            </div>
          )}
          <div className="card">
            <p className="eyebrow">How it works</p>
            <ul className="simple-list">
              <li>Upload a clear photo of your produce</li>
              <li>Our AI analyzes color, texture and quality</li>
              <li>You receive a Grade A, B, or C rating</li>
              <li>Better grades unlock higher loan eligibility</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
