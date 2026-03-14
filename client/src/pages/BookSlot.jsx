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
const DURATION_OPTIONS = [1, 2, 4, 8, 12];

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

export default function BookSlot({ loading: sessionLoading, profile, role, user }) {
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

  const selectedCategory = form.category || categoryOptions[0] || "other";
  const isFarmerFlow = role === "farmer";
  const isFarmVaultFlow = isFarmerFlow && isFarmCategory(selectedCategory);
  const quantity = Number(form.quantity || 0);
  const duration = Number(form.duration || 0);
  const pricePerSqft = Number(selectedWarehouse?.pricePerSqft || 0);
  const pricingUnit = normalizePricingUnit(selectedWarehouse?.pricingUnit);
  const warehouseHeightFt = Number(selectedWarehouse?.heightFt || 10);
  const spaceCalc = computeRequiredSqft({
    category: selectedCategory,
    quantity,
    stackable: form.stackable,
    warehouseHeightFt,
  });
  const sqft = spaceCalc.requiredSqft;
  const totalPrice = sqft * pricePerSqft * duration;
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
      const customerName = profile?.name || user.displayName || user.email?.split("@")[0] || "Customer";
      const res = await fetch(`${apiBaseUrl}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          warehouseId: form.warehouseId,
          farmerName: customerName,
          buyerRole: role,
          phone: form.phone.trim(),
          produce: selectedCategory,
          weight: quantity,
          sqft,
          duration,
          startDate: form.startDate,
          totalPrice,
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
                    {warehouse.name} ({warehouse.availableSqft} sq ft available, {warehouse.heightFt || 10} ft high)
                  </option>
                ))}
              </select>
            </label>
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
            <label className="checkbox-item">
              <input checked={form.stackable} name="stackable" onChange={updateForm} type="checkbox" />
              <span>Stackable inventory</span>
            </label>
            <p className="field-hint" style={{ marginTop: "-8px" }}>Turn this off for fragile or non-stackable goods.</p>
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
                <div className="receipt-row"><span>Status</span><strong>{booking.status}</strong></div>
                <div className="receipt-row"><span>Booking ID</span><strong>{booking.id}</strong></div>
                <div className="receipt-row"><span>Stackable</span><strong>{booking.stackable ? "Yes" : "No"}</strong></div>
                <div className="receipt-row"><span>Reserved Sq Ft</span><strong>{booking.sqft}</strong></div>
                {booking.gradingSessionId ? <div className="receipt-row"><span>Grading Session</span><strong>{booking.gradingSessionId}</strong></div> : null}
                {booking.bookingImage?.url ? (
                  <div className="receipt-row"><span>Image</span><a href={booking.bookingImage.url} rel="noreferrer" target="_blank">Open</a></div>
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
            <p className="eyebrow">Space Estimate</p>
            <h3 style={{ marginBottom: "1rem" }}>Storage Calculation</h3>
            <div className="cost-row"><span className="cost-row-label">Warehouse clear height</span><span className="cost-row-value">{warehouseHeightFt.toFixed(1)} ft</span></div>
            <div className="cost-row"><span className="cost-row-label">Usable stack height</span><span className="cost-row-value">{spaceCalc.stackHeightFt.toFixed(1)} ft</span></div>
            <div className="cost-row"><span className="cost-row-label">Stackable</span><span className="cost-row-value">{form.stackable ? "Yes" : "No"}</span></div>
            <div className="cost-row"><span className="cost-row-label">Floor space required</span><span className="cost-row-value">{sqft} sq ft</span></div>
            <div className="cost-row"><span className="cost-row-label">Rate / sq ft / {pricingUnit}</span><span className="cost-row-value">Rs {pricePerSqft.toLocaleString("en-IN")}</span></div>
            <div className="cost-row total-row"><span className="cost-row-label">Storage Cost</span><span className="cost-row-value">Rs {totalPrice.toLocaleString("en-IN")}</span></div>
            <p style={{ fontSize: "0.82rem", marginTop: "12px" }}>
              Calculation uses market-style cubic volume, safe stacking height, and aisle/handling allowance.
            </p>
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
            {uploadedImage?.url ? <p style={{ fontSize: "0.8rem", marginTop: "6px" }}>Uploaded to Cloudinary.</p> : null}
            <p style={{ fontSize: "0.82rem", marginTop: "12px" }}>
              Image is stored on Cloudinary and the asset reference is saved in Firestore.
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


