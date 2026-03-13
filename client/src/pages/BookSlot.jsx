import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { auth, apiBaseUrl } from "../firebase";

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

const SQFT_PER_TONNE = 20;
const RATE_PER_SQFT_PER_MONTH = 12;
const LOAN_ELIGIBILITY_RATE = 0.70;

const PRODUCE_RATES = {
  wheat: 2800,
  rice: 3200,
  pulses: 5500,
  vegetables: 1800,
  fruits: 4200,
  other: 2500,
};

export default function BookSlot() {
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
        const token = await getToken();
        const res = await fetch(`${apiBaseUrl}/api/warehouses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setWarehouses(data.warehouses || []);
      } catch (err) {
        toast.error(err.message);
      }
    })();
  }, []);

  const updateForm = (e) =>
    setForm((c) => ({ ...c, [e.target.name]: e.target.value }));

  const qty = parseFloat(form.quantity) || 0;
  const months = parseInt(form.months) || 1;
  const sqft = qty * SQFT_PER_TONNE;
  const storageCost = sqft * RATE_PER_SQFT_PER_MONTH * months;
  const produceRate = PRODUCE_RATES[form.produce] || 2500;
  const produceValue = qty * produceRate;
  const loanEligibility = produceValue * LOAN_ELIGIBILITY_RATE;
  const loanEligible = produceValue >= 10000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiBaseUrl}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          warehouseId: form.warehouseId,
          produce: form.produce,
          quantity: qty,
          months,
          startDate: form.startDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
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
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>&#10003;</div>
          <p className="eyebrow">Booking Submitted</p>
          <h2 style={{ marginBottom: "8px" }}>You are all set!</h2>
          <p style={{ color: "var(--clr-ink-muted)", marginBottom: "1.5rem" }}>
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
        <Link className="button-ghost" to="/farmer">&#8592; Back</Link>
      </div>

      <section className="page two-column">
        {/* Form */}
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
                <option value="wheat">&#127807; Wheat</option>
                <option value="rice">&#127807; Rice</option>
                <option value="pulses">&#127807; Pulses</option>
                <option value="vegetables">&#129382; Vegetables</option>
                <option value="fruits">&#127820; Fruits</option>
                <option value="other">&#128179; Other</option>
              </select>
            </label>
            <div className="form-row">
              <label>
                Quantity (tonnes)
                <input
                  name="quantity"
                  onChange={updateForm}
                  placeholder="e.g. 10"
                  required
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.quantity}
                />
              </label>
              <label>
                Duration (months)
                <select name="months" onChange={updateForm} value={form.months}>
                  {[1,2,3,6,12].map((m) => (
                    <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Start Date
              <input
                name="startDate"
                onChange={updateForm}
                required
                type="date"
                value={form.startDate}
              />
            </label>
            <button
              className="button button-full"
              disabled={loading || !form.warehouseId}
              type="submit"
              style={{ marginTop: "4px" }}
            >
              {loading ? (
                <><span className="spinner" /> Submitting...</>
              ) : (
                "Submit Booking"
              )}
            </button>
          </form>
        </div>

        {/* Cost calculator */}
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
              <span className="cost-row-value">&#8377;{RATE_PER_SQFT_PER_MONTH}</span>
            </div>
            <div className="cost-row">
              <span className="cost-row-label">Duration</span>
              <span className="cost-row-value">{months} month{months > 1 ? "s" : ""}</span>
            </div>
            <div className="cost-row total-row">
              <span className="cost-row-label">Storage Cost</span>
              <span className="cost-row-value">&#8377;{storageCost.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="card">
            <p className="eyebrow">Produce Value</p>
            <h3 style={{ marginBottom: "1rem" }}>Loan Eligibility</h3>
            <div className="cost-row">
              <span className="cost-row-label">Market Rate ({form.produce})</span>
              <span className="cost-row-value">&#8377;{produceRate}/tonne</span>
            </div>
            <div className="cost-row">
              <span className="cost-row-label">Estimated Value</span>
              <span className="cost-row-value">&#8377;{produceValue.toLocaleString("en-IN")}</span>
            </div>
            <div className="cost-row total-row">
              <span className="cost-row-label">Loan Eligible (70%)</span>
              <span className="cost-row-value">&#8377;{loanEligibility.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ marginTop: "12px" }}>
              {loanEligible ? (
                <span className="badge status-confirmed">Loan Eligible</span>
              ) : (
                <span className="badge badge-muted">Below loan threshold</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
