import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { v4 as uuidv4 } from "uuid";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";
import {
  ensureReceiptRecord,
  isReceiptApproved,
  loadReceiptContext,
  sendReceiptPdf,
} from "./receipt.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Unsupported file type. Only PNG and JPEG images are allowed."), false);
  },
});

const DEFAULT_ML_SERVICE_URL = "http://localhost:5001";
const ML_TIMEOUT_MS = 30_000;
const FALLBACK_PRICES = {
  wheat: 2800,
  rice: 3200,
  maize: 2400,
  sorghum: 2300,
  pulse: 5500,
  pulses: 5500,
  vegetables: 1800,
  fruits: 4200,
  other: 2500,
};

function getMlServiceUrl() {
  return (process.env.ML_SERVICE_URL || process.env.ML_API_URL || DEFAULT_ML_SERVICE_URL).replace(/\/$/, "");
}

function summarizeMlError(error) {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.code === "ECONNREFUSED") {
    return `ML service is not running or not reachable at ${getMlServiceUrl()}. Start the Flask service in server/ml_service first.`;
  }

  if (error.code) {
    return `${error.code}: ${error.message}`;
  }

  return error.message || "Unknown ML service error.";
}

function fallbackMlResult(produceType = "wheat") {
  const normalizedProduce = String(produceType || "wheat").toLowerCase();
  return {
    produce_type: normalizedProduce,
    grade: "Grade A",
    confidence: 0.89,
    defect_percentage: 0,
    estimated_moisture_pct: 11.2,
    foreign_matter_pct: 0.3,
    color_uniformity_score: 91.2,
    size_uniformity_score: 88.5,
    overall_quality_score: 89,
    detected_defects: [],
    price_per_quintal: FALLBACK_PRICES[normalizedProduce] || FALLBACK_PRICES.other,
    standard_reference: "BIS IS 4333",
    annotated_image_b64: null,
    source: "fallback",
  };
}

function normalizeGradingResult(payload = {}) {
  const score = Number(payload.overall_quality_score ?? payload.score ?? 89);
  const detectedDefects = Array.isArray(payload.detected_defects)
    ? payload.detected_defects
    : payload.defects
      ? String(payload.defects)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const grade = payload.grade || payload.prediction || "Grade A";
  const standard = payload.standard_reference || payload.standard || "BIS IS 4333";
  const moistureValue = Number(payload.estimated_moisture_pct ?? payload.moisturePct ?? NaN);
  const moisture = Number.isFinite(moistureValue)
    ? `${moistureValue.toFixed(1)}%`
    : payload.moisture || "Within limits";
  const defectPercentage = Number(payload.defect_percentage ?? 0);
  const bankAcceptable = !String(grade).toLowerCase().includes("substandard");

  return {
    produceType: payload.produce_type || payload.produceType || "wheat",
    grade,
    score: Number.isFinite(score) ? Math.round(score) : 89,
    confidence: Number(payload.confidence ?? 0),
    defects: detectedDefects.length ? detectedDefects.join(", ") : "None detected",
    detectedDefects,
    standard,
    moisture,
    defectPercentage,
    foreignMatterPct: Number(payload.foreign_matter_pct ?? 0),
    colorUniformityScore: Number(payload.color_uniformity_score ?? 0),
    sizeUniformityScore: Number(payload.size_uniformity_score ?? 0),
    pricePerQuintal: Number(payload.price_per_quintal ?? 0),
    annotatedImageB64: payload.annotated_image_b64 || null,
    bankAcceptable,
    status: bankAcceptable ? "Bank Acceptable" : "Bank Review Required",
    gradedAt: new Date().toISOString(),
  };
}

function compactRawResult(payload = {}) {
  const annotated = payload.annotated_image_b64;
  const tooLarge = typeof annotated === "string" && annotated.length > 450_000;
  return {
    ...payload,
    annotated_image_b64: tooLarge ? null : annotated || null,
    annotated_image_truncated: tooLarge,
  };
}

async function callMlService(req, produceType) {
  const form = new FormData();
  form.append("image", req.file.buffer, {
    filename: req.file.originalname,
    contentType: req.file.mimetype,
  });
  form.append("produce_type", produceType || "wheat");
  form.append("include_annotated_image", req.body.include_annotated_image || "false");

  let rawResult = fallbackMlResult(produceType);
  let usedFallback = true;
  let mlIssue = null;

  try {
    const mlResponse = await axios.post(`${getMlServiceUrl()}/grade`, form, {
      headers: form.getHeaders(),
      timeout: ML_TIMEOUT_MS,
      maxBodyLength: Infinity,
    });
    rawResult = mlResponse.data;
    usedFallback = false;
  } catch (error) {
    mlIssue = summarizeMlError(error);
    console.error(`[ML] Falling back to template grade: ${mlIssue}`);
    rawResult = fallbackMlResult(produceType);
    usedFallback = true;
  }

  return { rawResult, usedFallback, mlIssue };
}

async function loadBookingForGrading(bookingId, uid, farmerUid) {
  const bookingRef = db.collection("bookings").doc(bookingId);
  const bookingSnap = await bookingRef.get();

  if (!bookingSnap.exists) {
    return { error: { status: 404, message: "Booking not found." } };
  }

  const booking = { id: bookingSnap.id, ...bookingSnap.data() };
  if (booking.farmerId !== uid && booking.ownerId !== uid) {
    return { error: { status: 403, message: "Not allowed to grade this booking." } };
  }

  if (farmerUid && booking.farmerId !== farmerUid) {
    return { error: { status: 403, message: "Booking does not belong to this farmer." } };
  }

  return { bookingRef, booking };
}

