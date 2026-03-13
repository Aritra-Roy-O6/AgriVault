import express from "express";
import multer from "multer";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function getWarehouseRefs(warehouse) {
  const totalSqft = Number(warehouse.sqft || warehouse.totalSqft || 0);
  const availableSqft = Number(
    warehouse.availableSqft ?? warehouse.sqft ?? warehouse.totalSqft ?? 0
  );

  return { totalSqft, availableSqft };
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
    const warehouseRef = db.collection("warehouses").doc(req.body.warehouseId);
    const requestedSqft = Number(req.body.sqft);

    if (!requestedSqft || requestedSqft <= 0) {
      return res.status(400).json({ message: "Requested square footage must be greater than zero." });
    }

    const booking = await db.runTransaction(async (transaction) => {
      const warehouseDoc = await transaction.get(warehouseRef);

      if (!warehouseDoc.exists) {
        throw new Error("Warehouse not found.");
      }

      const warehouse = warehouseDoc.data();
      const { availableSqft } = getWarehouseRefs(warehouse);

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
        weight: Number(req.body.weight),
        sqft: requestedSqft,
        duration: Number(req.body.duration),
        totalPrice: Number(req.body.totalPrice),
        pricePerSqft: Number(warehouse.pricePerSqft),
        loanEligibility: Number(req.body.loanEligibility || 0),
        estimatedProduceValue: Number(req.body.estimatedProduceValue || 0),
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

      return {
        id: bookingRef.id,
        ...payload,
      };
    });

    return res.status(201).json({ booking });
  } catch (error) {
    const statusCode = error.message === "Warehouse not found." ? 404 : 400;
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

    const mlApiUrl = process.env.ML_API_URL;
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("file", blob, req.file.originalname);

    const mlResponse = await fetch(mlApiUrl, {
      method: "POST",
      body: formData,
    });

    if (!mlResponse.ok) {
      const failureText = await mlResponse.text();
      return res.status(502).json({
        message: `ML API failed: ${failureText || mlResponse.statusText}`,
      });
    }

    const mlData = await mlResponse.json();
    const gradeResult = {
      grade: mlData.grade || mlData.prediction || "Unknown",
      confidence: mlData.confidence || null,
      notes: mlData.notes || mlData.summary || "",
      gradedAt: new Date().toISOString(),
    };

    await bookingRef.set({ gradeResult }, { merge: true });

    return res.json({ gradeResult });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;