import { Navigate } from "react-router-dom";

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
    return <Navigate replace to="/auth" />;
  }

  if (requiredRole && role && role !== requiredRole) {
    return <Navigate replace to={role === "owner" ? "/owner" : "/farmer"} />;
  }

  return children;
}