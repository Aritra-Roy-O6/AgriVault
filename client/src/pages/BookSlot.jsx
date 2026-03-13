import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import GradeResult from "../components/GradeResult";
import { apiBaseUrl, auth, getAuthHeaders } from "../firebase";
import { defaultCategories } from "../storageRules";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const DEFAULT_SPACE_PER_UNIT = 2;
const DURATION_OPTIONS = [1, 2, 4, 8, 12];

const CATEGORY_CONFIG = {
  clothes: { label: "Clothes", spacePerUnit: 2, unitLabel: "cartons" },
  fabrics: { label: "Fabrics", spacePerUnit: 3, unitLabel: "rolls" },
  grains: { label: "Grains", spacePerUnit: 12, unitLabel: "quintals", farm: true, loanRate: 2800 },
  wheat: { label: "Wheat", spacePerUnit: 12, unitLabel: "quintals", farm: true, loanRate: 2800 },
  rice: { label: "Rice", spacePerUnit: 12, unitLabel: "quintals", farm: true, loanRate: 3200 },
  pulses: { label: "Pulses", spacePerUnit: 10, unitLabel: "quintals", farm: true, loanRate: 5500 },
  vegetables: { label: "Vegetables", spacePerUnit: 14, unitLabel: "crates", farm: true, loanRate: 1800 },
  fruits: { label: "Fruits", spacePerUnit: 16, unitLabel: "crates", farm: true, loanRate: 4200 },
  electronics: { label: "Electronics", spacePerUnit: 4, unitLabel: "boxes" },
  cosmetics: { label: "Cosmetics", spacePerUnit: 2, unitLabel: "cartons" },
  furniture: { label: "Furniture", spacePerUnit: 20, unitLabel: "items" },
  decorations: { label: "Decorations", spacePerUnit: 3, unitLabel: "boxes" },
  tiles: { label: "Tiles", spacePerUnit: 8, unitLabel: "pallets" },
  "steel/iron": { label: "Steel / Iron", spacePerUnit: 10, unitLabel: "bundles" },
  produce: { label: "Produce", spacePerUnit: 12, unitLabel: "quintals", farm: true, loanRate: 2500 },
  other: { label: "Other", spacePerUnit: 4, unitLabel: "units" },
};

function canOpenReceipt(status) {
  return ["confirmed", "completed"].includes(status);
}

function isAllowedImage(file) {
  return file && ALLOWED_IMAGE_TYPES.includes(file.type);
}

