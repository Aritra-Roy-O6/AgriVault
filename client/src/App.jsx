import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import useSession from "./hooks/useSession";
import Auth from "./pages/Auth";
import BookSlot from "./pages/BookSlot";
import BusinessDashboard from "./pages/BusinessDashboard";
import FarmerDashboard from "./pages/FarmerDashboard";
import FarmVault from "./pages/FarmVault";
import GradeUpload from "./pages/GradeUpload";
import Home from "./pages/Home";
import ListYourSpace from "./pages/ListYourSpace";
import OwnerDashboard from "./pages/OwnerDashboard";
import Receipt from "./pages/Receipt";
import Search from "./pages/Search";
import VerifyReceipt from "./pages/VerifyReceipt";

export default function App() {
  const session = useSession();

  return (
    <div className="app-shell">
      <Navbar {...session} />
      <div className="page-body">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/auth" element={<Auth {...session} />} />
          <Route path="/farmvault" element={<FarmVault />} />
          <Route path="/list-your-space" element={<ListYourSpace />} />
          <Route path="/verify/:receiptId" element={<VerifyReceipt />} />
          <Route path="/farmer" element={<Navigate replace to="/dashboard/farmer" />} />
          <Route path="/owner" element={<Navigate replace to="/dashboard/owner" />} />
          <Route
            path="/dashboard/farmer"
            element={
              <ProtectedRoute {...session} requiredRole="farmer">
                <FarmerDashboard {...session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/business"
            element={
              <ProtectedRoute {...session} requiredRole="business">
                <BusinessDashboard {...session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/owner"
            element={
              <ProtectedRoute {...session} requiredRole="owner">
                <OwnerDashboard {...session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book"
            element={
              <ProtectedRoute {...session} requiredRole={["farmer", "business"]}>
                <BookSlot {...session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grade/:bookingId"
            element={
              <ProtectedRoute {...session} requiredRole="farmer">
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
