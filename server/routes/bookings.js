import express from "express";
import multer from "multer";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";
import { computeRequiredSqft } from "../storageMath.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function getWarehouseRefs(warehouse) {
  const totalSqft = Number(warehouse.sqft || warehouse.totalSqft || 0);
  const availableSqft = Number(
    warehouse.availableSqft ?? warehouse.sqft ?? warehouse.totalSqft ?? 0
  );

  return { totalSqft, availableSqft };
}

function requiredString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

router.get("/farmer/:uid", verifyToken, async (req, res) => {
  try {
    if (req.user.uid !== req.params.uid) {
      return res.status(403).json({ message: "Not allowed to view these bookings." });
    }

    const snapshot = await db.collection("bookings").where("farmerId", "==", req.params.uid).get();
    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/owner/:uid", verifyToken, async (req, res) => {
  try {
    if (req.user.uid !== req.params.uid) {
      return res.status(403).json({ message: "Not allowed to view these bookings." });
    }

    const snapshot = await db.collection("bookings").where("ownerId", "==", req.params.uid).get();
    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection("bookings").get();
    const bookings = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((booking) => booking.farmerId === req.user.uid || booking.ownerId === req.user.uid);

    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("bookings").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = { id: doc.id, ...doc.data() };
    if (booking.farmerId !== req.user.uid && booking.ownerId !== req.user.uid) {
      return res.status(403).json({ message: "Not allowed to view this booking." });
    }

    return res.json({ booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const requiredFields = [
      [requiredString(req.body.warehouseId), "Warehouse is required."],
      [requiredString(req.body.farmerName), "Customer name is required."],
      [requiredString(req.body.phone), "Phone is required."],
      [requiredString(req.body.produce), "Storage category is required."],
      [requiredString(req.body.startDate), "Start date is required."],
    ];

    const firstMissing = requiredFields.find(([valid]) => !valid);
    if (firstMissing) {
      return res.status(400).json({ message: firstMissing[1] });
    }

    const weight = Number(req.body.weight || 0);
    const duration = Number(req.body.duration);
    const totalPriceInput = Number(req.body.totalPrice);
    const stackable = Boolean(req.body.stackable);

    if (!weight || weight <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than zero." });
    }

    if (!duration || duration <= 0) {
      return res.status(400).json({ message: "Duration must be greater than zero." });
    }

    const warehouseRef = db.collection("warehouses").doc(req.body.warehouseId);
    const gradingSessionId = requiredString(req.body.gradingSessionId) ? req.body.gradingSessionId : null;
    const gradingSessionRef = gradingSessionId ? db.collection("grading_sessions").doc(gradingSessionId) : null;

    const booking = await db.runTransaction(async (transaction) => {
      const docs = [transaction.get(warehouseRef)];
      if (gradingSessionRef) {
        docs.push(transaction.get(gradingSessionRef));
      }
      const [warehouseDoc, gradingSessionDoc] = await Promise.all(docs);

      if (!warehouseDoc.exists) {
        throw new Error("Warehouse not found.");
      }

      const warehouse = warehouseDoc.data();
      const gradingSession = gradingSessionDoc?.exists ? gradingSessionDoc.data() : null;

      if (gradingSessionId && !gradingSessionDoc?.exists) {
        throw new Error("Grading session not found.");
      }

      if (gradingSession) {
        if (gradingSession.farmerId !== req.user.uid) {
          throw new Error("This grading session does not belong to you.");
        }

        if (gradingSession.bookingId) {
          throw new Error("This grading session has already been used for a booking.");
        }
      }

      const spaceCalculation = computeRequiredSqft({
        category: req.body.produce,
        quantity: weight,
        stackable,
        warehouseHeightFt: Number(warehouse.heightFt || 10),
      });
      const requestedSqft = Number(spaceCalculation.requiredSqft);
      const { availableSqft } = getWarehouseRefs(warehouse);
      const totalPrice = Number.isFinite(totalPriceInput) && totalPriceInput > 0
        ? totalPriceInput
        : requestedSqft * Number(warehouse.pricePerSqft || 0) * duration;

      if (!totalPrice || totalPrice <= 0) {
        throw new Error("Total price must be greater than zero.");
      }

      if (availableSqft < requestedSqft) {
        throw new Error("Not enough space available in this godown.");
      }

      const payload = {
        farmerId: req.user.uid,
        ownerId: warehouse.ownerUid || "",
        warehouseId: req.body.warehouseId,
        warehouseName: warehouse.name,
        farmerName: req.body.farmerName,
        phone: req.body.phone,
        produce: req.body.produce,
        weight,
        sqft: requestedSqft,
        duration,
        startDate: req.body.startDate,
        totalPrice,
        pricePerSqft: Number(warehouse.pricePerSqft),
        stackable,
        warehouseHeightFt: Number(warehouse.heightFt || 10),
        stackHeightFt: spaceCalculation.stackHeightFt,
        usableHeightFt: spaceCalculation.usableHeightFt,
        cubicFtPerUnit: spaceCalculation.cubicFtPerUnit,
        handlingFactor: spaceCalculation.handlingFactor,
        loanEligibility: Number(req.body.loanEligibility || 0),
        estimatedProduceValue: Number(req.body.estimatedProduceValue || 0),
        gradingSessionId,
        bookingImage: req.body.bookingImage || null,
        gradeResult: gradingSession
          ? {
              ...gradingSession.normalizedGradeResult,
              annotatedImageB64: null,
            }
          : null,
        status: "pending",
        spaceReserved: true,
        createdAt: new Date().toISOString(),
      };

      const bookingRef = db.collection("bookings").doc();
      transaction.set(bookingRef, payload);
      transaction.set(
        warehouseRef,
        {
          availableSqft: availableSqft - requestedSqft,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (gradingSessionRef && gradingSession) {
        transaction.set(
          gradingSessionRef,
          {
            bookingId: bookingRef.id,
            warehouseId: req.body.warehouseId,
            ownerId: warehouse.ownerUid || "",
            status: "attached",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return {
        id: bookingRef.id,
        ...payload,
      };
    });

    return res.status(201).json({ booking });
  } catch (error) {
    let statusCode = 400;
    if (error.message === "Warehouse not found." || error.message === "Grading session not found.") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ message: error.message });
  }
});

router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const nextStatus = req.body.status;
    if (!["confirmed", "rejected", "completed", "pending"].includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid booking status." });
    }

    const bookingRef = db.collection("bookings").doc(req.params.id);
    const updatedBooking = await db.runTransaction(async (transaction) => {
      const bookingDoc = await transaction.get(bookingRef);

      if (!bookingDoc.exists) {
        throw new Error("Booking not found.");
      }

      const booking = bookingDoc.data();
      if (booking.ownerId !== req.user.uid) {
        throw new Error("Not allowed to update this booking.");
      }

      const warehouseRef = db.collection("warehouses").doc(booking.warehouseId);
      const warehouseDoc = await transaction.get(warehouseRef);
      if (!warehouseDoc.exists) {
        throw new Error("Warehouse not found.");
      }

      const warehouse = warehouseDoc.data();
      const { totalSqft, availableSqft } = getWarehouseRefs(warehouse);
      const reservedSqft = Number(booking.sqft || 0);
      const currentlyReserved = booking.spaceReserved !== false;
      let nextReserved = currentlyReserved;
      let nextAvailableSqft = availableSqft;

      if (nextStatus === "rejected" && currentlyReserved) {
        nextAvailableSqft = Math.min(totalSqft, availableSqft + reservedSqft);
        nextReserved = false;
      }

      if (["pending", "confirmed", "completed"].includes(nextStatus) && !currentlyReserved) {
        if (availableSqft < reservedSqft) {
          throw new Error("Not enough space available to re-activate this booking.");
        }
        nextAvailableSqft = availableSqft - reservedSqft;
        nextReserved = true;
      }

      transaction.set(
        bookingRef,
        {
          status: nextStatus,
          spaceReserved: nextReserved,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (nextAvailableSqft !== availableSqft) {
        transaction.set(
          warehouseRef,
          {
            availableSqft: nextAvailableSqft,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return {
        id: bookingDoc.id,
        ...booking,
        status: nextStatus,
        spaceReserved: nextReserved,
      };
    });

    return res.json({ booking: updatedBooking });
  } catch (error) {
    let statusCode = 400;
    if (error.message === "Booking not found." || error.message === "Warehouse not found.") {
      statusCode = 404;
    }
    if (error.message === "Not allowed to update this booking.") {
      statusCode = 403;
    }
    return res.status(statusCode).json({ message: error.message });
  }
});

router.post("/:id/grade", verifyToken, upload.single("produceImage"), async (req, res) => {
  try {
    const bookingRef = db.collection("bookings").doc(req.params.id);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = bookingDoc.data();
    if (booking.farmerId !== req.user.uid && booking.ownerId !== req.user.uid) {
      return res.status(403).json({ message: "Not allowed to grade this booking." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Produce image is required." });
    }

    return res.status(501).json({ message: "Use /api/grading for FarmVault grading." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