function isFarmCategory(category) {
  return Boolean(CATEGORY_CONFIG[category]?.farm);
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

function getCategoryDetails(category) {
  return CATEGORY_CONFIG[category] || { label: category || "Goods", spacePerUnit: DEFAULT_SPACE_PER_UNIT, unitLabel: "units" };
}

function normalizePricingUnit(value) {
  if (value === "daily") return "day";
  if (value === "weekly") return "week";
  return "month";
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
    notes: "",
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

  const selectedCategory = form.category || categoryOptions[0] || "other";
  const categoryDetails = getCategoryDetails(selectedCategory);
  const isFarmerFlow = role === "farmer";
  const isFarmVaultFlow = isFarmerFlow && isFarmCategory(selectedCategory);
  const quantity = Number(form.quantity || 0);
  const duration = Number(form.duration || 0);
  const pricePerSqft = Number(selectedWarehouse?.pricePerSqft || 0);
  const pricingUnit = normalizePricingUnit(selectedWarehouse?.pricingUnit);
  const sqft = quantity * Number(categoryDetails.spacePerUnit || DEFAULT_SPACE_PER_UNIT);
  const totalPrice = sqft * pricePerSqft * duration;
  const estimatedProduceValue = isFarmVaultFlow ? quantity * Number(categoryDetails.loanRate || 0) : 0;
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
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "category") {
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
          loanEligibility,
          estimatedProduceValue,
          gradingSessionId: gradingSessionId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to create booking.");
      setBooking(data.booking);
      setGradeResult(data.booking.gradeResult || gradeResult);
      setGradingSessionId(data.booking.gradingSessionId || gradingSessionId);
      toast.success(file ? "Booking submitted. Image preview kept only on this device for now." : "Booking submitted.");
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
      setGradeResult(data.booking.gradeResult || gradeResult);
      setGradingSessionId(data.booking.gradingSessionId || gradingSessionId);
      toast.success(`Booking status: ${data.booking.status}`);
    } catch (err) {
      toast.error(err.message);
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

      <section className="page two-column">
        <div className="card">
          <h3 style={{ marginBottom: "1.25rem" }}>Booking Details</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Storage space
              <select name="warehouseId" onChange={updateForm} required value={form.warehouseId}>
                <option value="">Select a listing...</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.availableSqft} sq ft available)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Storage category
              <select name="category" onChange={updateForm} required value={selectedCategory}>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryDetails(category).label}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Quantity ({categoryDetails.unitLabel})
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
                  {DURATION_OPTIONS.map((value) => (
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
            <button className="button button-full" disabled={loading || !detailsComplete} type="submit" style={{ marginTop: "4px" }}>
              {loading ? "Submitting..." : "Submit Booking"}
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
          {booking ? (
            <div className="card">
              <p className="eyebrow">Booking Created</p>
              <h3 style={{ marginBottom: "12px" }}>Booking saved</h3>
              <div className="receipt-meta">
                <div className="receipt-row">
                  <span>Status</span>
                  <strong>{booking.status}</strong>
                </div>
                <div className="receipt-row">
                  <span>Booking ID</span>
                  <strong>{booking.id}</strong>
                </div>
                {booking.gradingSessionId ? (
                  <div className="receipt-row">
                    <span>Grading Session</span>
                    <strong>{booking.gradingSessionId}</strong>
                  </div>
                ) : null}
              </div>
              <div className="actions">
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

          <div className="card calculator-card">
            <p className="eyebrow">Cost Estimate</p>
            <h3 style={{ marginBottom: "1rem" }}>Live Breakdown</h3>
            <div className="cost-row">
              <span className="cost-row-label">Space Required</span>
              <span className="cost-row-value">{sqft.toFixed(0)} sq ft</span>
            </div>
            <div className="cost-row">
              <span className="cost-row-label">Rate / sq ft / {pricingUnit}</span>
              <span className="cost-row-value">Rs {pricePerSqft.toLocaleString("en-IN")}</span>
            </div>
            <div className="cost-row">
              <span className="cost-row-label">Duration</span>
              <span className="cost-row-value">{duration || 0} {pricingUnit}{duration > 1 ? "s" : ""}</span>
            </div>
            <div className="cost-row total-row">
              <span className="cost-row-label">Storage Cost</span>
              <span className="cost-row-value">Rs {totalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="card">
            <p className="eyebrow">Item Image</p>
            <h3 style={{ marginBottom: "1rem" }}>{isFarmerFlow ? "Upload produce image" : "Upload goods image"}</h3>
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
                <img alt="Booking preview" src={preview} style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "12px" }} />
              ) : (
                <>
                  <span className="upload-zone-icon">Upload</span>
                  <p style={{ fontWeight: 700, margin: 0 }}>Drop image here or click to browse</p>
                  <p style={{ fontSize: "0.8rem", margin: 0 }}>PNG, JPG, JPEG only</p>
                </>
              )}
              <input accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={(event) => handleFile(event.target.files?.[0])} ref={fileRef} style={{ display: "none" }} type="file" />
            </div>
            {file ? <p style={{ fontSize: "0.8rem", marginTop: "12px" }}>File: {file.name}</p> : null}
            <p style={{ fontSize: "0.82rem", marginTop: "12px" }}>
              Image preview is local only for now. Cloud storage is not connected yet.
            </p>
            {isFarmVaultFlow ? (
              <button className="button button-full" disabled={grading || !detailsComplete || !file} onClick={handleGrade} style={{ marginTop: "8px" }} type="button">
                {grading ? "Analyzing Produce..." : "Optional AI Grade"}
              </button>
            ) : null}
            {mlIssue ? (
              <p style={{ fontSize: "0.8rem", marginTop: "12px", color: "#fbbf24" }}>
                ML issue: {mlIssue}
              </p>
            ) : null}
          </div>

          {isFarmVaultFlow ? (
            <div className="card">
              <p className="eyebrow">FarmVault</p>
              <h3 style={{ marginBottom: "1rem" }}>Loan Eligibility</h3>
              <div className="cost-row">
                <span className="cost-row-label">Estimated produce value</span>
                <span className="cost-row-value">Rs {estimatedProduceValue.toLocaleString("en-IN")}</span>
              </div>
              <div className="cost-row total-row">
                <span className="cost-row-label">Potential micro-loan value</span>
                <span className="cost-row-value">Rs {loanEligibility.toLocaleString("en-IN")}</span>
              </div>
            </div>
          ) : null}

          {gradeResult ? (
            <div className="card">
              <GradeResult result={gradeResult} />
              <div className="actions" style={{ marginTop: "16px" }}>
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
