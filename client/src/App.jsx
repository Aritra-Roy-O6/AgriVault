import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import useSession from "./hooks/useSession";
import Auth from "./pages/Auth";
import BookSlot from "./pages/BookSlot";
import FarmerDashboard from "./pages/FarmerDashboard";
import GradeUpload from "./pages/GradeUpload";
import Home from "./pages/Home";
import OwnerDashboard from "./pages/OwnerDashboard";
import Receipt from "./pages/Receipt";

export default function App() {
  const session = useSession();

  return (
    <div className="app-shell">
      <Navbar {...session} />
      <div className="page-body">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth {...session} />} />
          <Route
            path="/farmer"
            element={
              <ProtectedRoute {...session} requiredRole="farmer">
                <FarmerDashboard {...session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner"
            element={
              <ProtectedRoute {...session} requiredRole="owner">
                <OwnerDashboard {...session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book"
            element={
              <ProtectedRoute {...session} requiredRole="farmer">
                <BookSlot {...session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grade/:bookingId"
            element={
              <ProtectedRoute {...session}>
                <GradeUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipt/:bookingId"
            element={
              <ProtectedRoute {...session}>
                <Receipt />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </div>
    </div>
  );
}