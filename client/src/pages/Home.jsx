import { Link } from "react-router-dom";

const features = [
  {
    title: "Map-Based Search",
    desc: "Find verified warehouses near you on an interactive map with real-time availability.",
  },
  {
    title: "AI Produce Grading",
    desc: "Upload a photo and get instant AI-powered quality grades for your produce.",
  },
  {
    title: "Digital Receipts",
    desc: "Download PDF receipts with cost breakdowns and loan eligibility instantly.",
  },
  {
    title: "Instant Booking",
    desc: "Lock in warehouse slots in seconds. Owners confirm with a single tap.",
  },
];

export default function Home() {
  return (
    <main className="page fade-up">
      <section className="page two-column">
        <div className="card accent-card">
          <div className="hero-eyebrow">Agricultural Storage Platform</div>
          <h1 className="hero-title">
            Store Smart.
            <br />
            <span className="highlight">Grow More.</span>
          </h1>
          <p className="hero-sub">
            AgriVault connects farmers with verified warehouses and gives owners a practical way to manage space and bookings.
          </p>
          <div className="actions">
            <Link className="button" to="/auth?role=farmer">
              I&apos;m a Farmer
            </Link>
            <Link className="button-secondary" to="/auth?role=owner">
              I Own a Space
            </Link>
          </div>
        </div>

        <div className="card">
          <p className="eyebrow">Auth</p>
          <h2>Access the platform</h2>
          <p>Use a farmer or owner account to access the correct dashboard. The other dashboard is blocked by role.</p>
          <div className="actions">
            <Link className="button" to="/auth">
              Login / Register
            </Link>
          </div>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Features</p>
        <div style={{ display: "grid", gap: "20px" }}>
          {features.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <h4>{feature.title}</h4>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">About Us</p>
        <h2>Built for practical storage coordination</h2>
        <p>
          Farmers need clear pricing and available space. Owners need simple listing and booking management. AgriVault keeps those flows separate and role-based.
        </p>
      </section>

      <footer className="card">
        <p className="eyebrow">Footer</p>
        <p>AgriVault</p>
        <p>Verified storage discovery, booking workflows, AI grading, and digital receipts.</p>
      </footer>
    </main>
  );
}