import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.routes";
import requestRoutes from "./routes/request.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";
import { RequestService } from "./services/request.service";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve("./uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", deadline: process.env.DEADLINE_DATE });
});

// Expire overdue requests every hour
setInterval(async () => {
  try {
    const result = await RequestService.expireOverdueRequests();
    if (result.count > 0) {
      console.log(`Expired ${result.count} overdue requests`);
    }
  } catch (err) {
    console.error("Error expiring requests:", err);
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
