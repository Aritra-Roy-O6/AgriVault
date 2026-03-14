import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import GradeResult from "../components/GradeResult";
import { apiBaseUrl, auth, getAuthHeaders } from "../firebase";
import { defaultCategories } from "../storageRules";
import {
  computeRequiredSqft,
  getCategoryLabel,
  getLoanRate,
  getQuantityUnit,
  isFarmCategory,
} from "../storageMath";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

function canOpenReceipt(status) {
  return ["confirmed", "completed"].includes(status);
}

function isAllowedImage(file) {
  return file && ALLOWED_IMAGE_TYPES.includes(file.type);
}

function dashboardPath(role) {
  if (role === "owner") return "/dashboard/owner";
  if (role === "business") return "/dashboard/business";
  return "/dashboard/farmer";
}

function parseCategoryList(warehouse) {
  const items = [...(warehouse?.supportedCategories || []), ...(warehouse?.produces || [])]
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(items));
}

function normalizePricingUnit(value) {
  if (value === "daily") return "day";
  if (value === "weekly") return "week";
  return "month";
}

function getDurationOptions(pricingUnit) {
  if (pricingUnit === "daily") return [1, 3, 7, 14, 30];
  if (pricingUnit === "weekly") return [1, 2, 4, 8, 12];
  return [1, 2, 3, 6, 12];
}

