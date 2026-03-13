import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";
import GradeResult from "../components/GradeResult";

export default function GradeUpload() {
  const { bookingId } = useParams();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [booking, setBooking] = useState(null);
  const [result, setResult] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    (async () => {
      setPageLoading(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}`, {
          headers,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load booking.");
        }

        setBooking(data.booking);
        if (data.booking.gradeResult) {
          setResult(data.booking.gradeResult);
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setPageLoading(false);
      }
    })();
  }, [bookingId]);

  const handleFile = (nextFile) => {
    if (!nextFile) {
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setResult((current) => current && current.gradedAt ? current : null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) {
      handleFile(nextFile);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      toast.error("Please select an image first.");
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.append("image", file);
      formData.append("bookingId", bookingId);

      const response = await fetch(`${apiBaseUrl}/api/grade`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to grade produce.");
      }

      setResult(data.gradeResult);
      toast.success("Grading complete.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">Loading</p>
          <h2>Preparing grade upload</h2>
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">AI Grading</p>
          <h2>Booking not found</h2>
        </div>
      </main>
    );
  }

  if (!["confirmed", "completed"].includes(booking.status)) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">AI Grading</p>
          <h2>Only confirmed bookings can be graded</h2>
          <p>Current booking status: {booking.status}</p>
          <Link className="button" to="/farmer">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page fade-up">
      <div className="row-between" style={{ marginBottom: "8px" }}>
        <div>
          <p className="eyebrow">AI Grading</p>
          <h2 style={{ margin: 0 }}>Analyze Produce</h2>
        </div>
        <Link className="button-ghost" to="/farmer">
          Back
        </Link>
      </div>

      <section className="page two-column">
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Upload Produce Image</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div
              className={`upload-zone${dragging ? " dragging" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDrop={handleDrop}
            >
              {preview ? (
                <img alt="Produce preview" src={preview} style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "12px" }} />
              ) : (
                <>
                  <span className="upload-zone-icon">Upload</span>
                  <p style={{ fontWeight: 700, margin: 0 }}>Drop image here or click to browse</p>
                  <p style={{ fontSize: "0.8rem", margin: 0 }}>JPG, PNG, WEBP</p>
                </>
              )}
              <input
                accept="image/*"
                onChange={(event) => handleFile(event.target.files?.[0])}
                ref={fileRef}
                style={{ display: "none" }}
                type="file"
              />
            </div>
            {file ? <p style={{ fontSize: "0.8rem", margin: 0 }}>File: {file.name}</p> : null}
            <button className="button button-full" disabled={loading || !file} type="submit">
              {loading ? (
                <>
                  <span className="spinner" /> Analyzing Produce...
                </>
              ) : (
                "Analyze Produce"
              )}
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
          {result ? (
            <div className="card">
              <GradeResult result={result} />
              <div className="actions" style={{ marginTop: "16px" }}>
                <Link className="button" to={`/receipt/${bookingId}`}>
                  Download Receipt
                </Link>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">AI</span>
                <p className="empty-state-title">AI Grade Result</p>
                <p className="empty-state-sub">Upload a produce image to get grade, BIS reference, and bank eligibility status.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}