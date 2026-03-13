import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth, apiBaseUrl } from "../firebase";

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

const emptyWarehouseForm = {
  name: "",
  address: "",
  pincode: "",
  lat: "",
  lng: "",
  totalSqft: "",
  availableSqft: "",
};

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState("listings");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(emptyWarehouseForm);
  const [saving, setSaving] = useState(false);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingBk, setLoadingBk] = useState(true);

  const updateForm = (e) =>
    setForm((c) => ({ ...c, [e.target.name]: e.target.value }));

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiBaseUrl}/api/warehouses/mine`, {
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
        const res = await fetch(`${apiBaseUrl}/api/bookings/owner`, {
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

  const handleAddWarehouse = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiBaseUrl}/api/warehouses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          totalSqft: parseInt(form.totalSqft),
          availableSqft: parseInt(form.availableSqft),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setWarehouses((prev) => [...prev, data.warehouse]);
      setForm(emptyWarehouseForm);
      toast.success("Warehouse listed!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const token = await getToken();
      const res = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
      toast.success(`Booking ${status}.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <main className="page fade-up">
      {/* Header */}
      <div className="row-between">
        <div>
          <p className="eyebrow">Owner Dashboard</p>
          <h2 style={{ margin: 0 }}>Manage Your Spaces</h2>
        </div>
        <div className="tab-strip">
          <button
            className={`inner-tab${activeTab === "listings" ? " active" : ""}`}
            onClick={() => setActiveTab("listings")}
            type="button"
          >
            &#127981; My Listings
            {warehouses.length > 0 && (
              <span className="badge badge-muted" style={{ marginLeft: "6px", padding:"2px 7px", fontSize:"0.7rem" }}>
                {warehouses.length}
              </span>
            )}
          </button>
          <button
            className={`inner-tab${activeTab === "bookings" ? " active" : ""}`}
            onClick={() => setActiveTab("bookings")}
            type="button"
          >
            &#128203; Bookings
            {pendingCount > 0 && (
              <span className="badge status-pending" style={{ marginLeft: "6px", padding:"2px 7px", fontSize:"0.7rem" }}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* LISTINGS TAB */}
      {activeTab === "listings" && (
        <section className="page two-column">
          {/* My warehouses */}
          <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
            <p className="section-subtitle">
              {loadingWh ? "Loading..." : `${warehouses.length} space${warehouses.length !== 1 ? "s" : ""} listed`}
            </p>
            {loadingWh ? (
              <>
                <div className="skeleton" style={{ height:"150px", borderRadius:"16px" }} />
                <div className="skeleton" style={{ height:"150px", borderRadius:"16px" }} />
              </>
            ) : warehouses.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <span className="empty-state-icon">&#127981;</span>
                  <p className="empty-state-title">No listings yet</p>
                  <p className="empty-state-sub">Use the form to list your first warehouse space.</p>
                </div>
              </div>
            ) : (
              warehouses.map((w) => (
                <div className="card" key={w.id}>
                  <div className="wcard-header" style={{ marginBottom:"10px" }}>
                    <div style={{ display:"flex", gap:"12px", alignItems:"flex-start", flex:1 }}>
                      <div className="wcard-icon">&#127981;</div>
                      <div>
                        <p className="wcard-name">{w.name}</p>
                        <p className="wcard-address">&#128205; {w.address}</p>
                      </div>
                    </div>
                    {w.availableSqft > 0 ? (
                      <span className="badge status-confirmed">Active</span>
                    ) : (
                      <span className="badge status-rejected">Full</span>
                    )}
                  </div>
                  <div className="wcard-stats">
                    <div className="wcard-stat">
                      <span className="wcard-stat-label">Available</span>
                      <span className="wcard-stat-value">{w.availableSqft} sq ft</span>
                    </div>
                    <div className="wcard-stat">
                      <span className="wcard-stat-label">Total</span>
                      <span className="wcard-stat-value">{w.totalSqft} sq ft</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add warehouse form */}
          <div className="card">
            <p className="eyebrow">List a Space</p>
            <h3 style={{ marginBottom:"1rem" }}>Add New Warehouse</h3>
            <form className="form-grid" onSubmit={handleAddWarehouse}>
              <label>
                Space Name
                <input
                  name="name"
                  onChange={updateForm}
                  placeholder="e.g. Riverside Cold Store"
                  required
                  value={form.name}
                />
              </label>
              <label>
                Full Address
                <input
                  name="address"
                  onChange={updateForm}
                  placeholder="Street, City, State"
                  required
                  value={form.address}
                />
              </label>
              <label>
                Pincode
                <input
                  name="pincode"
                  onChange={updateForm}
                  placeholder="700001"
                  required
                  value={form.pincode}
                />
              </label>
              <div className="form-row">
                <label>
                  Latitude
                  <input
                    name="lat"
                    onChange={updateForm}
                    placeholder="22.5726"
                    required
                    type="number"
                    step="any"
                    value={form.lat}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    name="lng"
                    onChange={updateForm}
                    placeholder="88.3639"
                    required
                    type="number"
                    step="any"
                    value={form.lng}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Total Sq Ft
                  <input
                    name="totalSqft"
                    onChange={updateForm}
                    placeholder="5000"
                    required
                    type="number"
                    value={form.totalSqft}
                  />
                </label>
                <label>
                  Available Sq Ft
                  <input
                    name="availableSqft"
                    onChange={updateForm}
                    placeholder="3000"
                    required
                    type="number"
                    value={form.availableSqft}
                  />
                </label>
              </div>
              <button className="button" disabled={saving} type="submit" style={{ marginTop:"4px" }}>
                {saving ? (
                  <><span className="spinner" /> Saving...</>
                ) : (
                  "List Space"
                )}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* BOOKINGS TAB */}
      {activeTab === "bookings" && (
        <section style={{ display:"grid", gap:"16px" }}>
          {loadingBk ? (
            <>
              <div className="skeleton" style={{ height:"120px", borderRadius:"16px" }} />
              <div className="skeleton" style={{ height:"120px", borderRadius:"16px" }} />
            </>
          ) : bookings.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">&#128203;</span>
                <p className="empty-state-title">No bookings yet</p>
                <p className="empty-state-sub">Bookings from farmers will appear here.</p>
              </div>
            </div>
          ) : (
            bookings.map((booking) => (
              <article className="booking-card" key={booking.id}>
                <div className="booking-card-header">
                  <div>
                    <p className="booking-card-title">
                      {booking.farmerName || "Farmer"} &mdash; {booking.warehouseName || "Warehouse"}
                    </p>
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
                {booking.status === "pending" && (
                  <div className="booking-card-actions">
                    <button
                      className="button"
                      onClick={() => updateBookingStatus(booking.id, "confirmed")}
                      type="button"
                    >
                      &#10003; Confirm
                    </button>
                    <button
                      className="button-secondary button-danger"
                      onClick={() => updateBookingStatus(booking.id, "rejected")}
                      type="button"
                    >
                      &#10007; Reject
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
