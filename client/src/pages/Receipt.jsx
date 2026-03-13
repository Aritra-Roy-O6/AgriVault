import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, auth, getAuthHeaders } from "../firebase";

function isReceiptApproved(status) {
  return ["confirmed", "completed"].includes(status);
}

function resolveDashboard(role) {
  if (role === "owner") return "/dashboard/owner";
  if (role === "business") return "/dashboard/business";
  return "/dashboard/farmer";
}

function receiptHeading(booking) {
  if (booking?.gradeResult) {
    return {
      eyebrow: "FarmVault Certificate",
      title: "Your quality receipt is ready",
      shareLabel: "Your VaultX FarmVault certificate is ready.",
    };
  }

  return {
    eyebrow: "Storage Receipt",
    title: "Your storage receipt is ready",
    shareLabel: "Your VaultX storage receipt is ready.",
  };
}

export default function Receipt() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const dashboard = resolveDashboard(localStorage.getItem("userRole"));

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const bookingRes = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}`, { headers });
        const bookingData = await bookingRes.json();

        if (!bookingRes.ok) {
          throw new Error(bookingData.message || "Unable to load booking.");
        }

        setBooking(bookingData.booking);

        if (isReceiptApproved(bookingData.booking.status)) {
          const metadataRes = await fetch(`${apiBaseUrl}/api/receipt/${bookingId}/metadata`, { headers });
          const metadataData = await metadataRes.json();
          if (!metadataRes.ok) {
            throw new Error(metadataData.message || "Unable to load receipt metadata.");
          }
          setMetadata(metadataData);
        } else {
          setMetadata(null);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const approved = useMemo(() => isReceiptApproved(booking?.status), [booking?.status]);
  const labels = useMemo(() => receiptHeading(booking), [booking]);
  const whatsappUrl = metadata?.verifyUrl
    ? `https://wa.me/?text=${encodeURIComponent(`${labels.shareLabel} Verify it here: ${metadata.verifyUrl}`)}`
    : null;

  const downloadLegacyReceipt = async (headers) => {
    const res = await fetch(`${apiBaseUrl}/api/receipt/${bookingId}`, {
      headers,
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        throw new Error(data.message || "Could not download receipt.");
      }
      throw new Error("Could not download receipt.");
    }

    return res.blob();
  };

  const handleDownload = async () => {
    try {
      const headers = await getAuthHeaders();
      let blob;

      if (booking?.gradingSessionId) {
        const res = await fetch(`${apiBaseUrl}/api/grading/receipt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            session_id: booking.gradingSessionId,
            farmer_uid: auth.currentUser?.uid || booking.farmerId,
          }),
        });

        if (res.ok) {
          blob = await res.blob();
        } else {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            if (data.error) {
              blob = await downloadLegacyReceipt(headers);
            }
          }

          if (!blob) {
            blob = await downloadLegacyReceipt(headers);
          }
        }
      } else {
        blob = await downloadLegacyReceipt(headers);
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt-${bookingId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">Receipt</p>
          <h2>Loading receipt</h2>
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">Receipt</p>
          <h2>Receipt not found</h2>
          <Link className="button" to={dashboard}>
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!approved) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">Receipt</p>
          <h2>Receipt unlocks after approval</h2>
          <p>Current booking status: {booking.status}</p>
          <Link className="button" to={dashboard}>
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-center fade-up">
      <div className="card" style={{ maxWidth: "620px", width: "100%" }}>
        <div className="row-between" style={{ marginBottom: "16px" }}>
          <div>
            <p className="eyebrow">{labels.eyebrow}</p>
            <h2 style={{ margin: 0 }}>{labels.title}</h2>
          </div>
          <span className={`badge status-${booking.status || "pending"}`}>{booking.status || "pending"}</span>
        </div>

        <div className="receipt-meta">
          <div className="receipt-row"><span>Certificate ID</span><strong>{metadata?.receiptId || "N/A"}</strong></div>
          <div className="receipt-row"><span>Verified</span><strong>Tamper-proof</strong></div>
          <div className="receipt-row"><span>Customer</span><strong>{booking.farmerName || "N/A"}</strong></div>
          <div className="receipt-row"><span>Storage Space</span><strong>{booking.warehouseName || "N/A"}</strong></div>
          <div className="receipt-row"><span>Storage Category</span><strong>{booking.produce || booking.storageCategory || "N/A"}</strong></div>
          <div className="receipt-row"><span>Quantity</span><strong>{booking.weight || 0}</strong></div>
          <div className="receipt-row"><span>Storage Period</span><strong>{booking.duration || 0}</strong></div>
          <div className="receipt-row"><span>Total Cost</span><strong>Rs {Number(booking.totalPrice || 0).toLocaleString("en-IN")}</strong></div>
          {Number(booking.loanEligibility || 0) > 0 ? (
            <div className="receipt-row"><span>Loan Eligibility</span><strong>Rs {Number(booking.loanEligibility || 0).toLocaleString("en-IN")}</strong></div>
          ) : null}
          {booking.gradeResult ? (
            <>
              <div className="receipt-row"><span>Grade</span><strong>{booking.gradeResult.grade}</strong></div>
              <div className="receipt-row"><span>Score</span><strong>{booking.gradeResult.score ?? booking.gradeResult.overall_quality_score}/100</strong></div>
              <div className="receipt-row"><span>Standard</span><strong>{booking.gradeResult.standard || booking.gradeResult.standard_reference}</strong></div>
            </>
          ) : null}
          {booking.gradingSessionId ? (
            <div className="receipt-row"><span>Grading Session</span><strong>{booking.gradingSessionId}</strong></div>
          ) : null}
          {metadata ? (
            <div className="receipt-row"><span>Hash</span><strong className="hash-text">{metadata.receiptHash}</strong></div>
          ) : null}
        </div>

        <div className="actions">
          <button className="button" onClick={handleDownload} type="button">
            Download PDF
          </button>
          {whatsappUrl ? (
            <a className="button-secondary" href={whatsappUrl} rel="noreferrer" target="_blank">
              Share via WhatsApp
            </a>
          ) : null}
          {metadata?.verifyUrl ? (
            <a className="button-ghost" href={metadata.verifyUrl} rel="noreferrer" target="_blank">
              Open Verify Page
            </a>
          ) : null}
          <Link className="button-secondary" to={dashboard}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
