import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";
import { getCategoryLabel, supportedStorageCategories } from "../storageMath";
import { environmentTagOptions } from "../storageRules";

const emptyWarehouseForm = {
  name: "",
  address: "",
  pincode: "",
  lat: "",
  lng: "",
  totalSqft: "",
  availableSqft: "",
  heightFt: "10",
  pricePerSqft: "",
  spaceType: "warehouse bay",
  supportedCategories: [],
  environmentTags: [],
  pricingUnit: "monthly",
};

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-IN");
}

function getEnvironmentLabel(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace("cool", "cold");
  return environmentTagOptions.find((option) => option.value === normalized)?.label || value;
}

function buildReportMailTo(booking) {
  const subject = encodeURIComponent(`VaultX report for booking ${booking.id}`);
  const body = encodeURIComponent(
    [
      `Booking ID: ${booking.id}`,
      `Customer name: ${booking.farmerName || "N/A"}`,
      `Customer role: ${booking.buyerRole || "N/A"}`,
      `Customer email: ${booking.buyerEmail || "N/A"}`,
      `Storage space: ${booking.warehouseName || "N/A"}`,
      `Issue details:`,
      "",
    ].join("\n")
  );

  return `mailto:contact.aritra2006@gmail.com?subject=${subject}&body=${body}`;
}

