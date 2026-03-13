import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { auth, apiBaseUrl } from "../firebase";
import MapView from "../components/MapView";
import WarehouseCard from "../components/WarehouseCard";

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("storage");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingBk, setLoadingBk] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiBaseUrl}/api/warehouses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setWarehouses(data.warehouses || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoadingWh(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeTab !== "bookings") return;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiBaseUrl}/api/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setBookings(data.bookings || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoadingBk(false);
      }
    })();
  }, [activeTab]);

  const handleBook = (warehouse) => {
    navigate(`/book?warehouseId=${warehouse.id}`);
  };

  return (
    <main className="page fade-up">
      {/* Tabs */}
      <div className="row-between">
        <div>
          <p className="eyebrow">Farmer Dashboard</p>
          <h2 style={{ margin: 0 }}>Find &amp; Manage Storage</h2>
        </div>
        <div className="tab-strip">
          <button
            className={`inner-tab${activeTab === "storage" ? " active" : ""}`}
            onClick={() => setActiveTab("storage")}
            type="button"
          >
            &#128205; Find Storage
          </button>
          <button
            className={`inner-tab${activeTab === "bookings" ? " active" : ""}`}
            onClick={() => setActiveTab("bookings")}
            type="button"
          >
            &#128203; My Bookings
          </button>
        </div>
      </div>

      {/* Find Storage */}
      {activeTab === "storage" && (
        <section className="page two-column">
          {/* Left: Cards */}
          <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            <p className="section-subtitle">
              {loadingWh
                ? "Loading nearby warehouses..."
                : `${warehouses.length} warehouse${warehouses.length !== 1 ? "s" : ""} found`}
            </p>
            {loadingWh ? (
              <>
                <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
                <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
              </>
            ) : warehouses.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <span className="empty-state-icon">&#127981;</span>
                  <p className="empty-state-title">No warehouses found</p>
                  <p className="empty-state-sub">Check back later or try a different area.</p>
                </div>
              </div>
            ) : (
              warehouses.map((w) => (
                <WarehouseCard
                  key={w.id}
                  warehouse={w}
                  onBook={handleBook}
                />
              ))
            )}
          </div>

          {/* Right: Map */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <MapView
              warehouses={warehouses}
              onBook={handleBook}
            />
          </div>
        </section>
      )}

      {/* My Bookings */}
      {activeTab === "bookings" && (
        <section style={{ display: "grid", gap: "16px" }}>
          {loadingBk ? (
            <>
              <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
              <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
            </>
          ) : bookings.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">&#128203;</span>
                <p className="empty-state-title">No bookings yet</p>
                <p className="empty-state-sub">Find a warehouse and book your first slot.</p>
                <button
                  className="button"
                  onClick={() => setActiveTab("storage")}
                  style={{ marginTop: "12px" }}
                  type="button"
                >
                  Browse Warehouses
                </button>
              </div>
            </div>
          ) : (
            bookings.map((booking) => (
              <article className="booking-card" key={booking.id}>
                <div className="booking-card-header">
                  <div>
                    <p className="booking-card-title">{booking.warehouseName || "Warehouse"}</p>
                    <div className="booking-card-meta">
                      <span>&#127807; {booking.produce}</span>
                      <span>&#128203; {booking.quantity} tonnes</span>
                      {booking.startDate && <span>&#128197; {booking.startDate}</span>}
                    </div>
                  </div>
                  <span className={`badge status-${booking.status}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="booking-card-actions">
                  {booking.status === "confirmed" && (
                    <button
                      className="button-secondary button-ghost"
                      onClick={() => navigate(`/grade/${booking.id}`)}
                      type="button"
                    >
                      &#129302; Grade Produce
                    </button>
                  )}
                  <button
                    className="button-ghost"
                    onClick={() => navigate(`/receipt/${booking.id}`)}
                    type="button"
                  >
                    &#128196; View Receipt
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
