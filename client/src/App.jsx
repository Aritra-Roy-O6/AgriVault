import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Auth from "./pages/Auth";
import BookSlot from "./pages/BookSlot";
import FarmerDashboard from "./pages/FarmerDashboard";
import GradeUpload from "./pages/GradeUpload";
import Home from "./pages/Home";
import OwnerDashboard from "./pages/OwnerDashboard";
import Receipt from "./pages/Receipt";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/farmer" element={<FarmerDashboard />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/book" element={<BookSlot />} />
          <Route path="/grade/:bookingId" element={<GradeUpload />} />
          <Route path="/receipt/:bookingId" element={<Receipt />} />
        </Routes>
      </div>
    </div>
  );
}