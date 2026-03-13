import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/bookings.js";
import receiptRoutes from "./routes/receipt.js";
import warehouseRoutes from "./routes/warehouses.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "agrivault-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/receipt", receiptRoutes);

app.listen(port, () => {
  console.log(`Agri-Vault server running on port ${port}`);
});