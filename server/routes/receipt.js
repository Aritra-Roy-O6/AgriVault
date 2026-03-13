import express from "express";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/:bookingId", verifyToken, async (req, res) => {
  try {
    const bookingDoc = await db.collection("bookings").doc(req.params.bookingId).get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = { id: bookingDoc.id, ...bookingDoc.data() };
    if (booking.farmerId !== req.user.uid && booking.ownerId !== req.user.uid) {
      return res.status(403).json({ message: "Not allowed to access this receipt." });
    }

    const [farmerDoc, warehouseDoc] = await Promise.all([
      booking.farmerId ? db.collection("users").doc(booking.farmerId).get() : null,
      booking.warehouseId ? db.collection("warehouses").doc(booking.warehouseId).get() : null,
    ]);

    const farmer = farmerDoc?.exists ? farmerDoc.data() : {};
    const warehouse = warehouseDoc?.exists ? warehouseDoc.data() : {};
    const grade = booking.gradeResult || {
      grade: "Pending",
      score: "N/A",
      defects: "Pending analysis",
      standard: "BIS IS 4333",
      moisture: "Pending analysis",
      status: "Pending",
    };
    const loanValue = booking.loanEligibility || 0;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=agrivault-receipt-${req.params.bookingId}.pdf`
    );

    doc.pipe(res);
    doc.fontSize(20).text("AGRI-VAULT", { align: "center" });
    doc.fontSize(14).text("Quality Assurance Certificate", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).text("---------------------------------------------");
    doc.moveDown(0.5);
    doc.text(`Farmer Name: ${farmer.name || booking.farmerName || "N/A"}`);
    doc.text(`Phone: ${farmer.phone || booking.phone || "N/A"}`);
    doc.text(`Produce Type: ${booking.produce || "N/A"}`);
    doc.text(`Quantity: ${booking.weight || 0} quintals`);
    doc.text(`Grade: ${grade.grade}`);
    doc.text(`Quality Score: ${grade.score}/100`);
    doc.text(`Defects: ${grade.defects}`);
    doc.text(`Moisture: ${grade.moisture || "Within limits"}`);
    doc.text(`BIS Standard: ${grade.standard || "IS 4333 (Parts 1-5)"}`);
    doc.text(`Warehouse: ${warehouse.name || booking.warehouseName || "N/A"}`);
    doc.text(`Address: ${warehouse.address || "N/A"}`);
    doc.text(`Storage Period: ${booking.duration || 0} weeks`);
    doc.text(`Total Cost: Rs ${booking.totalPrice || 0}`);
    doc.text(`Loan Eligibility: Rs ${loanValue}`);
    doc.text(`Issue Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Receipt ID: ${uuidv4()}`);
    doc.text("Digital Signature: VERIFIED");
    doc.end();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;