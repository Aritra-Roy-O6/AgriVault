import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";
import MapView from "../components/MapView";
import WarehouseCard from "../components/WarehouseCard";

export default function FarmerDashboard({ loading: sessionLoading, user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("storage");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingBk, setLoadingBk] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingWh(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/warehouses`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load warehouses.");
        setWarehouses(data.warehouses || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoadingWh(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (sessionLoading || !user || activeTab !== "bookings") {
      return;
    }

    (async () => {
      setLoadingBk(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/bookings/farmer/${user.uid}`, {
          headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load bookings.");
        setBookings(data.bookings || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoadingBk(false);
      }
    })();
  }, [activeTab, sessionLoading, user]);

  const handleBook = (warehouse) => {
    navigate(`/book?warehouseId=${warehouse.id}`);
  };

  return (
    <main className="page fade-up">
      <div className="row-between">
        <div>
          <p className="eyebrow">Farmer Dashboard</p>
          <h2 style={{ margin: 0 }}>Find and Manage Storage</h2>
        </div>
        <div className="tab-strip">
          <button className={`inner-tab${activeTab === "storage" ? " active" : ""}`} onClick={() => setActiveTab("storage")} type="button">
            Find Storage
          </button>
          <button className={`inner-tab${activeTab === "bookings" ? " active" : ""}`} onClick={() => setActiveTab("bookings")} type="button">
            My Bookings
          </button>
        </div>
      </div>

      {activeTab === "storage" ? (
        <section className="page two-column">
          <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            <p className="section-subtitle">
              {loadingWh ? "Loading nearby warehouses..." : `${warehouses.length} warehouse${warehouses.length !== 1 ? "s" : ""} found`}
            </p>
            {loadingWh ? (
              <>
                <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
                <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
              </>
            ) : warehouses.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <span className="empty-state-icon">Warehouse</span>
                  <p className="empty-state-title">No warehouses found</p>
                  <p className="empty-state-sub">Check back later or try a different area.</p>
                </div>
              </div>
            ) : (
              warehouses.map((w) => <WarehouseCard key={w.id} onBook={handleBook} warehouse={w} />)
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <MapView onBook={handleBook} warehouses={warehouses} />
          </div>
        </section>
      ) : (
        <section style={{ display: "grid", gap: "16px" }}>
          {loadingBk ? (
            <>
              <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
              <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
            </>
          ) : bookings.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">Bookings</span>
                <p className="empty-state-title">No bookings yet</p>
                <p className="empty-state-sub">Find a warehouse and book your first slot.</p>
                <button className="button" onClick={() => setActiveTab("storage")} style={{ marginTop: "12px" }} type="button">
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
                      <span>{booking.produce}</span>
                      <span>{booking.weight}</span>
                      <span>{new Date(booking.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                  <span className={`badge status-${booking.status}`}>{booking.status}</span>
                </div>
                <div className="booking-card-actions">
                  {booking.status === "confirmed" ? (
                    <button className="button-secondary button-ghost" onClick={() => navigate(`/grade/${booking.id}`)} type="button">
                      Grade Produce
                    </button>
                  ) : null}
                  <button className="button-ghost" onClick={() => navigate(`/receipt/${booking.id}`)} type="button">
                    View Receipt
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