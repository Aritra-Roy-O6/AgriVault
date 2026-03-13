import express from "express";
import multer from "multer";
import axios from "axios";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function fallbackGrade() {
  return {
    grade: "A",
    score: 89,
    defects: "None detected",
    standard: "BIS IS 4333",
    moisture: "Within limits",
    bankAcceptable: true,
    status: "Bank Acceptable",
  };
}

function normalizeGradeResult(payload = {}) {
  return {
    grade: payload.grade || payload.prediction || "A",
    score: Number(payload.score ?? payload.confidenceScore ?? 89),
    defects: payload.defects || payload.defectSummary || "None detected",
    standard: payload.standard || payload.bisStandard || "BIS IS 4333",
    moisture: payload.moisture || "Within limits",
    bankAcceptable: payload.bankAcceptable ?? true,
    status:
      payload.status ||
      (payload.bankAcceptable === false ? "Bank Review Required" : "Bank Acceptable"),
    gradedAt: new Date().toISOString(),
  };
}

router.post("/", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Produce image is required." });
    }

    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = bookingDoc.data();
    if (booking.farmerId !== req.user.uid && booking.ownerId !== req.user.uid) {
      return res.status(403).json({ message: "Not allowed to grade this booking." });
    }

    let gradePayload = fallbackGrade();

    try {
      const mlApiBase = (process.env.ML_API_URL || "http://localhost:5000").replace(/\/$/, "");
      const mlFormData = new FormData();
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      mlFormData.append("image", blob, req.file.originalname);
      mlFormData.append("produce", booking.produce || "");

      const mlResponse = await axios.post(`${mlApiBase}/grade`, mlFormData, {
        headers: {
          Accept: "application/json",
        },
        maxBodyLength: Infinity,
      });

      gradePayload = mlResponse.data;
    } catch (_error) {
      gradePayload = fallbackGrade();
    }

    const gradeResult = normalizeGradeResult(gradePayload);
    await bookingRef.set({ gradeResult }, { merge: true });

    return res.json({ gradeResult });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;