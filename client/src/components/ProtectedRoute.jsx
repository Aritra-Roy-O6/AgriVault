import { Navigate } from "react-router-dom";

function roleHome(role) {
  if (role === "owner") return "/dashboard/owner";
  if (role === "business") return "/dashboard/business";
  return "/dashboard/farmer";
}

export default function ProtectedRoute({ children, loading, role, requiredRole, user }) {
  if (loading) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">Loading</p>
          <h2>Checking session</h2>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate replace to="/auth?role=business" />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (role && !allowedRoles.includes(role)) {
      return <Navigate replace to={roleHome(role)} />;
    }
  }

  return children;
}
