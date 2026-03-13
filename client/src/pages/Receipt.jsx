import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";

export default function Receipt() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}`, {
          headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load receipt.");
        setBooking(data.booking);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const handleDownload = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBaseUrl}/api/receipt/${bookingId}`, {
        headers,
      });
      if (!res.ok) throw new Error("Could not download receipt.");
      const blob = await res.blob();
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
          <Link className="button" to="/farmer">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-center fade-up">
      <div className="card" style={{ maxWidth: "560px", width: "100%" }}>
        <div className="row-between" style={{ marginBottom: "16px" }}>
          <div>
            <p className="eyebrow">Booking Receipt</p>
            <h2 style={{ margin: 0 }}>AgriVault Quality Summary</h2>
          </div>
          <span className={`badge status-${booking.status || "pending"}`}>{booking.status || "pending"}</span>
        </div>

        <div className="receipt-meta">
          <div className="receipt-row"><span>Farmer</span><strong>{booking.farmerName || "N/A"}</strong></div>
          <div className="receipt-row"><span>Warehouse</span><strong>{booking.warehouseName || "N/A"}</strong></div>
          <div className="receipt-row"><span>Produce</span><strong>{booking.produce || "N/A"}</strong></div>
          <div className="receipt-row"><span>Quantity</span><strong>{booking.weight || 0} quintals</strong></div>
          <div className="receipt-row"><span>Storage Period</span><strong>{booking.duration || 0} weeks</strong></div>
          <div className="receipt-row"><span>Total Cost</span><strong>Rs {Number(booking.totalPrice || 0).toLocaleString("en-IN")}</strong></div>
          <div className="receipt-row"><span>Loan Eligibility</span><strong>Rs {Number(booking.loanEligibility || 0).toLocaleString("en-IN")}</strong></div>
          {booking.gradeResult ? (
            <>
              <div className="receipt-row"><span>Grade</span><strong>{booking.gradeResult.grade}</strong></div>
              <div className="receipt-row"><span>Score</span><strong>{booking.gradeResult.score}/100</strong></div>
              <div className="receipt-row"><span>BIS Standard</span><strong>{booking.gradeResult.standard}</strong></div>
            </>
          ) : null}
        </div>

        <div className="actions">
          <button className="button" onClick={handleDownload} type="button">
            Download PDF
          </button>
          <Link className="button-secondary" to="/farmer">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}