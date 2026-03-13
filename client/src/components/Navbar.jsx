import { signOut } from "firebase/auth";
import { NavLink, useNavigate } from "react-router-dom";
import { auth } from "../firebase";

const linkClass = ({ isActive }) =>
  isActive ? "tab-link active" : "tab-link";

export default function Navbar({ user, role }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("userRole");
    navigate("/");
  };

  return (
    <header className="navbar">
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

      <nav className="navbar-nav">
        <NavLink className={linkClass} to="/">
          Home
        </NavLink>
        {!user ? (
          <NavLink className={linkClass} to="/auth">
            Login / Register
          </NavLink>
        ) : null}
        {user && role === "farmer" ? (
          <NavLink className={linkClass} to="/farmer">
            Farmer Dashboard
          </NavLink>
        ) : null}
        {user && role === "owner" ? (
          <NavLink className={linkClass} to="/owner">
            Owner Dashboard
          </NavLink>
        ) : null}
      </nav>

      <div className="navbar-right">
        {user ? (
          <div className="user-pill">
            <span className="user-pill-dot" />
            <span>{user.displayName || user.email?.split("@")[0]}</span>
            <button
              onClick={handleLogout}
              className="text-button"
              style={{ marginLeft: "8px", padding: 0, fontSize: "0.8rem", fontWeight: 700 }}
              type="button"
            >
              Logout
            </button>
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