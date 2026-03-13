import { Link } from "react-router-dom";

export default function ListYourSpace() {
  return (
    <main className="page fade-up">
      <section className="page two-column">
        <div className="card accent-card">
          <div className="hero-eyebrow">List Your Space</div>
          <h1 className="hero-title">
            Turn extra storage into income.
            <br />
            <span className="highlight">Rooms, sheds, garages, godowns, warehouse bays.</span>
          </h1>
          <p className="hero-sub">
            List any verified storage space on VaultX and manage bookings from one owner dashboard.
          </p>
          <div className="actions">
            <Link className="button" to="/auth?role=owner">
              Create Owner Account
            </Link>
            <Link className="button-secondary" to="/dashboard/owner">
              Open Owner Dashboard
            </Link>
          </div>
        </div>

        <div className="card">
          <p className="eyebrow">What You Can List</p>
          <ul className="simple-list">
            <li>Spare room or covered shed</li>
            <li>Garage or shop basement</li>
            <li>Godown or warehouse bay</li>
            <li>Specialized storage for dry, cool, or secure goods</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
