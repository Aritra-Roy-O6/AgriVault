import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";

function canOpenReceipt(status) {
  return ["confirmed", "completed"].includes(status);
}

export default function BusinessDashboard({ loading: sessionLoading, user }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading || !user) {
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/bookings/farmer/${user.uid}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load bookings.");
        setBookings(data.bookings || []);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionLoading, user]);

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [bookings]
  );

  return (
    <main className="page fade-up dashboard-theme dashboard-theme-business">
      <div className="dashboard-hero dashboard-hero-business">
        <div>
          <p className="eyebrow">Business Dashboard</p>
          <h2 style={{ margin: 0 }}>Manage bookings, renewals, and receipts</h2>
        </div>
        <div className="actions">
          <button className="button" onClick={() => navigate("/search")} type="button">
            Find Storage
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
          <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
        </>
      ) : sortedBookings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">Inventory</span>
            <p className="empty-state-title">No storage bookings yet</p>
            <p className="empty-state-sub">Search spaces by category, size, and location to book your first storage slot.</p>
          </div>
        </div>
      ) : (
        sortedBookings.map((booking) => (
          <article className="booking-card" key={booking.id}>
            <div className="booking-card-header">
              <div>
                <p className="booking-card-title">{booking.warehouseName || "Storage Space"}</p>
                <div className="booking-card-meta">
                  <span>{booking.produce || booking.storageCategory || "General goods"}</span>
                  <span>{booking.sqft || 0} sq ft</span>
                  <span>Rs {Number(booking.totalPrice || 0).toLocaleString("en-IN")}</span>
                  <span>{new Date(booking.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
                {booking.bookerNote ? <p className="section-subtitle" style={{ margin: "8px 0 0" }}>Your note: {booking.bookerNote}</p> : null}
                {booking.ownerResponseNote ? <p className="section-subtitle" style={{ margin: "6px 0 0" }}>Owner reply: {booking.ownerResponseNote}</p> : null}
              </div>
              <span className={`badge status-${booking.status}`}>{booking.status}</span>
            </div>
            <div className="booking-card-actions">
              {canOpenReceipt(booking.status) ? (
                <button className="button-ghost" onClick={() => navigate(`/receipt/${booking.id}`)} type="button">
                  View Receipt
                </button>
              ) : null}
              <button className="button-secondary" onClick={() => navigate(`/book?warehouseId=${booking.warehouseId}`)} type="button">
                Renew / Rebook
              </button>
            </div>
          </article>
        ))
      )}
    </main>
  );
}
