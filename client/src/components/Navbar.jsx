import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { auth } from "../firebase";

const linkClass = ({ isActive }) =>
  isActive ? "tab-link active" : "tab-link";

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <header className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <div className="navbar-brand-icon">
          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className="navbar-brand-text">
          Agri<span>Vault</span>
        </span>
      </div>

      {/* Nav Links */}
      <nav className="navbar-nav">
        <NavLink className={linkClass} to="/">Home</NavLink>
        <NavLink className={linkClass} to="/farmer">Farmer</NavLink>
        <NavLink className={linkClass} to="/owner">Owner</NavLink>
        <NavLink className={linkClass} to="/auth">Account</NavLink>
      </nav>

      {/* Right */}
      <div className="navbar-right">
        {user ? (
          <div className="user-pill">
            <span className="user-pill-dot" />
            <span>{user.email?.split("@")[0]}</span>
          </div>
        ) : (
          <div className="user-pill">
            <span>Not signed in</span>
          </div>
        )}
      </div>
    </header>
  );
}