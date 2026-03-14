import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";
import { extractGpsFromFile } from "../exifGps";
import OwnerListingForm from "../components/OwnerListingForm";
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

// Doc 1: builds a mailto link so the owner can report a buyer
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

// Merged BookingModal:
//  - Doc 1: buyer info (role, email), buyer rating, report buyer link
//  - Doc 2: price negotiation (quotedPrice), ownerResponseNote, bookerNote,
//           originalTotalPrice, updates payload on confirm/reject
function BookingModal({ booking, onClose, onUpdateStatus }) {
  const [quotedPrice, setQuotedPrice] = useState("");
  const [ownerResponseNote, setOwnerResponseNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!booking) {
      setQuotedPrice("");
      setOwnerResponseNote("");
      setSubmitting(false);
      return;
    }
    setQuotedPrice(String(booking.totalPrice || ""));
    setOwnerResponseNote(booking.ownerResponseNote || "");
    setSubmitting(false);
  }, [booking]);

  if (!booking) {
    return null;
  }

  const handleConfirm = async () => {
    const nextPrice = String(quotedPrice || booking.totalPrice || "").trim();
    if (!nextPrice) {
      toast.error("Enter a final price before confirming.");
      return;
    }

    setSubmitting(true);
    try {
      const updatedBooking = await onUpdateStatus(booking.id, "confirmed", {
        totalPrice: nextPrice,
        ownerResponseNote,
      });
      if (updatedBooking) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      const updatedBooking = await onUpdateStatus(booking.id, "rejected", { ownerResponseNote });
      if (updatedBooking) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="row-between" style={{ marginBottom: "12px" }}>
          <div>
            <p className="eyebrow">Booking Details</p>
            <h3 style={{ margin: 0 }}>{booking.farmerName || "Customer"}</h3>
          </div>
          <button className="button-ghost" disabled={submitting} onClick={onClose} type="button">
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
            {Number(booking.originalTotalPrice || 0) > 0 && Number(booking.originalTotalPrice) !== Number(booking.totalPrice || 0) ? (
              <div className="receipt-row"><span>Original Price</span><strong>Rs {Number(booking.originalTotalPrice).toLocaleString("en-IN")}</strong></div>
            ) : null}
            {booking.bookerNote ? <div className="receipt-row"><span>Booker Note</span><strong>{booking.bookerNote}</strong></div> : null}
            {booking.ownerResponseNote ? <div className="receipt-row"><span>Owner Reply</span><strong>{booking.ownerResponseNote}</strong></div> : null}
            {booking.buyerRating?.score ? (
              <div className="receipt-row"><span>Buyer Rating</span><strong>{booking.buyerRating.score} / 5</strong></div>
            ) : null}
            {Number(booking.loanEligibility || 0) > 0 ? (
              <div className="receipt-row"><span>Loan Eligibility</span><strong>Rs {Number(booking.loanEligibility || 0).toLocaleString("en-IN")}</strong></div>
            ) : null}
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

        {booking.status === "pending" ? (
          <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
            <label>
              Final price while accepting
              <input
                min="0"
                onChange={(event) => setQuotedPrice(event.target.value)}
                step="0.01"
                type="number"
                value={quotedPrice}
              />
            </label>
            <label>
              Reply to customer
              <textarea
                onChange={(event) => setOwnerResponseNote(event.target.value)}
                placeholder="Reply to the note or confirm the negotiated terms."
                rows="3"
                value={ownerResponseNote}
              />
            </label>
            <div className="booking-card-actions" style={{ marginTop: 0 }}>
              <button className="button" disabled={submitting} onClick={handleConfirm} type="button">
                {submitting ? "Confirming..." : "Confirm"}
              </button>
              <button className="button-secondary button-danger" disabled={submitting} onClick={handleReject} type="button">
                Reject
              </button>
            </div>
          </div>
        ) : null}

        { ["confirmed", "completed"].includes(booking.status) ? (
          <div className="booking-card-actions" style={{ marginTop: "16px" }}>
            <a className="button-ghost" href={buildReportMailTo(booking)}>
              Report Buyer
            </a>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export default function OwnerDashboard({ loading: sessionLoading, user }) {
  const { t } = useTranslation("owner");
  // Doc 1: refs & geotag state for location image upload
  const locationImageRef = useRef(null);
  const [locationImageFile, setLocationImageFile] = useState(null);
  const [locationImagePreview, setLocationImagePreview] = useState(null);
  const [geotagMode, setGeotagMode] = useState("pending");
  const [geotagLoading, setGeotagLoading] = useState(false);
  const [geotagMessage, setGeotagMessage] = useState(t("form.geotagUploadHint"));

  const [activeTab, setActiveTab] = useState("listings");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [form, setForm] = useState(emptyWarehouseForm);
  const [saving, setSaving] = useState(false);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingBk, setLoadingBk] = useState(false);

  useEffect(() => {
    if (geotagMode === "pending") {
      setGeotagMessage(t("form.geotagUploadHint"));
    }
  }, [geotagMode, t]);

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

  // Load owner's warehouse listings
  useEffect(() => {
    if (sessionLoading || !user) return;

    (async () => {
      setLoadingWh(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/warehouses/owner/${user.uid}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || t("toast.loadListingsFailed"));
        setWarehouses(data.warehouses || []);
      } catch (err) {
        toast.error(err.message);
      return null;
    } finally {
        setLoadingWh(false);
      }
    })();
  }, [sessionLoading, user]);

  // Load bookings when that tab is active
  useEffect(() => {
    if (sessionLoading || !user || activeTab !== "bookings") return;

    (async () => {
      setLoadingBk(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/bookings/owner/${user.uid}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || t("toast.loadBookingsFailed"));
        setBookings(data.bookings || []);
      } catch (err) {
        toast.error(err.message);
      return null;
    } finally {
        setLoadingBk(false);
      }
    })();
  }, [activeTab, sessionLoading, user]);

  // Doc 1: revoke object URL on unmount / change
  useEffect(
    () => () => {
      if (locationImagePreview) URL.revokeObjectURL(locationImagePreview);
    },
    [locationImagePreview]
  );

  // Doc 1: handle location image selection + GPS extraction
  const handleLocationImage = async (nextFile) => {
    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/")) {
      toast.error(t("toast.imageOnly"));
      return;
    }

    if (locationImagePreview) URL.revokeObjectURL(locationImagePreview);

    setLocationImageFile(nextFile);
    setLocationImagePreview(URL.createObjectURL(nextFile));
    setGeotagLoading(true);
    setGeotagMessage(t("form.geotagChecking"));

    try {
      const gpsCoordinates = await extractGpsFromFile(nextFile);
      if (gpsCoordinates) {
        setForm((current) => ({
          ...current,
          lat: String(gpsCoordinates.lat),
          lng: String(gpsCoordinates.lng),
        }));
        setGeotagMode("auto");
        setGeotagMessage(t("form.geotagFound", { lat: gpsCoordinates.lat, lng: gpsCoordinates.lng }));
        toast.success(t("toast.geotagFound"));
        return;
      }

      setForm((current) => ({ ...current, lat: "", lng: "" }));
      setGeotagMode("manual");
      setGeotagMessage(t("form.geotagMissing"));
      toast(t("toast.geotagMissing"));
    } catch (_error) {
      setForm((current) => ({ ...current, lat: "", lng: "" }));
      setGeotagMode("manual");
      setGeotagMessage(t("form.geotagError"));
      toast(t("toast.geotagError"));
    } finally {
      setGeotagLoading(false);
    }
  };

  // Doc 1: upload location image to server, return asset
  const uploadLocationImage = async (headers) => {
    if (!locationImageFile) {
      throw new Error(t("toast.uploadBeforeListing"));
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
    if (!response.ok) throw new Error(data.message || t("toast.uploadFailed"));
    return data.asset;
  };

  // Doc 1: reset the listing form including image / geotag state
  const resetListingForm = () => {
    if (locationImagePreview) URL.revokeObjectURL(locationImagePreview);
    setForm(emptyWarehouseForm);
    setLocationImageFile(null);
    setLocationImagePreview(null);
    setGeotagMode("pending");
    setGeotagLoading(false);
    setGeotagMessage(t("form.geotagUploadHint"));
    if (locationImageRef.current) locationImageRef.current.value = "";
  };

  // Merged: Doc 1 validation + image upload; Doc 2 clears form via resetListingForm
  const handleAddWarehouse = async (event) => {
    event.preventDefault();

    if (!form.supportedCategories.length) {
      toast.error(t("toast.selectCategory"));
      return;
    }
    if (!form.environmentTags.length) {
      toast.error(t("toast.selectEnvironment"));
      return;
    }
    if (!locationImageFile) {
      toast.error(t("toast.uploadPicture"));
      return;
    }
    if (!form.lat || !form.lng) {
      toast.error(t("toast.addCoordinates"));
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const locationImage = await uploadLocationImage(headers);

      const res = await fetch(`${apiBaseUrl}/api/warehouses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
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
      if (!res.ok) throw new Error(data.message || t("toast.createFailed"));
      setWarehouses((prev) => [...prev, data.warehouse]);
      resetListingForm();
      toast.success(t("toast.listed"));
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Merged: Doc 2 accepts extra `updates` payload (price, note); uses server response for optimistic update
  const updateBookingStatus = async (bookingId, status, updates = {}) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to update booking.");
      // Doc 2: use server-returned booking object so negotiated price / note are reflected
      setBookings((prev) =>
        prev.map((booking) => (booking.id === bookingId ? data.booking : booking))
      );
      setSelectedBooking((current) =>
        current?.id === bookingId ? data.booking : current
      );
      toast.success(`Booking ${status}.`);
      return data.booking;
    } catch (err) {
      toast.error(err.message);
      return null;
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
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h2 style={{ margin: 0 }}>{t("dashboard.title")}</h2>
        </div>
        <div className="tab-strip">
          <button
            className={`inner-tab${activeTab === "listings" ? " active" : ""}`}
            onClick={() => setActiveTab("listings")}
            type="button"
          >
            {t("dashboard.listings")}
            {warehouses.length > 0 ? (
              <span className="badge badge-muted dashboard-count-chip">{warehouses.length}</span>
            ) : null}
          </button>
          <button
            className={`inner-tab${activeTab === "bookings" ? " active" : ""}`}
            onClick={() => setActiveTab("bookings")}
            type="button"
          >
            {t("dashboard.bookings")}
            {pendingCount > 0 ? (
              <span className="badge status-pending dashboard-count-chip">{pendingCount}</span>
            ) : null}
          </button>
        </div>
      </div>

      {activeTab === "listings" ? (
        <section className="page two-column">
          {/* Left column: listing cards */}
          <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            <p className="section-subtitle">
              {loadingWh ? t("dashboard.loadingListings") : t("dashboard.listedCount", { count: warehouses.length })}
            </p>

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
                    {/* Doc 1: location photo */}
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
                            {warehouse.spaceType || "storage space"} |{" "}
                            {environmentTags.map(getEnvironmentLabel).join(", ") || "general conditions"} |{" "}
                            {warehouse.heightFt || 10} ft high
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: "8px", justifyItems: "end" }}>
                      <span className="listing-price-pill">Rs {Number(warehouse.pricePerSqft || 0).toLocaleString("en-IN")}/{warehouse.pricingUnit || "month"}</span>
                      <span className={warehouse.availableSqft > 0 ? "badge status-confirmed" : "badge status-rejected"}>
                        {warehouse.availableSqft > 0 ? "Active" : "Full"}
                      </span>
                    </div>
                    </div>

                    <div className="wcard-stats">
                      <div className="wcard-stat"><span className="wcard-stat-label">Available</span><span className="wcard-stat-value">{warehouse.availableSqft} sq ft</span></div>
                      <div className="wcard-stat"><span className="wcard-stat-label">Total</span><span className="wcard-stat-value">{warehouse.sqft} sq ft</span></div>
                      <div className="wcard-stat"><span className="wcard-stat-label">Height</span><span className="wcard-stat-value">{warehouse.heightFt || 10} ft</span></div>
                      <div className="wcard-stat"><span className="wcard-stat-label">Pricing</span><span className="wcard-stat-value">Rs {warehouse.pricePerSqft}/{warehouse.pricingUnit || "month"}</span></div>
                      {/* Doc 1: rating */}
                      {Number(warehouse.ratingCount || 0) > 0 ? (
                        <div className="wcard-stat"><span className="wcard-stat-label">Rating</span><span className="wcard-stat-value">{Number(warehouse.rating || 0).toFixed(1)}/5</span></div>
                      ) : null}
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

          <OwnerListingForm
            form={form}
            geotagLoading={geotagLoading}
            geotagMessage={geotagMessage}
            geotagMode={geotagMode}
            handleAddWarehouse={handleAddWarehouse}
            handleLocationImage={handleLocationImage}
            locationImagePreview={locationImagePreview}
            locationImageRef={locationImageRef}
            saving={saving}
            toggleMultiSelect={toggleMultiSelect}
            updateForm={updateForm}
          />
        </section>
      ) : (
        // Bookings tab
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
                      <p className="booking-card-title">
                        {booking.farmerName || "Customer"} - {booking.warehouseName || "Storage Space"}
                      </p>
                      {/* Doc 1: buyer role; Doc 2: price & booker note */}
                      <div className="booking-card-meta">
                        <span>{booking.buyerRole || "customer"}</span>
                        <span>{booking.produce || booking.storageCategory || "general goods"}</span>
                        <span>{booking.weight || booking.sqft || 0}</span>
                        <span>Rs {Number(booking.totalPrice || 0).toLocaleString("en-IN")}</span>
                        <span>{booking.stackable ? "Stackable" : "Non-stackable"}</span>
                        <span>{formatDate(booking.createdAt)}</span>
                      </div>
                      {/* Doc 2: inline booker note preview */}
                      {booking.bookerNote ? (
                        <p className="section-subtitle" style={{ margin: "8px 0 0" }}>Note: {booking.bookerNote}</p>
                      ) : null}
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
                      {/* Doc 2: "Review & Confirm" opens modal with negotiation UI */}
                      <button className="button" onClick={() => setSelectedBooking(booking)} type="button">
                        Review & Confirm
                      </button>
                      <button
                        className="button-secondary button-danger"
                        onClick={() => updateBookingStatus(booking.id, "rejected")}
                        type="button"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {/* Doc 1: report buyer link on confirmed / completed */}
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

      <BookingModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdateStatus={updateBookingStatus}
      />
    </main>
  );
}











