import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";

const emptyWarehouseForm = {
  name: "",
  address: "",
  pincode: "",
  lat: "",
  lng: "",
  totalSqft: "",
  availableSqft: "",
  pricePerSqft: "",
  spaceType: "warehouse bay",
  supportedCategories: "",
  environmentTags: "",
  accessHours: "business hours",
  pricingUnit: "monthly",
};

export default function OwnerDashboard({ loading: sessionLoading, user }) {
  const [activeTab, setActiveTab] = useState("listings");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(emptyWarehouseForm);
  const [saving, setSaving] = useState(false);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingBk, setLoadingBk] = useState(false);

  const updateForm = (e) =>
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  useEffect(() => {
    if (sessionLoading || !user) {
      return;
    }

    (async () => {
      setLoadingWh(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/warehouses/owner/${user.uid}`, {
          headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load listings.");
        setWarehouses(data.warehouses || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoadingWh(false);
      }
    })();
  }, [sessionLoading, user]);

  useEffect(() => {
    if (sessionLoading || !user || activeTab !== "bookings") {
      return;
    }

    (async () => {
      setLoadingBk(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/bookings/owner/${user.uid}`, {
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

  const handleAddWarehouse = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBaseUrl}/api/warehouses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          pincode: form.pincode,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          sqft: parseInt(form.totalSqft, 10),
          availableSqft: parseInt(form.availableSqft, 10),
          pricePerSqft: parseFloat(form.pricePerSqft),
          spaceType: form.spaceType,
          supportedCategories: form.supportedCategories,
          produces: form.supportedCategories,
          environmentTags: form.environmentTags,
          accessHours: form.accessHours,
          pricingUnit: form.pricingUnit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to create listing.");
      setWarehouses((prev) => [...prev, data.warehouse]);
      setForm(emptyWarehouseForm);
      toast.success("Storage space listed.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to update booking.");
      setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)));
      toast.success(`Booking ${status}.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
  const sortedBookings = useMemo(() => {
    const order = { pending: 0, confirmed: 1, completed: 2, rejected: 3 };
    return [...bookings].sort((a, b) => {
      const first = order[a.status] ?? 9;
      const second = order[b.status] ?? 9;
      if (first !== second) return first - second;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [bookings]);

  return (
    <main className="page fade-up dashboard-theme dashboard-theme-owner">
      <div className="dashboard-hero dashboard-hero-business">
        <div>
          <p className="eyebrow">Owner Dashboard</p>
          <h2 style={{ margin: 0 }}>Manage listings and review incoming bookings</h2>
        </div>
        <div className="tab-strip">
          <button className={`inner-tab${activeTab === "listings" ? " active" : ""}`} onClick={() => setActiveTab("listings")} type="button">
            My Listings
            {warehouses.length > 0 ? <span className="badge badge-muted dashboard-count-chip">{warehouses.length}</span> : null}
          </button>
          <button className={`inner-tab${activeTab === "bookings" ? " active" : ""}`} onClick={() => setActiveTab("bookings")} type="button">
            Bookings
            {pendingCount > 0 ? <span className="badge status-pending dashboard-count-chip">{pendingCount}</span> : null}
          </button>
        </div>
      </div>

      {activeTab === "listings" ? (
        <section className="page two-column">
          <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            <p className="section-subtitle">{loadingWh ? "Loading listings..." : `${warehouses.length} space${warehouses.length !== 1 ? "s" : ""} listed`}</p>
            {loadingWh ? (
              <>
                <div className="skeleton" style={{ height: "150px", borderRadius: "16px" }} />
                <div className="skeleton" style={{ height: "150px", borderRadius: "16px" }} />
              </>
            ) : warehouses.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <span className="empty-state-icon">Space</span>
                  <p className="empty-state-title">No listings yet</p>
                  <p className="empty-state-sub">Use the form to list your first room, garage, godown, or warehouse bay.</p>
                </div>
              </div>
            ) : (
              warehouses.map((warehouse) => (
                <div className="card" key={warehouse.id}>
                  <div className="wcard-header" style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                      <div className="wcard-icon">Space</div>
                      <div>
                        <p className="wcard-name">{warehouse.name}</p>
                        <p className="wcard-address">{warehouse.address}</p>
                        <p className="section-subtitle" style={{ margin: "6px 0 0" }}>
                          {warehouse.spaceType || "storage space"} · {(warehouse.environmentTags || []).join(", ") || "general conditions"}
                        </p>
                      </div>
                    </div>
                    <span className={warehouse.availableSqft > 0 ? "badge status-confirmed" : "badge status-rejected"}>
                      {warehouse.availableSqft > 0 ? "Active" : "Full"}
                    </span>
                  </div>
                  <div className="wcard-stats">
                    <div className="wcard-stat">
                      <span className="wcard-stat-label">Available</span>
                      <span className="wcard-stat-value">{warehouse.availableSqft} sq ft</span>
                    </div>
                    <div className="wcard-stat">
                      <span className="wcard-stat-label">Total</span>
                      <span className="wcard-stat-value">{warehouse.sqft} sq ft</span>
                    </div>
                    <div className="wcard-stat">
                      <span className="wcard-stat-label">Pricing</span>
                      <span className="wcard-stat-value">Rs {warehouse.pricePerSqft}/{warehouse.pricingUnit || "month"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <p className="eyebrow">List a Space</p>
            <h3 style={{ marginBottom: "1rem" }}>Add new storage inventory</h3>
            <form className="form-grid" onSubmit={handleAddWarehouse}>
              <label>
                Space Name
                <input name="name" onChange={updateForm} placeholder="e.g. Shop Basement near Market Road" required value={form.name} />
              </label>
              <label>
                Full Address
                <input name="address" onChange={updateForm} placeholder="Street, City, State" required value={form.address} />
              </label>
              <div className="form-row">
                <label>
                  Pincode
                  <input name="pincode" onChange={updateForm} placeholder="700001" required value={form.pincode} />
                </label>
                <label>
                  Space Type
                  <select name="spaceType" onChange={updateForm} value={form.spaceType}>
                    <option value="spare room">Spare room</option>
                    <option value="garage">Garage / shed</option>
                    <option value="shop basement">Shop basement</option>
                    <option value="godown">Godown</option>
                    <option value="warehouse bay">Warehouse bay</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Latitude
                  <input name="lat" onChange={updateForm} placeholder="22.5726" required step="any" type="number" value={form.lat} />
                </label>
                <label>
                  Longitude
                  <input name="lng" onChange={updateForm} placeholder="88.3639" required step="any" type="number" value={form.lng} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Total Sq Ft
                  <input name="totalSqft" onChange={updateForm} placeholder="5000" required type="number" value={form.totalSqft} />
                </label>
                <label>
                  Available Sq Ft
                  <input name="availableSqft" onChange={updateForm} placeholder="3000" required type="number" value={form.availableSqft} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Price per Sq Ft
                  <input name="pricePerSqft" onChange={updateForm} placeholder="12" required step="0.1" type="number" value={form.pricePerSqft} />
                </label>
                <label>
                  Pricing Unit
                  <select name="pricingUnit" onChange={updateForm} value={form.pricingUnit}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
              </div>
              <label>
                Supported Categories
                <input name="supportedCategories" onChange={updateForm} placeholder="clothes, electronics, grains" required value={form.supportedCategories} />
              </label>
              <label>
                Environment Tags
                <input name="environmentTags" onChange={updateForm} placeholder="dry, secure, covered" required value={form.environmentTags} />
              </label>
              <label>
                Access Hours
                <select name="accessHours" onChange={updateForm} value={form.accessHours}>
                  <option value="business hours">Business hours</option>
                  <option value="extended hours">Extended hours</option>
                  <option value="24/7">24/7</option>
                </select>
              </label>
              <button className="button" disabled={saving} type="submit" style={{ marginTop: "4px" }}>
                {saving ? "Saving..." : "List Space"}
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section style={{ display: "grid", gap: "16px" }}>
          {loadingBk ? (
            <>
              <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
              <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
            </>
          ) : sortedBookings.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">Bookings</span>
                <p className="empty-state-title">No bookings yet</p>
                <p className="empty-state-sub">Requests from businesses and farmers will appear here.</p>
              </div>
            </div>
          ) : (
            sortedBookings.map((booking) => (
              <article className="booking-card" key={booking.id}>
                <div className="booking-card-header">
                  <div>
                    <p className="booking-card-title">{booking.farmerName || "Customer"} - {booking.warehouseName || "Storage Space"}</p>
                    <div className="booking-card-meta">
                      <span>{booking.produce || booking.storageCategory || "general goods"}</span>
                      <span>{booking.weight || booking.sqft || 0}</span>
                      <span>{new Date(booking.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                  <span className={`badge status-${booking.status}`}>{booking.status}</span>
                </div>
                {booking.status === "pending" ? (
                  <div className="booking-card-actions">
                    <button className="button" onClick={() => updateBookingStatus(booking.id, "confirmed")} type="button">
                      Confirm
                    </button>
                    <button className="button-secondary button-danger" onClick={() => updateBookingStatus(booking.id, "rejected")} type="button">
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
