import { Link } from "react-router-dom";

const roleCards = [
  {
    title: "For Businesses",
    text: "Book nearby storage for inventory, overflow stock, and short-term space needs.",
    link: "/auth?role=business",
    tone: "role-panel-business",
  },
  {
    title: "For Farmers",
    text: "Use FarmVault for produce storage, optional grading, and receipt-linked records.",
    link: "/auth?role=farmer",
    tone: "role-panel-farmer",
  },
  {
    title: "For Space Owners",
    text: "List a room, garage, godown, or warehouse bay and manage all incoming bookings.",
    link: "/auth?role=owner",
    tone: "role-panel-owner",
  },
];

export default function Home() {
  return (
    <main className="page fade-up home-minimal">
      <section className="card home-hero-compact">
        <p className="eyebrow">Storage Marketplace</p>
        <h1 className="hero-title">Find, book, and manage storage without the usual friction.</h1>
        <p className="hero-sub home-copy-compact">
          VaultX connects businesses, farmers, and space owners through one shared platform. Start with your role and the right dashboard opens after sign-in.
        </p>
        <div className="actions">
          <Link className="button" to="/auth?role=business">
            Login / Sign Up
          </Link>
        </div>
      </section>

      <section className="role-panel-grid">
        {roleCards.map((card) => (
          <article className={`card role-panel ${card.tone}`} key={card.title}>
            <p className="eyebrow">{card.title}</p>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <Link className="button-secondary" to={card.link}>
              Continue
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
