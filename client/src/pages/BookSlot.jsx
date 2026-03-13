import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";

const SQFT_PER_TONNE = 20;
const RATE_PER_SQFT_PER_MONTH = 12;
const LOAN_ELIGIBILITY_RATE = 0.7;

const PRODUCE_RATES = {
  wheat: 2800,
  rice: 3200,
  pulses: 5500,
  vegetables: 1800,
  fruits: 4200,
  other: 2500,
};

export default function BookSlot({ loading: sessionLoading, user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const warehouseIdParam = searchParams.get("warehouseId") || "";

  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({
    warehouseId: warehouseIdParam,
    produce: "wheat",
    quantity: "",
    months: "1",
    startDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/warehouses`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load warehouses.");
        setWarehouses(data.warehouses || []);
      } catch (err) {
        toast.error(err.message);
      }
    })();
  }, []);

  useEffect(() => {
    setForm((current) => ({ ...current, warehouseId: warehouseIdParam }));
  }, [warehouseIdParam]);

  const updateForm = (e) =>
    setForm((c) => ({ ...c, [e.target.name]: e.target.value }));

  const qty = parseFloat(form.quantity) || 0;
  const months = parseInt(form.months, 10) || 1;
  const sqft = qty * SQFT_PER_TONNE;
  const storageCost = sqft * RATE_PER_SQFT_PER_MONTH * months;
  const produceRate = PRODUCE_RATES[form.produce] || 2500;
  const produceValue = qty * produceRate;
  const loanEligibility = produceValue * LOAN_ELIGIBILITY_RATE;
  const loanEligible = produceValue >= 10000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sessionLoading || !user) {
      toast.error("Please sign in first.");
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
          farmerName: user.displayName || user.email?.split("@")[0] || "Farmer",
          phone: "Not provided",
          produce: form.produce,
          weight: qty,
          sqft,
          duration: months,
          totalPrice: storageCost,
          loanEligibility,
          estimatedProduceValue: produceValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to create booking.");
      setBooking(data.booking);
      toast.success("Booking submitted!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (booking) {
    return (
      <main className="auth-center fade-up">
        <div className="card" style={{ maxWidth: "480px", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>Done</div>
          <p className="eyebrow">Booking Submitted</p>
          <h2 style={{ marginBottom: "8px" }}>You are all set!</h2>
          <p style={{ marginBottom: "1.5rem" }}>
            Your booking is pending owner confirmation. You will be notified once it is approved.
          </p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <button className="button" onClick={() => navigate("/farmer")} type="button">
              Back to Dashboard
            </button>
            <Link className="button-secondary" to={`/receipt/${booking.id}`}>
              View Receipt
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page fade-up">
      <div className="row-between" style={{ marginBottom: "8px" }}>
        <div>
          <p className="eyebrow">New Booking</p>
          <h2 style={{ margin: 0 }}>Book a Storage Slot</h2>
        </div>
        <Link className="button-ghost" to="/farmer">
          Back
        </Link>
      </div>

      <section className="page two-column">
        <div className="card">
          <h3 style={{ marginBottom: "1.25rem" }}>Booking Details</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Warehouse
              <select name="warehouseId" onChange={updateForm} required value={form.warehouseId}>
                <option value="">Select a warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.availableSqft} sq ft available)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Produce Type
              <select name="produce" onChange={updateForm} value={form.produce}>
                <option value="wheat">Wheat</option>
                <option value="rice">Rice</option>
                <option value="pulses">Pulses</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="other">Other</option>
              </select>
            </label>
            <div className="form-row">
              <label>
                Quantity (tonnes)
                <input name="quantity" min="0.1" onChange={updateForm} placeholder="e.g. 10" required step="0.1" type="number" value={form.quantity} />
              </label>
              <label>
                Duration (months)
                <select name="months" onChange={updateForm} value={form.months}>
                  {[1, 2, 3, 6, 12].map((m) => (
                    <option key={m} value={m}>
                      {m} month{m > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Start Date
              <input name="startDate" onChange={updateForm} required type="date" value={form.startDate} />
            </label>
            <button className="button button-full" disabled={loading || !form.warehouseId} type="submit" style={{ marginTop: "4px" }}>
              {loading ? "Submitting..." : "Submit Booking"}
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
          <div className="card calculator-card">
            <p className="eyebrow">Cost Estimate</p>
            <h3 style={{ marginBottom: "1rem" }}>Live Breakdown</h3>
            <div className="cost-row">
              <span className="cost-row-label">Space Required</span>
              <span className="cost-row-value">{sqft.toFixed(0)} sq ft</span>
            </div>
            <div className="cost-row">
              <span className="cost-row-label">Rate / sq ft / month</span>
              <span className="cost-row-value">Rs {RATE_PER_SQFT_PER_MONTH}</span>
            </div>
            <div className="cost-row">
              <span className="cost-row-label">Duration</span>
              <span className="cost-row-value">{months} month{months > 1 ? "s" : ""}</span>
            </div>
            <div className="cost-row total-row">
              <span className="cost-row-label">Storage Cost</span>
              <span className="cost-row-value">Rs {storageCost.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="card">
            <p className="eyebrow">Produce Value</p>
            <h3 style={{ marginBottom: "1rem" }}>Loan Eligibility</h3>
            <div className="cost-row">
              <span className="cost-row-label">Market Rate ({form.produce})</span>
              <span className="cost-row-value">Rs {produceRate}/tonne</span>
            </div>
            <div className="cost-row">
              <span className="cost-row-label">Estimated Value</span>
              <span className="cost-row-value">Rs {produceValue.toLocaleString("en-IN")}</span>
            </div>
            <div className="cost-row total-row">
              <span className="cost-row-label">Loan Eligible (70%)</span>
              <span className="cost-row-value">Rs {loanEligibility.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ marginTop: "12px" }}>
              {loanEligible ? <span className="badge status-confirmed">Loan Eligible</span> : <span className="badge badge-muted">Below loan threshold</span>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}