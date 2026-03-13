import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/bookings.js";
import gradeRoutes from "./routes/grade.js";
import gradingRoutes from "./routes/grading.js";
import receiptRoutes from "./routes/receipt.js";
import warehouseRoutes from "./routes/warehouses.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const gradingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Max 5 grading requests per minute." },
});

app.use(globalLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "agrivault-backend", version: "1.0.0" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "agrivault-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/grade", gradeRoutes);
app.use("/api/grading", gradingLimiter, gradingRoutes);
app.use("/api/receipt", receiptRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((err, _req, res, _next) => {
  console.error("[GlobalError]", err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

app.listen(port, () => {
  console.log(`Agri-Vault backend running on port ${port}`);
  console.log(`ML Service endpoint: ${process.env.ML_SERVICE_URL || process.env.ML_API_URL || "http://localhost:5001"}`);
});
