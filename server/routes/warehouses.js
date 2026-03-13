import express from "express";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const snapshot = await db.collection("warehouses").where("verified", "==", true).get();
    const warehouses = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((warehouse) => warehouse.isActive !== false);

    return res.json({ warehouses });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/owner/:uid", verifyToken, async (req, res) => {
  try {
    if (req.user.uid !== req.params.uid) {
      return res.status(403).json({ message: "Not allowed to view these listings." });
    }

    const snapshot = await db.collection("warehouses").where("ownerUid", "==", req.params.uid).get();
    const warehouses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ warehouses });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("warehouses").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Warehouse not found." });
    }

    return res.json({
      warehouse: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      address: req.body.address,
      pincode: req.body.pincode,
      lat: Number(req.body.lat),
      lng: Number(req.body.lng),
      sqft: Number(req.body.sqft),
      availableSqft: Number(req.body.availableSqft ?? req.body.sqft),
      pricePerSqft: Number(req.body.pricePerSqft),
      produces: Array.isArray(req.body.produces) ? req.body.produces : [],
      ownerUid: req.user.uid,
      verified: true,
      isActive: true,
      rating: Number(req.body.rating ?? 4.6),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("warehouses").add(payload);

    return res.status(201).json({
      warehouse: {
        id: docRef.id,
        ...payload,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const warehouseRef = db.collection("warehouses").doc(req.params.id);
    const warehouseDoc = await warehouseRef.get();

    if (!warehouseDoc.exists) {
      return res.status(404).json({ message: "Warehouse not found." });
    }

    if (warehouseDoc.data().ownerUid !== req.user.uid) {
      return res.status(403).json({ message: "Not allowed to update this listing." });
    }

    const isActive = Boolean(req.body.isActive);
    await warehouseRef.set({ isActive, updatedAt: new Date().toISOString() }, { merge: true });

    return res.json({
      warehouse: {
        id: warehouseDoc.id,
        ...warehouseDoc.data(),
        isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;