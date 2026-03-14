import express from "express";
import multer from "multer";
import { uploadBufferToCloudinary } from "../cloudinary.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Unsupported file type. Only PNG and JPEG images are allowed."), false);
  },
});

router.post("/image", verifyToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required." });
    }

    const folder = String(req.body.folder || "vaultx/bookings").trim() || "vaultx/bookings";
    const asset = await uploadBufferToCloudinary({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      folder,
      tags: ["vaultx", req.user.uid],
    });

    return res.status(201).json({ asset });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
