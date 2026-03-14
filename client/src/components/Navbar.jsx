import { signOut } from "firebase/auth";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";

const linkClass = ({ isActive }) =>
  isActive ? "tab-link active" : "tab-link";

function dashboardPath(role) {
  if (role === "owner") return "/dashboard/owner";
  if (role === "business") return "/dashboard/business";
  return "/dashboard/farmer";
}

export default function Navbar({ user, role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isPublicPage = isHome || location.pathname === "/auth";

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("userRole");
    navigate("/");
  };

  return (
    <header className="navbar navbar-minimal">
      <button className="navbar-brand navbar-brand-button" onClick={() => navigate("/")} type="button">
        <div className="navbar-brand-icon">
          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10.5 12 3l8 7.5v8A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5z" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </div>
        <span className="navbar-brand-text">
          Vault<span>X</span>
        </span>
      </button>

      <nav className="navbar-nav navbar-nav-minimal">
        {!user && isPublicPage ? (
          <NavLink className={linkClass} to="/">
            Home
          </NavLink>
        ) : null}
        {!user ? (
          <NavLink className={linkClass} to="/auth?role=business">
            Login
          </NavLink>
        ) : (
          <>
            {!isHome ? (
              <NavLink className={linkClass} to={dashboardPath(role)}>
                Dashboard
              </NavLink>
            ) : null}
            <button className="tab-link" onClick={handleLogout} type="button">
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
