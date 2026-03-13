import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { auth, apiBaseUrl } from "../firebase";

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

export default function Receipt() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}/receipt`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setBooking(data.booking || data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const handleDownload = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${apiBaseUrl}/api/receipt/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not download receipt.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${bookingId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <main className="auth-center fade-up">
        <div className="card" style={{ maxWidth:"520px", width:"100%" }}>
          <div className="skeleton" style={{ height:"20px", width:"120px", marginBottom:"16px" }} />
          <div className="skeleton" style={{ height:"32px", marginBottom:"24px" }} />
          <div className="skeleton" style={{ height:"14px", marginBottom:"8px" }} />
          <div className="skeleton" style={{ height:"14px", marginBottom:"8px" }} />
          <div className="skeleton" style={{ height:"14px", width:"60%" }} />
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="auth-center fade-up">
        <div className="card" style={{ maxWidth:"520px", textAlign:"center" }}>
          <span style={{ fontSize:"2.5rem" }}>&#128196;</span>
          <p className="section-title" style={{ marginTop:"12px" }}>Receipt Not Found</p>
          <p style={{ color:"var(--clr-ink-muted)", marginBottom:"1.5rem" }}>
            This booking receipt could not be loaded.
          </p>
          <Link className="button" to="/farmer">Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  const total =
    booking.totalCost ||
    (booking.sqft && booking.months ? booking.sqft * 12 * booking.months : null);

  return (
    <main className="auth-center fade-up">
      <div className="card" style={{ maxWidth:"520px", width:"100%" }}>
        {/* Receipt Header */}
        <div className="row-between" style={{ marginBottom:"var(--space-md)" }}>
          <div>
            <p className="eyebrow">Booking Receipt</p>
            <h2 style={{ margin:0, fontSize:"1.3rem" }}>AgriVault Storage</h2>
          </div>
          <span className={`badge status-${booking.status || "pending"}`}>
            {booking.status || "pending"}
          </span>
        </div>

        <div className="receipt-divider" />

        {/* Details */}
        <div className="receipt-meta">
          {booking.farmerName && (
            <div className="receipt-row">
              <span style={{ color:"var(--clr-ink-muted)" }}>Farmer</span>
              <span style={{ fontWeight:600 }}>{booking.farmerName}</span>
            </div>
          )}
          {booking.warehouseName && (
            <div className="receipt-row">
              <span style={{ color:"var(--clr-ink-muted)" }}>Warehouse</span>
              <span style={{ fontWeight:600 }}>{booking.warehouseName}</span>
            </div>
          )}
          {booking.produce && (
            <div className="receipt-row">
              <span style={{ color:"var(--clr-ink-muted)" }}>Produce</span>
              <span style={{ fontWeight:600, textTransform:"capitalize" }}>{booking.produce}</span>
            </div>
          )}
          {booking.weight && (
            <div className="receipt-row">
              <span style={{ color:"var(--clr-ink-muted)" }}>Quantity</span>
              <span style={{ fontWeight:600 }}>{booking.weight} tonnes</span>
            </div>
          )}
          {booking.createdAt && (
            <div className="receipt-row">
              <span style={{ color:"var(--clr-ink-muted)" }}>Date</span>
              <span style={{ fontWeight:600 }}>{new Date(booking.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          )}
          {booking.duration && (
            <div className="receipt-row">
              <span style={{ color:"var(--clr-ink-muted)" }}>Duration</span>
              <span style={{ fontWeight:600 }}>{booking.duration} month{booking.duration > 1 ? "s" : ""}</span>
            </div>
          )}
          {booking.sqft && (
            <div className="receipt-row">
              <span style={{ color:"var(--clr-ink-muted)" }}>Space Used</span>
              <span style={{ fontWeight:600 }}>{booking.sqft} sq ft</span>
            </div>
          )}
          {total != null && (
            <div className="receipt-row total">
              <span>Total Cost</span>
              <span>&#8377;{Number(total).toLocaleString("en-IN")}</span>
            </div>
          )}
        </div>

        <div className="receipt-divider" />

        {/* Booking ID */}
        <p style={{ fontSize:"0.75rem", color:"var(--clr-ink-faint)", marginBottom:"var(--space-md)" }}>
          Booking ID: {bookingId}
        </p>

        {/* Actions */}
        <div className="actions">
          <button className="button" onClick={handleDownload} type="button">
            &#8595; Download PDF
          </button>
          <Link className="button-secondary" to="/farmer">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