function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function BookSlot({ loading: sessionLoading, role, user }) {
  const fileRef = useRef(null);
  const [searchParams] = useSearchParams();
  const warehouseIdParam = searchParams.get("warehouseId") || "";

  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({
    warehouseId: warehouseIdParam,
    category: "",
    quantity: "",
    duration: "1",
    startDate: "",
    phone: "",
    bookerNote: "",
    stackable: true,
  });
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [gradingSessionId, setGradingSessionId] = useState(null);
  const [mlIssue, setMlIssue] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/warehouses`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load listings.");
        setWarehouses(data.warehouses || []);
      } catch (err) {
        toast.error(err.message);
      }
    })();
  }, []);

  useEffect(() => {
    setForm((current) => ({ ...current, warehouseId: warehouseIdParam }));
  }, [warehouseIdParam]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((item) => item.id === form.warehouseId) || null,
    [form.warehouseId, warehouses]
  );

  const categoryOptions = useMemo(() => {
    const listingCategories = parseCategoryList(selectedWarehouse);
    return listingCategories.length ? listingCategories : defaultCategories;
  }, [selectedWarehouse]);

  useEffect(() => {
    setForm((current) => {
      if (current.category && categoryOptions.includes(current.category)) {
        return current;
      }

      return {
        ...current,
        category: categoryOptions[0] || "other",
      };
    });
  }, [categoryOptions]);

  const durationOptions = useMemo(
    () => getDurationOptions(selectedWarehouse?.pricingUnit),
    [selectedWarehouse?.pricingUnit]
  );

  useEffect(() => {
    setForm((current) => {
      if (durationOptions.includes(Number(current.duration || 0))) {
        return current;
      }

      return {
        ...current,
        duration: String(durationOptions[0] || 1),
      };
    });
  }, [durationOptions]);

  const selectedCategory = form.category || categoryOptions[0] || "other";
  const isFarmerFlow = role === "farmer";
  const isFarmVaultFlow = isFarmerFlow && isFarmCategory(selectedCategory);
  const quantity = Number(form.quantity || 0);
  const duration = Number(form.duration || 0);
  const pricePerSqft = Number(selectedWarehouse?.pricePerSqft || 0);
  const pricingUnit = normalizePricingUnit(selectedWarehouse?.pricingUnit);
  const pricingUnitLabel = selectedWarehouse?.pricingUnit || "monthly";
  const warehouseHeightFt = Number(selectedWarehouse?.heightFt || 10);
  const spaceCalc = computeRequiredSqft({
    category: selectedCategory,
    quantity,
    stackable: form.stackable,
    warehouseHeightFt,
  });
  const sqft = spaceCalc.requiredSqft;
  const totalPrice = Number((sqft * pricePerSqft * duration).toFixed(2));
  const estimatedProduceValue = isFarmVaultFlow ? quantity * getLoanRate(selectedCategory) : 0;
  const loanEligibility = estimatedProduceValue * 0.7;
  const detailsComplete =
    Boolean(form.warehouseId) &&
    Boolean(selectedCategory) &&
    quantity > 0 &&
    duration > 0 &&
    Boolean(form.startDate) &&
    Boolean(form.phone.trim());

  const resetGrading = () => {
    setGradeResult(null);
    setGradingSessionId(null);
    setMlIssue(null);
  };

  const updateForm = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    if (name === "category" || name === "stackable") {
      resetGrading();
    }
  };

  const handleFile = (nextFile) => {
    if (!nextFile) {
      return;
    }

    if (!isAllowedImage(nextFile)) {
      toast.error("Only PNG and JPEG images are allowed.");
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setUploadedImage(null);
    if (isFarmVaultFlow) {
      resetGrading();
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) {
      handleFile(nextFile);
    }
  };

  const uploadBookingImage = async (headers) => {
    if (!file) {
      return null;
    }

    if (uploadedImage?.url) {
      return uploadedImage;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", isFarmVaultFlow ? "vaultx/farmvault" : "vaultx/bookings");

    const response = await fetch(`${apiBaseUrl}/api/uploads/image`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to upload booking image.");
    }

    setUploadedImage(data.asset);
    return data.asset;
  };

  const handleGrade = async () => {
    if (!isFarmVaultFlow) {
      toast.error("AI grading is available only for FarmVault produce bookings.");
      return;
    }

    if (!detailsComplete) {
      toast.error("Fill all booking details before grading.");
      return;
    }

    if (!file) {
      toast.error("Upload a PNG or JPEG crop image first.");
      return;
    }

    setGrading(true);
    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.append("image", file);
      formData.append("farmer_uid", auth.currentUser?.uid || user?.uid || "");
      formData.append("produce_type", selectedCategory);
      formData.append("include_annotated_image", "true");

      const res = await fetch(`${apiBaseUrl}/api/grading/analyze`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Unable to grade produce.");
      setGradeResult(data.gradeResult || data);
      setGradingSessionId(data.session_id);
      setMlIssue(data.mlIssue || null);
      toast.success(data.fallback ? "Fallback grading used. Check ML service health." : "Produce graded successfully.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGrading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sessionLoading || !user) {
      toast.error("Please sign in first.");
      return;
    }

    if (!detailsComplete) {
      toast.error("Fill all booking details before submitting.");
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const bookingImage = await uploadBookingImage(headers);
      const res = await fetch(`${apiBaseUrl}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          warehouseId: form.warehouseId,
          farmerName: user.displayName || user.email?.split("@")[0] || "Customer",
          phone: form.phone.trim(),
          produce: selectedCategory,
          weight: quantity,
          sqft,
          duration,
          startDate: form.startDate,
          totalPrice,
          bookerNote: form.bookerNote.trim(),
          loanEligibility,
          estimatedProduceValue,
          stackable: form.stackable,
          gradingSessionId: gradingSessionId || undefined,
          bookingImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to create booking.");
      setBooking(data.booking);
      setUploadedImage(data.booking.bookingImage || bookingImage || null);
      setGradeResult(data.booking.gradeResult || gradeResult);
      setGradingSessionId(data.booking.gradingSessionId || gradingSessionId);
      toast.success(file ? "Booking submitted. Image uploaded to Cloudinary." : "Booking submitted.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshBooking = async () => {
    if (!booking?.id) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBaseUrl}/api/bookings/${booking.id}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to refresh booking.");
      setBooking(data.booking);
      setUploadedImage(data.booking.bookingImage || uploadedImage);
      setGradeResult(data.booking.gradeResult || gradeResult);
      setGradingSessionId(data.booking.gradingSessionId || gradingSessionId);
      toast.success(`Booking status: ${data.booking.status}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`page fade-up dashboard-theme ${isFarmerFlow ? "dashboard-theme-farmer" : "dashboard-theme-business"}`}>
      <div className={`dashboard-hero ${isFarmerFlow ? "dashboard-hero-farmer" : "dashboard-hero-business"}`}>
        <div>
          <p className="eyebrow">New Booking</p>
          <h2 style={{ margin: 0 }}>{isFarmerFlow ? "Book FarmVault Storage" : "Book Storage Space"}</h2>
        </div>
        <Link className="button-ghost" to={dashboardPath(role)}>
          Back
        </Link>
      </div>

      <section className="page booking-layout">
        <div className="card card-compact">
          <p className="eyebrow">Booking Details</p>
          <h3 style={{ marginBottom: "1rem" }}>Reserve space with a tighter warehouse estimate</h3>
          <form className="form-grid compact-form-grid" onSubmit={handleSubmit}>
            {selectedWarehouse ? (
              <div className="selected-warehouse-strip">
                <span className="listing-detail-label">Selected storage space</span>
                <strong>{selectedWarehouse.name}</strong>
                <p className="section-subtitle" style={{ margin: 0 }}>
                  {selectedWarehouse.address} · {Number(selectedWarehouse.availableSqft || 0).toLocaleString("en-IN")} sq ft open · {formatMoney(selectedWarehouse.pricePerSqft)}/{pricingUnit}
                </p>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "18px 14px" }}>
                <p className="empty-state-title">Choose a listing first</p>
                <p className="empty-state-sub">Open booking from a listing card so the selected space is locked in.</p>
              </div>
            )}

            <div className="form-row">
              <label>
                Storage category
                <select name="category" onChange={updateForm} required value={selectedCategory}>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-item compact-checkbox">
                <input checked={form.stackable} name="stackable" onChange={updateForm} type="checkbox" />
                <span>
                  <strong>Stackable inventory</strong>
                  <small>Turn off for fragile, loose, or crush-sensitive goods.</small>
                </span>
              </label>
            </div>

            <div className="form-row">
              <label>
                Quantity ({getQuantityUnit(selectedCategory)})
                <input
                  name="quantity"
                  min="0.1"
                  onChange={updateForm}
                  placeholder="Enter quantity"
                  required
                  step="0.1"
                  type="number"
                  value={form.quantity}
                />
              </label>
              <label>
                Duration ({pricingUnit}s)
                <select name="duration" onChange={updateForm} value={form.duration}>
                  {durationOptions.map((value) => (
                    <option key={value} value={value}>
                      {value} {pricingUnit}{value > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Start date
                <input name="startDate" onChange={updateForm} required type="date" value={form.startDate} />
              </label>
              <label>
                Phone
                <input name="phone" onChange={updateForm} placeholder="Contact number" required type="tel" value={form.phone} />
              </label>
            </div>

            <label>
              Note to owner
              <textarea
                name="bookerNote"
                onChange={updateForm}
                placeholder="Handling notes, unloading preference, or price request."
                rows="3"
                value={form.bookerNote}
              />
            </label>
            <p className="field-hint compact-form-hint">
              Estimate uses stack height, floor utilization, handling aisle reserve, and billable area rounding.
            </p>
            <button className="button button-full" disabled={loading || !detailsComplete} type="submit">
              {loading ? "Submitting..." : "Submit Booking"}
            </button>
          </form>
        </div>

        <div className="booking-sidebar sticky-column">
          {selectedWarehouse ? (
            <div className="card card-compact">
              <p className="eyebrow">Selected Space</p>
              <h3 style={{ marginBottom: "0.8rem" }}>{selectedWarehouse.name}</h3>
              <p className="section-subtitle" style={{ marginBottom: "0.9rem" }}>
                {selectedWarehouse.address}
              </p>
              <div className="metric-grid compact-metric-grid">
                <div className="metric-card">
                  <span className="metric-label">Available</span>
                  <strong className="metric-value">{Number(selectedWarehouse.availableSqft || 0).toLocaleString("en-IN")} sq ft</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Clear height</span>
                  <strong className="metric-value">{warehouseHeightFt.toFixed(1)} ft</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Rate</span>
                  <strong className="metric-value">{formatMoney(pricePerSqft)}/{pricingUnit}</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Billing</span>
                  <strong className="metric-value">{pricingUnitLabel}</strong>
                </div>
              </div>
              {(selectedWarehouse.supportedCategories || selectedWarehouse.produces || []).length ? (
                <div className="listing-detail-block compact-detail-block">
                  <p className="listing-detail-label">Best for</p>
                  <div className="chip-row">
                    {(selectedWarehouse.supportedCategories || selectedWarehouse.produces || []).slice(0, 6).map((category) => (
                      <span className="chip" key={category}>{getCategoryLabel(category)}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="card card-compact calculator-card">
            <p className="eyebrow">Estimate</p>
            <h3 style={{ marginBottom: "1rem" }}>Industry-style storage estimate</h3>
            <div className="metric-grid compact-metric-grid">
              <div className="metric-card">
                <span className="metric-label">Handled volume</span>
                <strong className="metric-value">{spaceCalc.handledVolumeCuFt.toLocaleString("en-IN")} cu ft</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Safe stack height</span>
                <strong className="metric-value">{spaceCalc.stackHeightFt.toFixed(1)} ft</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Storage footprint</span>
                <strong className="metric-value">{spaceCalc.storageFootprintSqft.toLocaleString("en-IN")} sq ft</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Billable area</span>
                <strong className="metric-value">{sqft.toLocaleString("en-IN")} sq ft</strong>
              </div>
            </div>
            <div className="cost-row"><span className="cost-row-label">Aisle and handling reserve</span><span className="cost-row-value">{spaceCalc.aisleReserveSqft.toLocaleString("en-IN")} sq ft</span></div>
            <div className="cost-row"><span className="cost-row-label">Floor utilization</span><span className="cost-row-value">{Math.round(spaceCalc.floorUtilizationRate * 100)}%</span></div>
            <div className="cost-row"><span className="cost-row-label">Billing increment</span><span className="cost-row-value">{spaceCalc.billingIncrementSqft} sq ft</span></div>
            <div className="cost-row"><span className="cost-row-label">Rate / sq ft / {pricingUnit}</span><span className="cost-row-value">{formatMoney(pricePerSqft)}</span></div>
            <div className="cost-row total-row"><span className="cost-row-label">Estimated storage cost</span><span className="cost-row-value">{formatMoney(totalPrice)}</span></div>
            <p className="field-hint compact-form-hint">
              The billable area is rounded up in operational blocks to reflect aisle clearance and real slotting overhead.
            </p>
          </div>

          <div className="card card-compact">
            <p className="eyebrow">Item Image</p>
            <h3 style={{ marginBottom: "0.9rem" }}>{isFarmerFlow ? "Upload produce image" : "Upload goods image"}</h3>
            <div
              className={`upload-zone${dragging ? " dragging" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDrop={handleDrop}
            >
              {preview ? (
                <img alt="Booking preview" src={preview} style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "12px" }} />
              ) : (
                <>
                  <span className="upload-zone-icon">Upload</span>
                  <p style={{ fontWeight: 700, margin: 0 }}>Drop image here or click to browse</p>
                  <p style={{ fontSize: "0.8rem", margin: 0 }}>PNG, JPG, JPEG only</p>
                </>
              )}
              <input accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={(event) => handleFile(event.target.files?.[0])} ref={fileRef} style={{ display: "none" }} type="file" />
            </div>
            {file ? <p style={{ fontSize: "0.8rem", marginTop: "10px" }}>File: {file.name}</p> : null}
            {uploadedImage?.url ? <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>Uploaded to Cloudinary.</p> : null}
            {isFarmVaultFlow ? (
              <button className="button button-full" disabled={grading || !detailsComplete || !file} onClick={handleGrade} style={{ marginTop: "10px" }} type="button">
                {grading ? "Analyzing Produce..." : "Optional AI Grade"}
              </button>
            ) : null}
            {mlIssue && gradeResult ? (
              <p style={{ fontSize: "0.8rem", marginTop: "10px", color: "#fbbf24" }}>
                AI service note: live ML analysis was unavailable, so a fallback grade was used. {mlIssue}
              </p>
            ) : null}
          </div>

          {booking ? (
            <div className="card card-compact">
              <p className="eyebrow">Booking Created</p>
              <h3 style={{ marginBottom: "0.9rem" }}>Booking saved</h3>
              <div className="receipt-meta compact-receipt-meta">
                <div className="receipt-row"><span>Status</span><strong>{booking.status}</strong></div>
                <div className="receipt-row"><span>Booking ID</span><strong>{booking.id}</strong></div>
                <div className="receipt-row"><span>Stackable</span><strong>{booking.stackable ? "Yes" : "No"}</strong></div>
                <div className="receipt-row"><span>Reserved Sq Ft</span><strong>{booking.sqft}</strong></div>
                {booking.bookerNote ? <div className="receipt-row"><span>Note to Owner</span><strong>{booking.bookerNote}</strong></div> : null}
                {booking.ownerResponseNote ? <div className="receipt-row"><span>Owner Reply</span><strong>{booking.ownerResponseNote}</strong></div> : null}
                {booking.gradingSessionId ? <div className="receipt-row"><span>Grading Session</span><strong>{booking.gradingSessionId}</strong></div> : null}
                {booking.bookingImage?.url ? (
                  <div className="receipt-row"><span>Image</span><a href={booking.bookingImage.url} rel="noreferrer" target="_blank">Open</a></div>
                ) : null}
              </div>
              <div className="actions compact-actions-row">
                <button className="button-secondary" onClick={refreshBooking} type="button">
                  Refresh Status
                </button>
                {canOpenReceipt(booking.status) ? (
                  <Link className="button-ghost" to={`/receipt/${booking.id}`}>
                    View Receipt
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {gradeResult ? (
            <div className="card card-compact">
              <GradeResult result={gradeResult} />
              <div className="actions compact-actions-row" style={{ marginTop: "16px" }}>
                {gradingSessionId ? <span className="badge status-confirmed">AI grading attached</span> : null}
                {canOpenReceipt(booking?.status) ? (
                  <Link className="button" to={`/receipt/${booking?.id}`}>
                    Download Receipt
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

