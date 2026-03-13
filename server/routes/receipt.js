import express from "express";
import { createHash } from "crypto";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

export function isReceiptApproved(status) {
  return ["confirmed", "completed"].includes(status);
}

function createReceiptId() {
  return `AV-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
}

function createReceiptHash(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function loadReceiptContext(bookingId, uid) {
  const bookingDoc = await db.collection("bookings").doc(bookingId).get();

  if (!bookingDoc.exists) {
    return { error: { status: 404, message: "Booking not found." } };
  }

  const booking = { id: bookingDoc.id, ...bookingDoc.data() };
  if (booking.farmerId !== uid && booking.ownerId !== uid) {
    return { error: { status: 403, message: "Not allowed to access this receipt." } };
  }

  if (!isReceiptApproved(booking.status)) {
    return {
      error: {
        status: 400,
        message: "Receipt is available only after the booking is approved.",
      },
    };
  }

  const [farmerDoc, warehouseDoc] = await Promise.all([
    booking.farmerId ? db.collection("users").doc(booking.farmerId).get() : null,
    booking.warehouseId ? db.collection("warehouses").doc(booking.warehouseId).get() : null,
  ]);

  return {
    booking,
    farmer: farmerDoc?.exists ? farmerDoc.data() : {},
    warehouse: warehouseDoc?.exists ? warehouseDoc.data() : {},
  };
}

export async function ensureReceiptRecord(context) {
  const existingReceiptId = context.booking.receiptId;
  if (existingReceiptId) {
    const receiptDoc = await db.collection("receipts").doc(existingReceiptId).get();
    if (receiptDoc.exists) {
      return receiptDoc.data();
    }
  }

  const receiptId = existingReceiptId || createReceiptId();
  const issuedAt = new Date().toISOString();
  const gradeResult = context.booking.gradeResult || {};
  const receiptPayload = {
    receiptId,
    farmerId: context.booking.farmerId,
    farmerName: context.farmer.name || context.booking.farmerName || "N/A",
    produce: context.booking.produce || "N/A",
    weight: Number(context.booking.weight || 0),
    grade: gradeResult.grade || "Pending",
    score: Number(gradeResult.score || 0),
    standard: gradeResult.standard || "BIS IS 4333",
    warehouseId: context.booking.warehouseId,
    warehouseName: context.warehouse.name || context.booking.warehouseName || "N/A",
    issuedAt,
  };

  const receiptHash = createReceiptHash(receiptPayload);
  const record = {
    ...receiptPayload,
    bookingId: context.booking.id,
    phone: context.farmer.phone || context.booking.phone || "N/A",
    defects: gradeResult.defects || "Pending analysis",
    moisture: gradeResult.moisture || "Within limits",
    warehouseAddress: context.warehouse.address || "N/A",
    duration: Number(context.booking.duration || 0),
    totalCost: Number(context.booking.totalPrice || 0),
    loanEligibility: Number(context.booking.loanEligibility || 0),
    receiptHash,
    status: "issued",
  };

  await db.collection("receipts").doc(receiptId).set(record, { merge: true });
  await db.collection("bookings").doc(context.booking.id).set({ receiptId }, { merge: true });

  return record;
}

export async function sendReceiptPdf({ res, bookingId, receipt, verifyBaseUrl }) {
  const verifyUrl = `${verifyBaseUrl.replace(/\/$/, "")}/verify/${receipt.receiptId}`;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 180 });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=agrivault-receipt-${bookingId}.pdf`
  );

  doc.pipe(res);
  doc.fontSize(20).text("AGRI-VAULT", { align: "center" });
  doc.fontSize(14).text("Quality Assurance Certificate", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).text("---------------------------------------------");
  doc.moveDown(0.5);
  doc.text(`Farmer Name: ${receipt.farmerName}`);
  doc.text(`Phone: ${receipt.phone}`);
  doc.text(`Produce Type: ${receipt.produce}`);
  doc.text(`Quantity: ${receipt.weight} quintals`);
  doc.text(`Grade: ${receipt.grade}`);
  doc.text(`Quality Score: ${receipt.score}/100`);
  doc.text(`Defects: ${receipt.defects}`);
  doc.text(`BIS Standard: ${receipt.standard}`);
  doc.text(`Warehouse: ${receipt.warehouseName}`);
  doc.text(`Address: ${receipt.warehouseAddress}`);
  doc.text(`Storage Period: ${receipt.duration} weeks`);
  doc.text(`Total Cost: Rs ${receipt.totalCost}`);
  doc.text(`Loan Eligibility: Rs ${receipt.loanEligibility}`);
  doc.text(`Issue Date: ${new Date(receipt.issuedAt).toLocaleDateString()}`);
  doc.text(`Receipt ID: ${receipt.receiptId}`);
  doc.text("Verified: Tamper-proof");
  doc.moveDown();
  doc.image(qrBuffer, { fit: [140, 140], align: "center" });
  doc.moveDown();
  doc.fontSize(10).text(`Verify online: ${verifyUrl}`, { align: "center" });
  doc.fontSize(9).text(`Hash: ${receipt.receiptHash}`, { align: "center" });
  doc.end();
}

router.get("/verify/:receiptId", async (req, res) => {
  try {
    const receiptDoc = await db.collection("receipts").doc(req.params.receiptId).get();
    if (!receiptDoc.exists) {
      return res.status(404).json({ message: "Receipt not found." });
    }

    const receipt = receiptDoc.data();
    const computedHash = createReceiptHash({
      receiptId: receipt.receiptId,
      farmerId: receipt.farmerId,
      farmerName: receipt.farmerName,
      produce: receipt.produce,
      weight: Number(receipt.weight || 0),
      grade: receipt.grade,
      score: Number(receipt.score || 0),
      standard: receipt.standard,
      warehouseId: receipt.warehouseId,
      warehouseName: receipt.warehouseName,
      issuedAt: receipt.issuedAt,
    });

    return res.json({
      verified: computedHash === receipt.receiptHash,
      receipt: {
        receiptId: receipt.receiptId,
        farmerName: receipt.farmerName,
        produce: receipt.produce,
        grade: receipt.grade,
        issuedAt: receipt.issuedAt,
        receiptHash: receipt.receiptHash,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:bookingId/metadata", verifyToken, async (req, res) => {
  try {
    const context = await loadReceiptContext(req.params.bookingId, req.user.uid);
    if (context.error) {
      return res.status(context.error.status).json({ message: context.error.message });
    }

    const receipt = await ensureReceiptRecord(context);
    const verifyBaseUrl = process.env.PUBLIC_VERIFY_BASE_URL || "http://localhost:5173";

    return res.json({
      receiptId: receipt.receiptId,
      receiptHash: receipt.receiptHash,
      verifyUrl: `${verifyBaseUrl.replace(/\/$/, "")}/verify/${receipt.receiptId}`,
      receipt,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:bookingId", verifyToken, async (req, res) => {
  try {
    const context = await loadReceiptContext(req.params.bookingId, req.user.uid);
    if (context.error) {
      return res.status(context.error.status).json({ message: context.error.message });
    }

    const receipt = await ensureReceiptRecord(context);
    const verifyBaseUrl = process.env.PUBLIC_VERIFY_BASE_URL || "http://localhost:5173";
    await sendReceiptPdf({
      res,
      bookingId: req.params.bookingId,
      receipt,
      verifyBaseUrl,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
