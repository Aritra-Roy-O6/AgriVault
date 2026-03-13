import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, auth, getAuthHeaders } from "../firebase";
import GradeResult from "../components/GradeResult";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

function isAllowedImage(file) {
  return file && ALLOWED_IMAGE_TYPES.includes(file.type);
}

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

    if (!isAllowedImage(nextFile)) {
      toast.error("Only PNG and JPEG images are allowed.");
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
      toast.error("Please select a PNG or JPEG image first.");
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.append("image", file);
      formData.append("booking_id", bookingId);
      formData.append("farmer_uid", auth.currentUser?.uid || booking?.farmerId || "");
      formData.append("produce_type", booking?.produce || "wheat");
      formData.append("include_annotated_image", "true");

      const response = await fetch(`${apiBaseUrl}/api/grading/analyze`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to grade produce.");
      }

      setResult(data.gradeResult || data);
      setBooking((current) =>
        current
          ? {
              ...current,
              gradingSessionId: data.session_id,
              gradeResult: data.gradeResult || data,
            }
          : current
      );
      toast.success(data.fallback ? "Fallback grading used. Check ML service health." : "Grading complete.");
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

  return (
    <main className="page fade-up">
      <div className="row-between" style={{ marginBottom: "8px" }}>
        <div>
          <p className="eyebrow">AI Grading</p>
          <h2 style={{ margin: 0 }}>Analyze Farm Produce</h2>
        </div>
        <Link className="button-ghost" to="/dashboard/farmer">
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
                  <p style={{ fontSize: "0.8rem", margin: 0 }}>PNG, JPG, JPEG only</p>
                </>
              )}
              <input
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
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
                "Analyze Farm Produce"
              )}
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
          {result ? (
            <div className="card">
              <GradeResult result={result} />
              <div className="actions" style={{ marginTop: "16px" }}>
                {booking.gradingSessionId ? (
                  <Link className="button" to={`/receipt/${bookingId}`}>
                    Download Receipt
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">AI</span>
                <p className="empty-state-title">AI Grade Result</p>
                <p className="empty-state-sub">Upload a PNG or JPEG produce image to get grade, BIS reference, bank eligibility status, and the annotated YOLO output.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

