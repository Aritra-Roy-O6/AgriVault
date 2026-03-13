import express from "express";
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

    const booking = bookingDoc.data();
    if (booking.farmerId !== req.user.uid && booking.ownerId !== req.user.uid) {
      return res.status(403).json({ message: "Not allowed to access this receipt." });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=agrivault-receipt-${req.params.bookingId}.pdf`
    );

    doc.pipe(res);
    doc.fontSize(22).text("Agri-Vault Receipt", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Booking ID: ${req.params.bookingId}`);
    doc.text(`Farmer: ${booking.farmerName}`);
    doc.text(`Warehouse: ${booking.warehouseName}`);
    doc.text(`Produce: ${booking.produce}`);
    doc.text(`Weight: ${booking.weight} quintals`);
    doc.text(`Sq Ft Reserved: ${booking.sqft}`);
    doc.text(`Duration: ${booking.duration} weeks`);
    doc.text(`Phone: ${booking.phone}`);
    doc.text(`Total Price: Rs ${booking.totalPrice}`);
    doc.text(`Status: ${booking.status}`);
    if (booking.gradeResult?.grade) {
      doc.moveDown();
      doc.text(`AI Grade: ${booking.gradeResult.grade}`);
      doc.text(`Confidence: ${booking.gradeResult.confidence || "N/A"}`);
      doc.text(`Notes: ${booking.gradeResult.notes || "N/A"}`);
    }
    doc.moveDown();
    doc.text("Thank you for using Agri-Vault.");
    doc.end();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;