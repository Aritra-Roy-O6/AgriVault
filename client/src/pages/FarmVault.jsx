import { Link } from "react-router-dom";

export default function FarmVault() {
  return (
    <main className="page fade-up">
      <section className="page two-column">
        <div className="card accent-card">
          <div className="hero-eyebrow">FarmVault</div>
          <h1 className="hero-title">
            Grain storage and quality support.
            <br />
            <span className="highlight">Inside the broader VaultX platform.</span>
          </h1>
          <p className="hero-sub">
            Farmers keep the AgriVault workflow: storage discovery, bookings, optional AI grading, receipt generation, and loan-linked quality proof.
          </p>
          <div className="actions">
            <Link className="button" to="/auth?role=farmer">
              Farmer Sign In
            </Link>
            <Link className="button-secondary" to="/dashboard/farmer">
              Open FarmVault Dashboard
            </Link>
          </div>
        </div>

        <div className="card">
          <p className="eyebrow">FarmVault Stack</p>
          <ul className="simple-list">
            <li>Distance-based grain storage discovery</li>
            <li>Booking and receipt management</li>
            <li>Optional AI grading when the ML service is available</li>
            <li>Loan eligibility linked to the quality receipt</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