function BookingModal({ booking, onClose, onUpdateStatus }) {
  if (!booking) {
    return null;
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="row-between" style={{ marginBottom: "12px" }}>
          <div>
            <p className="eyebrow">Booking Details</p>
            <h3 style={{ margin: 0 }}>{booking.farmerName || "Customer"}</h3>
          </div>
          <button className="button-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="modal-detail-grid">
          <div className="receipt-meta booking-details-panel" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
            <div className="receipt-row"><span>Booking ID</span><strong>{booking.id}</strong></div>
            <div className="receipt-row"><span>Status</span><strong>{booking.status}</strong></div>
            <div className="receipt-row"><span>Buyer Type</span><strong>{booking.buyerRole || "N/A"}</strong></div>
            <div className="receipt-row"><span>Buyer Email</span><strong>{booking.buyerEmail || "N/A"}</strong></div>
            <div className="receipt-row"><span>Phone</span><strong>{booking.phone || "N/A"}</strong></div>
            <div className="receipt-row"><span>Storage Space</span><strong>{booking.warehouseName || "N/A"}</strong></div>
            <div className="receipt-row"><span>Category</span><strong>{booking.produce || booking.storageCategory || "N/A"}</strong></div>
            <div className="receipt-row"><span>Stackable</span><strong>{booking.stackable ? "Yes" : "No"}</strong></div>
            <div className="receipt-row"><span>Weight / Quantity</span><strong>{booking.weight || 0}</strong></div>
            <div className="receipt-row"><span>Reserved Sq Ft</span><strong>{booking.sqft || 0}</strong></div>
            <div className="receipt-row"><span>Warehouse Height</span><strong>{Number(booking.warehouseHeightFt || 10).toFixed(1)} ft</strong></div>
            <div className="receipt-row"><span>Used Stack Height</span><strong>{Number(booking.stackHeightFt || 0).toFixed(1)} ft</strong></div>
            <div className="receipt-row"><span>Duration</span><strong>{booking.duration || 0}</strong></div>
            <div className="receipt-row"><span>Start Date</span><strong>{formatDate(booking.startDate)}</strong></div>
            <div className="receipt-row"><span>Created At</span><strong>{formatDate(booking.createdAt)}</strong></div>
            <div className="receipt-row"><span>Total Price</span><strong>Rs {Number(booking.totalPrice || 0).toLocaleString("en-IN")}</strong></div>
            {booking.buyerRating?.score ? (
              <div className="receipt-row"><span>Buyer Rating</span><strong>{booking.buyerRating.score} / 5</strong></div>
            ) : null}
            {Number(booking.loanEligibility || 0) > 0 ? <div className="receipt-row"><span>Loan Eligibility</span><strong>Rs {Number(booking.loanEligibility || 0).toLocaleString("en-IN")}</strong></div> : null}
            {booking.gradeResult ? (
              <>
                <div className="receipt-row"><span>Grade</span><strong>{booking.gradeResult.grade || "N/A"}</strong></div>
                <div className="receipt-row"><span>Score</span><strong>{booking.gradeResult.score ?? booking.gradeResult.overall_quality_score ?? "N/A"}</strong></div>
                <div className="receipt-row"><span>Standard</span><strong>{booking.gradeResult.standard || booking.gradeResult.standard_reference || "N/A"}</strong></div>
                <div className="receipt-row"><span>Defects</span><strong>{booking.gradeResult.defects || "None detected"}</strong></div>
              </>
            ) : null}
          </div>

          <div className="modal-image-panel">
            {booking.bookingImage?.url ? (
              <img alt="Uploaded goods" className="modal-booking-image" src={booking.bookingImage.url} />
            ) : (
              <div className="empty-state" style={{ padding: "24px 12px" }}>
                <span className="empty-state-icon">Image</span>
                <p className="empty-state-title">No uploaded image</p>
              </div>
            )}
          </div>
        </div>

        <div className="booking-card-actions" style={{ marginTop: "16px" }}>
          {booking.status === "pending" ? (
            <>
              <button className="button" onClick={() => onUpdateStatus(booking.id, "confirmed")} type="button">
                Confirm
              </button>
              <button className="button-secondary button-danger" onClick={() => onUpdateStatus(booking.id, "rejected")} type="button">
                Reject
              </button>
            </>
          ) : null}
          {["confirmed", "completed"].includes(booking.status) ? (
            <a className="button-ghost" href={buildReportMailTo(booking)}>
              Report Buyer
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function OwnerDashboard({ loading: sessionLoading, user }) {
  const locationImageRef = useRef(null);
  const [activeTab, setActiveTab] = useState("listings");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [form, setForm] = useState(emptyWarehouseForm);
  const [saving, setSaving] = useState(false);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingBk, setLoadingBk] = useState(false);
  const [locationImageFile, setLocationImageFile] = useState(null);
  const [locationImagePreview, setLocationImagePreview] = useState(null);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleMultiSelect = (fieldName, value) => {
    setForm((current) => {
      const currentValues = current[fieldName] || [];
      return {
        ...current,
        [fieldName]: currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });
  };

  useEffect(() => {
    if (sessionLoading || !user) {
      return;
    }

    (async () => {
      setLoadingWh(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/warehouses/owner/${user.uid}`, { headers });
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
        const res = await fetch(`${apiBaseUrl}/api/bookings/owner/${user.uid}`, { headers });
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

  useEffect(() => () => {
    if (locationImagePreview) {
      URL.revokeObjectURL(locationImagePreview);
    }
  }, [locationImagePreview]);

  const handleLocationImage = (nextFile) => {
    if (!nextFile) {
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      toast.error("Only image files are allowed for location photos.");
      return;
    }

    if (locationImagePreview) {
      URL.revokeObjectURL(locationImagePreview);
    }

    setLocationImageFile(nextFile);
    setLocationImagePreview(URL.createObjectURL(nextFile));
  };

  const uploadLocationImage = async (headers) => {
    if (!locationImageFile) {
      throw new Error("Upload a location image before listing the space.");
    }

    const formData = new FormData();
    formData.append("image", locationImageFile);
    formData.append("folder", "vaultx/listings");

    const response = await fetch(`${apiBaseUrl}/api/uploads/image`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to upload location image.");
    }

    return data.asset;
  };

  const resetListingForm = () => {
    if (locationImagePreview) {
      URL.revokeObjectURL(locationImagePreview);
    }
    setForm(emptyWarehouseForm);
    setLocationImageFile(null);
    setLocationImagePreview(null);
    if (locationImageRef.current) {
      locationImageRef.current.value = "";
    }
  };

  const handleAddWarehouse = async (event) => {
    event.preventDefault();

    if (!form.supportedCategories.length) {
      toast.error("Select at least one supported category.");
      return;
    }

    if (!form.environmentTags.length) {
      toast.error("Select at least one environment tag.");
      return;
    }

    if (!locationImageFile) {
      toast.error("Upload a location picture for the space.");
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const locationImage = await uploadLocationImage(headers);
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
          heightFt: parseFloat(form.heightFt),
          pricePerSqft: parseFloat(form.pricePerSqft),
          spaceType: form.spaceType,
          supportedCategories: form.supportedCategories,
          produces: form.supportedCategories,
          environmentTags: form.environmentTags,
          pricingUnit: form.pricingUnit,
          locationImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to create listing.");
      setWarehouses((prev) => [...prev, data.warehouse]);
      resetListingForm();
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
      setSelectedBooking((current) => (current?.id === bookingId ? { ...current, status } : current));
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
              warehouses.map((warehouse) => {
                const categories = warehouse.supportedCategories || warehouse.produces || [];
                const environmentTags = warehouse.environmentTags || [];

                return (
                  <div className="card" key={warehouse.id}>
                    {warehouse.locationImage?.url ? (
                      <img alt="Storage location" className="listing-photo" src={warehouse.locationImage.url} />
                    ) : null}
                    <div className="wcard-header" style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                        <div className="wcard-icon">Space</div>
                        <div>
                          <p className="wcard-name">{warehouse.name}</p>
                          <p className="wcard-address">{warehouse.address}</p>
                          <p className="section-subtitle" style={{ margin: "6px 0 0" }}>
                            {warehouse.spaceType || "storage space"} | {environmentTags.map(getEnvironmentLabel).join(", ") || "general conditions"} | {warehouse.heightFt || 10} ft high
                          </p>
                        </div>
                      </div>
                      <span className={warehouse.availableSqft > 0 ? "badge status-confirmed" : "badge status-rejected"}>
                        {warehouse.availableSqft > 0 ? "Active" : "Full"}
                      </span>
                    </div>
                    <div className="wcard-stats">
                      <div className="wcard-stat"><span className="wcard-stat-label">Available</span><span className="wcard-stat-value">{warehouse.availableSqft} sq ft</span></div>
                      <div className="wcard-stat"><span className="wcard-stat-label">Total</span><span className="wcard-stat-value">{warehouse.sqft} sq ft</span></div>
                      <div className="wcard-stat"><span className="wcard-stat-label">Height</span><span className="wcard-stat-value">{warehouse.heightFt || 10} ft</span></div>
                      <div className="wcard-stat"><span className="wcard-stat-label">Pricing</span><span className="wcard-stat-value">Rs {warehouse.pricePerSqft}/{warehouse.pricingUnit || "month"}</span></div>
                      {Number(warehouse.ratingCount || 0) > 0 ? <div className="wcard-stat"><span className="wcard-stat-label">Rating</span><span className="wcard-stat-value">{Number(warehouse.rating || 0).toFixed(1)}/5</span></div> : null}
                    </div>
                    {categories.length ? (
                      <div className="listing-detail-block">
                        <p className="listing-detail-label">Supported Categories</p>
                        <div className="chip-row">
                          {categories.map((category) => (
                            <span className="chip" key={category}>{getCategoryLabel(category)}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {environmentTags.length ? (
                      <div className="listing-detail-block">
                        <p className="listing-detail-label">Environment Tags</p>
                        <div className="check-chip-row">
                          {environmentTags.map((tag) => (
                            <span className="check-chip" key={tag}>{getEnvironmentLabel(tag)}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
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
                  Clear Height (ft)
                  <input name="heightFt" onChange={updateForm} placeholder="10" required step="0.1" type="number" value={form.heightFt} />
                </label>
                <label>
                  Price per Sq Ft
                  <input name="pricePerSqft" onChange={updateForm} placeholder="12" required step="0.1" type="number" value={form.pricePerSqft} />
                </label>
              </div>
              <label>
                Pricing Unit
                <select name="pricingUnit" onChange={updateForm} value={form.pricingUnit}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>

              <fieldset className="field option-fieldset">
                <legend>Supported Categories</legend>
                <p className="field-hint">Pick the categories this space can safely store.</p>
                <div className="option-grid">
                  {supportedStorageCategories.map((category) => (
                    <label className="checkbox-item option-card" key={category}>
                      <input
                        checked={form.supportedCategories.includes(category)}
                        onChange={() => toggleMultiSelect("supportedCategories", category)}
                        type="checkbox"
                      />
                      <span>{getCategoryLabel(category)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="field option-fieldset">
                <legend>Environment Tags</legend>
                <p className="field-hint">Add the conditions buyers can expect in this space.</p>
                <div className="option-grid">
                  {environmentTagOptions.map((option) => (
                    <label className="checkbox-item option-card" key={option.value}>
                      <input
                        checked={form.environmentTags.includes(option.value)}
                        onChange={() => toggleMultiSelect("environmentTags", option.value)}
                        type="checkbox"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <span>Location Picture</span>
                <div className="upload-zone owner-upload-zone" onClick={() => locationImageRef.current?.click()}>
                  {locationImagePreview ? (
                    <img alt="Location preview" className="upload-preview-image" src={locationImagePreview} />
                  ) : (
                    <>
                      <span className="upload-zone-icon">Upload</span>
                      <p style={{ fontWeight: 700, margin: 0 }}>Add a clear photo of the space</p>
                      <p style={{ fontSize: "0.8rem", margin: 0 }}>This image will be shown to farmers and businesses.</p>
                    </>
                  )}
                  <input
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={(event) => handleLocationImage(event.target.files?.[0])}
                    ref={locationImageRef}
                    style={{ display: "none" }}
                    type="file"
                  />
                </div>
              </div>

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
                <button className="booking-card-toggle" onClick={() => setSelectedBooking(booking)} type="button">
                  <div className="booking-card-header">
                    <div>
                      <p className="booking-card-title">{booking.farmerName || "Customer"} - {booking.warehouseName || "Storage Space"}</p>
                      <div className="booking-card-meta">
                        <span>{booking.buyerRole || "customer"}</span>
                        <span>{booking.produce || booking.storageCategory || "general goods"}</span>
                        <span>{booking.weight || booking.sqft || 0}</span>
                        <span>{booking.stackable ? "Stackable" : "Non-stackable"}</span>
                        <span>{formatDate(booking.createdAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span className={`badge status-${booking.status}`}>{booking.status}</span>
                      <span className="booking-expand-indicator">Open</span>
                    </div>
                  </div>
                </button>

                <div className="booking-card-actions">
                  {booking.status === "pending" ? (
                    <>
                      <button className="button" onClick={() => updateBookingStatus(booking.id, "confirmed")} type="button">Confirm</button>
                      <button className="button-secondary button-danger" onClick={() => updateBookingStatus(booking.id, "rejected")} type="button">Reject</button>
                    </>
                  ) : null}
                  {["confirmed", "completed"].includes(booking.status) ? (
                    <a className="button-ghost" href={buildReportMailTo(booking)}>
                      Report Buyer
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onUpdateStatus={updateBookingStatus} />
    </main>
  );
}

