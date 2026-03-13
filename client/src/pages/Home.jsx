import { Link } from "react-router-dom";

const features = [
  {
    icon: "🗺️",
    title: "Map-Based Search",
    desc: "Find verified warehouses near you on an interactive map with real-time availability.",
  },
  {
    icon: "🤖",
    title: "AI Produce Grading",
    desc: "Upload a photo and get instant AI-powered quality grades for your produce.",
  },
  {
    icon: "📄",
    title: "Digital Receipts",
    desc: "Download PDF receipts with cost breakdowns and loan eligibility instantly.",
  },
  {
    icon: "⚡",
    title: "Instant Booking",
    desc: "Lock in warehouse slots in seconds. Owners confirm with a single tap.",
  },
];

const stats = [
  { value: "500+", label: "Verified Warehouses" },
  { value: "10K+", label: "Farmers Connected" },
  { value: "₹2Cr+", label: "Produce Stored" },
];

export default function Home() {
  return (
    <main className="page fade-up">
      {/* Hero + Features */}
      <section className="page two-column">
        {/* Hero card */}
        <div className="card accent-card">
          <div className="hero-eyebrow">🌾 Agricultural Storage Platform</div>
          <h1 className="hero-title">
            Store Smart.<br />
            <span className="highlight">Grow More.</span>
          </h1>
          <p className="hero-sub">
            AgriVault connects farmers with verified warehouses and gives
            owners a lightweight dashboard to manage space and bookings.
          </p>
          <div className="actions">
            <Link className="button" to="/auth?role=farmer">
              🌱 I'm a Farmer
            </Link>
            <Link className="button-secondary" to="/auth?role=owner">
              🏭 I Own a Space
            </Link>
          </div>
          <div className="stats-row">
            {stats.map((s) => (
              <div className="stat-item" key={s.label}>
                <div className="stat-item-value">{s.value}</div>
                <div className="stat-item-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature list card */}
        <div className="card">
          <p className="eyebrow">Platform Features</p>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1.2rem" }}>
            Everything you need to store and grow
          </h2>
          <div style={{ display: "grid", gap: "20px" }}>
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}