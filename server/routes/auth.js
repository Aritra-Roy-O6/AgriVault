import express from "express";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/register", verifyToken, async (req, res) => {
  try {
    const payload = {
      uid: req.user.uid,
      email: req.user.email,
      name: req.body.name || "",
      role: req.body.role || "farmer",
      phone: req.body.phone || "",
      pincode: req.body.pincode || "",
      createdAt: new Date().toISOString(),
    };

    await db.collection("users").doc(req.user.uid).set(payload, { merge: true });

    return res.status(201).json({ user: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("users").doc(req.user.uid).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User profile not found." });
    }

    return res.json({
      user: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;