router.get("/health", async (_req, res) => {
  try {
    const response = await axios.get(`${getMlServiceUrl()}/health`, { timeout: 5000 });
    return res.json({ reachable: true, mlServiceUrl: getMlServiceUrl(), ...response.data });
  } catch (error) {
    return res.status(503).json({
      reachable: false,
      mlServiceUrl: getMlServiceUrl(),
      error: summarizeMlError(error),
    });
  }
});

router.post("/analyze", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const bookingId = req.body.booking_id || req.body.bookingId || null;
    const farmerUid = req.body.farmer_uid || req.body.farmerId || req.user.uid;
    const requestedProduceType = req.body.produce_type || req.body.produce || "wheat";

    if (!farmerUid) {
      return res.status(400).json({ error: "farmer_uid is required." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Produce image is required." });
    }

    let booking = null;
    if (bookingId) {
      const bookingLookup = await loadBookingForGrading(bookingId, req.user.uid, farmerUid);
      if (bookingLookup.error) {
        return res.status(bookingLookup.error.status).json({ error: bookingLookup.error.message });
      }
      booking = bookingLookup.booking;
    } else if (req.user.uid !== farmerUid) {
      return res.status(403).json({ error: "Not allowed to create a grading session for another farmer." });
    }

    const { rawResult, usedFallback, mlIssue } = await callMlService(req, requestedProduceType || booking?.produce);
    const normalizedResult = normalizeGradingResult(rawResult);
    const sessionId = uuidv4();
    const compactResult = compactRawResult(rawResult);
    const timestamp = new Date().toISOString();

    await db.collection("grading_sessions").doc(sessionId).set({
      sessionId,
      bookingId: bookingId || null,
      farmerId: farmerUid,
      ownerId: booking?.ownerId || "",
      warehouseId: booking?.warehouseId || "",
      produceType: normalizedResult.produceType,
      gradingResult: compactResult,
      normalizedGradeResult: {
        ...normalizedResult,
        annotatedImageB64: compactResult.annotated_image_b64,
      },
      imageFilename: req.file.originalname,
      imageSizeKb: Math.round(req.file.size / 1024),
      receiptIssued: false,
      source: usedFallback ? "fallback" : "ml_service",
      status: bookingId ? "attached" : "pending_booking",
      mlIssue,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (bookingId) {
      await db.collection("bookings").doc(bookingId).set(
        {
          gradingSessionId: sessionId,
          gradeResult: {
            ...normalizedResult,
            annotatedImageB64: null,
          },
          updatedAt: timestamp,
        },
        { merge: true }
      );
    }

    return res.status(200).json({
      session_id: sessionId,
      grade: normalizedResult.grade,
      overall_quality_score: normalizedResult.score,
      produce_type: normalizedResult.produceType,
      defect_percentage: normalizedResult.defectPercentage,
      estimated_moisture_pct: Number.parseFloat(normalizedResult.moisture) || 0,
      foreign_matter_pct: normalizedResult.foreignMatterPct,
      color_uniformity_score: normalizedResult.colorUniformityScore,
      size_uniformity_score: normalizedResult.sizeUniformityScore,
      detected_defects: normalizedResult.detectedDefects,
      price_per_quintal: normalizedResult.pricePerQuintal,
      standard_reference: normalizedResult.standard,
      annotated_image_b64: normalizedResult.annotatedImageB64,
      gradeResult: normalizedResult,
      fallback: usedFallback,
      mlIssue,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/result/:sessionId", verifyToken, async (req, res) => {
  try {
    const sessionSnap = await db.collection("grading_sessions").doc(req.params.sessionId).get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ error: "Grading session not found." });
    }

    const session = sessionSnap.data();
    if (session.farmerId !== req.user.uid && session.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Not allowed to view this grading session." });
    }

    return res.json({
      session_id: session.sessionId,
      booking_id: session.bookingId,
      receipt_issued: session.receiptIssued,
      gradeResult: session.normalizedGradeResult,
      grading_result: session.gradingResult,
      created_at: session.createdAt,
      source: session.source,
      mlIssue: session.mlIssue || null,
      status: session.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/receipt", verifyToken, async (req, res) => {
  try {
    const sessionId = req.body.session_id || req.body.sessionId;
    const farmerUid = req.body.farmer_uid || req.body.farmerId || req.user.uid;

    if (!sessionId || !farmerUid) {
      return res.status(400).json({ error: "session_id and farmer_uid required." });
    }

    const sessionSnap = await db.collection("grading_sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ error: "Grading session not found." });
    }

    const session = sessionSnap.data();
    if (session.farmerId !== req.user.uid && session.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Not allowed to access this grading session." });
    }

    if (session.farmerId !== farmerUid) {
      return res.status(403).json({ error: "Session does not belong to this farmer." });
    }

    const context = await loadReceiptContext(session.bookingId, req.user.uid);
    if (context.error) {
      return res.status(context.error.status).json({ error: context.error.message });
    }

    if (!isReceiptApproved(context.booking.status)) {
      return res.status(400).json({ error: "Receipt is available only after the booking is approved." });
    }

    const receipt = await ensureReceiptRecord(context);

    const verifyBaseUrl = process.env.PUBLIC_VERIFY_BASE_URL || "http://localhost:5173";
    await db.collection("grading_sessions").doc(sessionId).set(
      {
        receiptIssued: true,
        receiptIssuedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        receiptSource: "node_pdf",
      },
      { merge: true }
    );

    await sendReceiptPdf({
      res,
      bookingId: context.booking.id,
      receipt,
      verifyBaseUrl,
    });
    return undefined;
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;




